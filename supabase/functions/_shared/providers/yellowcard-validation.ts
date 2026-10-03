/** Dependency-free input validation. Never copy unknown provider fields into identity records. */
export class YCValidationError extends Error {
  constructor(public readonly field: string, public readonly code = 'invalid_field') { super(`Please check ${field}`); }
}
type Schema = { type?: string; enum?: readonly unknown[]; required?: readonly string[]; properties?: Record<string, Schema>; items?: Schema; oneOf?: readonly Schema[]; minimum?: number; exclusiveMinimum?: boolean; minLength?: number; maxLength?: number; additionalProperties?: boolean | Schema };
export function validateSchema(value: unknown, schema: Schema, path = 'request', depth = 0): void {
  if (depth > 16) throw new YCValidationError(path);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(s => { try { validateSchema(value, s, path, depth + 1); return true; } catch { return false; } });
    if (matches.length !== 1) throw new YCValidationError(path, 'ambiguous_request');
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) throw new YCValidationError(path);
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new YCValidationError(path);
    const obj = value as Record<string, unknown>;
    for (const k of schema.required ?? []) if (obj[k] === undefined || obj[k] === null || obj[k] === '') throw new YCValidationError(`${path}.${k}`, 'required');
    for (const [k,v] of Object.entries(obj)) {
      if (['__proto__','constructor','prototype'].includes(k)) throw new YCValidationError(path);
      if (schema.properties?.[k]) validateSchema(v, schema.properties[k], `${path}.${k}`, depth+1);
      else if (schema.additionalProperties === false) throw new YCValidationError(`${path}.${k}`, 'unsupported_field');
      else if (typeof schema.additionalProperties === 'object') validateSchema(v, schema.additionalProperties, `${path}.${k}`, depth+1);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > 1000) throw new YCValidationError(path);
    value.forEach(v => validateSchema(v, schema.items ?? {}, path, depth+1));
  } else if (schema.type === 'string') {
    if (typeof value !== 'string' || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 10000)) throw new YCValidationError(path);
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || (schema.type === 'integer' && !Number.isInteger(value)) || (schema.minimum !== undefined && (schema.exclusiveMinimum ? value <= schema.minimum : value < schema.minimum))) throw new YCValidationError(path);
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') throw new YCValidationError(path);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new YCValidationError('response');
  return value as Record<string, unknown>;
}
export function nonempty(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 10000) throw new YCValidationError(field, 'required');
  return value.trim();
}
