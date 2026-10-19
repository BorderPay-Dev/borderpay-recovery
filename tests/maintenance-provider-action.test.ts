import { maintenanceProviderActionAllowed } from "../supabase/functions/_shared/maintenance-access-policy.ts";
Deno.test("maintenance actions preserve independent provider restrictions", () => {
  for (const status of ["active", "deposits_restricted", "paused", "frozen", "rejected", "under_review", "closed", "", null, undefined]) {
    for (const action of ["deactivate", "reactivate", "unknown", null]) {
      const expected = (action === "deactivate" && (status === "active" || status === "deposits_restricted")) || (action === "reactivate" && status === "active");
      if (maintenanceProviderActionAllowed(action, status) !== expected) throw new Error(`Unexpected permission for ${action}/${status}`);
    }
  }
});
