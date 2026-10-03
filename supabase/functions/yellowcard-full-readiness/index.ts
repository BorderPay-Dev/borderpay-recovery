import { readinessHandler } from "./handler.ts";
Deno.serve(readinessHandler(
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { apiKeyId: Deno.env.get("YC_PRODUCTION_API_KEY") ?? "", secret: Deno.env.get("YC_PRODUCTION_SECRET_KEY") ?? "" },
));
