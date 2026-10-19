export function normalizeBridgeVaStatus(value: unknown): "active" | "suspended" | "closed" | "deactivated" {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "deactivated") return "deactivated";
  if (["closed", "deleted", "disabled", "inactive"].includes(status)) return "closed";
  if (["suspended", "paused"].includes(status)) return "suspended";
  return "active";
}

export function maintenanceReactivationDisposition(status: unknown): "already_active" | "reactivate" {
 const value=String(status ?? "").toLowerCase();
 if (["active","activated"].includes(value)) return "already_active";
 if (value === "deactivated") return "reactivate";
 throw new Error("provider_account_not_reactivatable");
}

/** A maintenance payment cannot remove an independent provider compliance hold. */
export function maintenanceProviderActionAllowed(action: unknown, status: unknown): boolean {
  if (action !== "deactivate" && action !== "reactivate") return false;
  return status === "active" || (action === "deactivate" && status === "deposits_restricted");
}
