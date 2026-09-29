import { BorderPayClient } from "../typescript/dist/index.js";
// Run only after BorderPay confirms sandbox customer operations are enabled.
const client = new BorderPayClient({
  gatewayUrl: process.env.GATEWAY_URL || "https://sandbox.api.borderpayafrica.com",
  apiKey: process.env.API_KEY,
  mode: "sandbox",
  customerAccessToken: process.env.CUSTOMER_ACCESS_TOKEN,
});
console.log((await client.health()).data);
// This authorizes a business signup; it does not approve the business or open accounts.
console.log((await client.createOnboardingAuthorization({
  external_user_id: "synthetic-business-001",
  onboarding_channel: "api",
  requested_account_types: ["business"],
}, "sandbox-business-001")).data);
// Complete hosted business signup, KYB and owner verification before customer operations.
