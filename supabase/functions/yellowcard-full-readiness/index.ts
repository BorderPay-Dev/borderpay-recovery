import { readinessHandler } from "./handler.ts";
Deno.serve(readinessHandler(
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { apiKeyId: (Deno.env.get("YC_PRODUCTION_API_KEY") ?? "").trim(), secret: (Deno.env.get("YC_PRODUCTION_SECRET_KEY") ?? "").trim(),
    relay: { url: (Deno.env.get("YC_EGRESS_RELAY_URL") ?? "").trim(), token: (Deno.env.get("YC_EGRESS_RELAY_TOKEN") ?? "").trim() } },
));
