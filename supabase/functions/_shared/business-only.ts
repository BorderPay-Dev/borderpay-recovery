/** Product eligibility, independent of tenant flags or provider configuration. */
export const BUSINESS_ONLY_MESSAGE = "BorderPay supports business accounts only. Personal accounts are not supported.";
export function isBusinessAccount(value: unknown): boolean { return value === "business"; }
