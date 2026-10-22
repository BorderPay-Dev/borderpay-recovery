import { compliancePolicy } from "./compliance-policy.ts";
import { prepareMerchantCard } from "./prepare-business-card.ts";
import { type KybUpload, prepareKybUpload } from "./documents.ts";
import {
  type Operation,
  prepareRequest,
  type RequestInput,
  type Service,
} from "./contracts.ts";
export const sandboxOrigins = Object.freeze({
  cards: "https://sandbox.api.caas.reap.global",
  compliance: "https://sandbox-compliance.api.reap.global",
});
export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 0,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}
export class SandboxTransport {
  #keys: Partial<Record<Service, string>>;
  #fetch: typeof fetch;
  constructor(
    keys: Partial<Record<Service, string>>,
    fetcher: typeof fetch = fetch,
  ) {
    this.#keys = { ...keys };
    this.#fetch = fetcher;
  }
  async execute(
    operation: Operation,
    input: RequestInput = {},
    operationKey?: string,
  ): Promise<unknown> {
    if (operation === "createCard") {
      prepareMerchantCard(input.body, operationKey ?? "");
    }
    if (operation === "createBusiness") {
      const b = input.body as Record<string, unknown>;
      if (
        b?.type !== compliancePolicy.merchantType ||
        b?.verificationMode !== compliancePolicy.verificationMode
      ) {
        throw new ProviderError("business_ukyb_required");
      }
    }
    if (operation === "adjustCredit") {
      const b = input.body as Record<string, unknown>;
      if (
        typeof b?.adjustment !== "string" ||
        !/^[-]?(0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(b.adjustment) ||
        Number(b.adjustment) === 0
      ) throw new ProviderError("exact_nonzero_adjustment_required");
    }
    if (operation === "spendControls") {
      const b = input.body as Record<string, unknown>;
      if (
        !b || !Object.keys(b).length ||
        Object.values(b).some((v) =>
          typeof v !== "number" || !Number.isFinite(v) || v < 0
        )
      ) throw new ProviderError("invalid_spending_limit");
    }
    if (
      operation === "amendKyb" && input.body &&
      Object.hasOwn(input.body as object, "uboDeclaration")
    ) throw new ProviderError("owner_replacement_requires_separate_review");
    const r = prepareRequest(operation, input);
    return await this.#send(r.service, r.method, r.path, r.body, operationKey);
  }
  async uploadKyb(input: KybUpload, operationKey: string): Promise<unknown> {
    const r = await prepareKybUpload(input);
    return await this.#send("compliance", "POST", r.path, r.body, operationKey);
  }
  // Internal only: callers must persist operations and authorize tenant/resource bindings.
  async #send(
    service: Service,
    method: string,
    path: string,
    body?: unknown,
    operationKey?: string,
  ): Promise<unknown> {
    if (
      !Object.hasOwn(sandboxOrigins, service) ||
      !/^\/[a-zA-Z0-9/?=&_.%-]+$/.test(path) || path.startsWith("//") ||
      /%2f|%5c|\.\./i.test(path)
    ) throw new ProviderError("invalid_sandbox_route");
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      throw new ProviderError("invalid_method");
    }
    const key = this.#keys[service];
    if (!key || /\s/.test(key)) {
      throw new ProviderError("sandbox_credential_missing");
    }
    if (
      method !== "GET" &&
      (!operationKey ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          .test(operationKey))
    ) throw new ProviderError("persisted_operation_key_required");
    const headers: Record<string, string> = {
      "x-reap-api-key": key,
      Accept: "application/json",
    };
    if (service === "cards") headers["Accept-Version"] = "v2.0";
    if (operationKey) headers["Idempotency-Key"] = operationKey;
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    try {
      const response = await this.#fetch(sandboxOrigins[service] + path, {
        method,
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(8000),
        body: body === undefined
          ? undefined
          : body instanceof FormData
          ? body
          : JSON.stringify(body),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderError(
          "provider_request_failed",
          response.status,
          method !== "GET" &&
            (response.status >= 500 || response.status === 408),
        );
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        "provider_transport_or_response_failed",
        0,
        method !== "GET",
      );
    }
  }
}
