import { validateKybPack } from "./kyb.ts";
import type { CommandStore, Receipt, Scope } from "./commands.ts";
import type { Operation, RequestInput } from "./contracts.ts";
import type { InboxRecord, WebhookInbox } from "./webhooks.ts";
export interface SqlExecutor {
  query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[],
  ): Promise<{ rows: T[] }>;
}
/** Dedicated connection with schema access, never a customer-supplied SQL client. */
export class PostgresSandboxStore implements CommandStore, WebhookInbox {
  constructor(private sql: SqlExecutor, private programId: string) {}
  async authorize(
    scope: Scope,
    operation: Operation,
    input: RequestInput,
  ): Promise<void> {
    if (scope.programId !== this.programId) {
      throw new Error("Programme mismatch");
    }
    const { rows } = await this.sql.query(
      "select m.entity_id,m.kyb_status,m.issuance_enabled,m.verified_email_domains,p.enabled,p.authorization_model from reap_sandbox.merchants m join reap_sandbox.programmes p on p.id=m.program_id where m.program_id=$1 and m.tenant_id=$2",
      [scope.programId, scope.tenantId],
    );
    const m = rows[0];
    if (!m) throw new Error("Merchant scope not found");
    if (m.enabled !== true || m.authorization_model !== "standard") {
      throw new Error("Sandbox programme disabled or unsupported model");
    }
    if (
      ["createKyb", "amendKyb", "submitKyb"].includes(operation) &&
      m.kyb_status !== "PENDING_SUBMISSION"
    ) throw new Error("KYB case is not editable");
    if (operation === "createKyb") {
      validateKybPack(
        input.body,
        new Set(m.verified_email_domains as string[]),
      );
    }
    if (input.path?.entityId && input.path.entityId !== m.entity_id) {
      throw new Error("Entity scope mismatch");
    }
    if (input.path?.cardId) {
      const result = await this.sql.query(
        "select resource_id from reap_sandbox.resources where program_id=$1 and tenant_id=$2 and kind='card' and resource_id=$3",
        [scope.programId, scope.tenantId, input.path.cardId],
      );
      if (!result.rows.length) throw new Error("Card scope mismatch");
    }
    if (operation === "createCard") {
      const body = input.body as { kyc?: { entityId?: string } };
      if (
        body?.kyc?.entityId !== m.entity_id || m.kyb_status !== "APPROVED" ||
        m.issuance_enabled !== true
      ) throw new Error("Merchant not approved for issuing");
    }
  }
  async reserve(
    scope: Scope,
    key: string,
    operation: Operation,
    hash: string,
  ): Promise<{ fresh: true } | { fresh: false; receipt: Receipt }> {
    if (scope.programId !== this.programId) {
      throw new Error("Programme mismatch");
    }
    const inserted = await this.sql.query(
      "insert into reap_sandbox.commands(program_id,tenant_id,id,operation,request_hash) values($1,$2,$3,$4,$5) on conflict(program_id,id) do nothing returning id",
      [scope.programId, scope.tenantId, key, operation, hash],
    );
    if (inserted.rows.length) return { fresh: true };
    const { rows } = await this.sql.query(
      "select tenant_id,operation,request_hash,state,provider_id,error_code from reap_sandbox.commands where program_id=$1 and id=$2",
      [scope.programId, key],
    );
    const row = rows[0];
    if (
      !row || row.tenant_id !== scope.tenantId || row.request_hash !== hash ||
      row.operation !== operation
    ) throw new Error("Idempotency conflict");
    if (row.state === "IN_FLIGHT") {
      throw new Error("Operation in progress or requires reconciliation");
    }
    return {
      fresh: false,
      receipt: {
        state: row.state as Receipt["state"],
        ...(row.provider_id ? { providerId: String(row.provider_id) } : {}),
        ...(row.error_code ? { error: String(row.error_code) } : {}),
      },
    };
  }
  async finish(scope: Scope, key: string, receipt: Receipt): Promise<void> {
    if (scope.programId !== this.programId) {
      throw new Error("Programme mismatch");
    }
    const { rows } = await this.sql.query(
      `with completed as (update reap_sandbox.commands set state=$4,provider_id=$5,error_code=$6,finished_at=now() where program_id=$1 and tenant_id=$2 and id=$3 and state='IN_FLIGHT' returning *), bound as (insert into reap_sandbox.resources(program_id,tenant_id,kind,resource_id) select program_id,tenant_id,'card',provider_id from completed where operation='createCard' and state='SUCCEEDED' and provider_id is not null returning resource_id) select id from completed`,
      [
        scope.programId,
        scope.tenantId,
        key,
        receipt.state,
        receipt.providerId ?? null,
        receipt.error ?? null,
      ],
    );
    if (!rows.length) throw new Error("Command completion conflict");
  }
  async enqueue(record: InboxRecord): Promise<"inserted" | "duplicate"> {
    const result = await this.sql.query(
      "insert into reap_sandbox.webhook_inbox(program_id,service,trace_id,business_key,payload_hash,event_type,event_name,key_id,ciphertext,nonce) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing returning id",
      [
        this.programId,
        record.service,
        record.traceId,
        record.businessKey,
        record.payloadHash,
        record.eventType,
        record.eventName,
        record.keyId,
        record.ciphertext,
        record.nonce,
      ],
    );
    if (result.rows.length) return "inserted";
    const { rows } = await this.sql.query(
      "select payload_hash from reap_sandbox.webhook_inbox where program_id=$1 and service=$2 and (trace_id=$3 or business_key=$4)",
      [this.programId, record.service, record.traceId, record.businessKey],
    );
    if (
      !rows.length || rows.some((r) => r.payload_hash !== record.payloadHash)
    ) throw new Error("Webhook identity conflict");
    return "duplicate";
  }
}
