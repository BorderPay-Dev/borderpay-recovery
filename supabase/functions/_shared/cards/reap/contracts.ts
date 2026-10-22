import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import source from "./contracts.json" with { type: "json" };
export type Operation = keyof typeof source;
export type Service = "cards" | "compliance";
export const contracts = source;
const ajv = new Ajv({ strict: false, allErrors: true, coerceTypes: false });
(addFormats as unknown as (instance: Ajv) => void)(ajv);
// OpenAPI numeric format annotations have no additional constraints.
ajv.addFormat("float", { type: "number", validate: Number.isFinite });
ajv.addFormat("double", { type: "number", validate: Number.isFinite });
export class ContractError extends Error {
  constructor(public readonly fields: string[]) {
    super("Request does not match the documented contract.");
  }
}
export function validateSchema(schema: object, value: unknown): void {
  if (!ajv.validate(schema, value)) {
    throw new ContractError(
      (ajv.errors ?? []).map((e) => `${e.instancePath || "/"}:${e.keyword}`),
    );
  }
}
export interface RequestInput {
  path?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
}
export function prepareRequest(operation: Operation, input: RequestInput = {}) {
  if (!Object.hasOwn(contracts, operation)) {
    throw new ContractError(["operation"]);
  }
  const contract = contracts[operation];
  let path: string = contract.path;
  const query = new URLSearchParams();
  const parameters = contract.parameters as {
    in: string;
    name: string;
    required?: boolean;
    schema: object;
  }[];
  for (const kind of ["path", "query"] as const) {
    const supplied = input[kind] ?? {};
    if (
      Object.keys(supplied).some((k) =>
        !parameters.some((p) => p.in === kind && p.name === k)
      )
    ) throw new ContractError([kind]);
    for (const p of parameters.filter((p) => p.in === kind)) {
      const val = supplied[p.name];
      if (val === undefined) {
        if (p.required) throw new ContractError([p.name]);
        continue;
      }
      validateSchema(p.schema, val);
      if (kind === "path") {
        if (typeof val !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(val)) {
          throw new ContractError([p.name]);
        }
        path = path.replace(`{${p.name}}`, encodeURIComponent(val));
      } else query.set(p.name, String(val));
    }
  }
  if (path.includes("{")) throw new ContractError(["path"]);
  const content =
    (contract.body as { content?: Record<string, { schema: object }> }).content;
  if (content?.["multipart/form-data"]) {
    throw new ContractError(["Use the document upload builder."]);
  }
  if (content?.["application/json"]) {
    // Some public simulation schemas use oneOf for identical alternatives solely
    // to describe conditional fields. Leave ambiguous offline-clearing mode disabled.
    validateSchema(content["application/json"].schema, input.body);
  } else if (input.body !== undefined) {
    throw new ContractError(["body_not_supported"]);
  }
  const qs = query.toString();
  return {
    operation,
    service: contract.service as Service,
    method: contract.method,
    path: path + (qs ? "?" + qs : ""),
    body: input.body === undefined ? undefined : structuredClone(input.body),
  };
}
