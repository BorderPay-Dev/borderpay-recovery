import {
  createReceivingAccount,
  receivingCapabilities,
  type ReceivingContext,
  ReceivingError,
} from "../supabase/functions/_shared/providers/receiving-routing.ts";
import {
  postRainUsdRoute,
  rainUsdPayload,
} from "../supabase/functions/_shared/providers/rain-receiving.ts";
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw Error(message);
}
const context: ReceivingContext = {
  userId: "merchant-a",
  business: true,
  localAccountStatus: "active",
  fraudHold: false,
  subscriptionRestricted: false,
  securityEnrolled: true,
  eligibility: { rain: "approved", yellowcard: "approved" },
};
async function rejects(fn: () => unknown, code: string) {
  try {
    await fn();
  } catch (e) {
    assert(e instanceof ReceivingError && e.code === code);
    return;
  }
  throw Error(`Expected ${code}`);
}
Deno.test("new accounts select only their currency provider and authenticated merchant", async () => {
  const calls: string[] = [];
  const adapters = {
    rain: async (id: string) => {
      calls.push(`rain:${id}`);
      return "USD";
    },
    yellowcard: async (id: string) => {
      calls.push(`yc:${id}`);
      return "EUR";
    },
  };
  assert(await createReceivingAccount(context, "usd", adapters) === "USD");
  assert(await createReceivingAccount(context, "EUR", adapters) === "EUR");
  await rejects(
    () => createReceivingAccount(context, "GBP", adapters),
    "receiving_currency_unavailable",
  );
  await rejects(
    () => createReceivingAccount(context, null, adapters),
    "invalid_currency",
  );
  assert(calls.join(",") === "rain:merchant-a,yc:merchant-a");
  assert(
    !receivingCapabilities(context).supported_currencies.includes(
      "GBP" as never,
    ),
  );
});
Deno.test("failed provider never falls back; other provider approval is independent", async () => {
  let calls = 0;
  const adapters = {
    rain: async () => {
      throw Error("timeout");
    },
    yellowcard: async () => {
      calls++;
      return "EUR";
    },
  };
  try {
    await createReceivingAccount(context, "USD", adapters);
    throw Error("must fail");
  } catch (e) {
    assert((e as Error).message === "timeout");
  }
  assert(calls === 0);
  const restricted: ReceivingContext = {
    ...context,
    eligibility: { rain: "restricted", yellowcard: "approved" },
  };
  await rejects(
    () => createReceivingAccount(restricted, "USD", adapters),
    "receiving_setup_required",
  );
  assert(await createReceivingAccount(restricted, "EUR", adapters) === "EUR");
});
Deno.test("fraud, maintenance, authentication, business and security gates precede adapter calls", async () => {
  const adapters = {
    rain: async () => {
      throw Error("must not call");
    },
    yellowcard: async () => {
      throw Error("must not call");
    },
  };
  for (
    const status of [
      "frozen",
      "under_review",
      "",
      "paused",
      "deactivated",
      "unknown",
    ]
  ) {
    await rejects(() =>
      createReceivingAccount(
        { ...context, localAccountStatus: status },
        "USD",
        adapters,
      ), "account_restricted");
  }
  await rejects(
    () =>
      createReceivingAccount({ ...context, fraudHold: true }, "EUR", adapters),
    "account_restricted",
  );
  await rejects(
    () =>
      createReceivingAccount(
        { ...context, subscriptionRestricted: true },
        "USD",
        adapters,
      ),
    "subscription_restricted",
  );
  await rejects(
    () =>
      createReceivingAccount(
        { ...context, securityEnrolled: false },
        "USD",
        adapters,
      ),
    "security_setup_required",
  );
  await rejects(
    () =>
      createReceivingAccount({ ...context, business: false }, "USD", adapters),
    "business_required",
  );
  await rejects(
    () => createReceivingAccount({ ...context, userId: "" }, "USD", adapters),
    "unauthorized",
  );
});
const input = {
  companyId: "11111111-1111-4111-8111-111111111111",
  destinationAddress: "0x1111111111111111111111111111111111111111",
  feePercent: "3",
};
Deno.test("Rain uses business companyId, USDC Base and explicit fee without Bridge fields", async () => {
  const payload = rainUsdPayload(input);
  assert(
    payload.companyId === input.companyId &&
      payload.senderFees[0].amount === "3",
  );
  assert(
    payload.destination.currency === "usdc" &&
      payload.destination.rail === "base",
  );
  assert(!JSON.stringify(payload).includes("bridge"));
  await rejects(
    () => rainUsdPayload({ ...input, feePercent: "" }),
    "fee_configuration_invalid",
  );
  await rejects(
    () =>
      rainUsdPayload({ ...input, destinationAddress: "0x" + "0".repeat(40) }),
    "wallet_destination_required",
  );
});
Deno.test("Rain transport pins host, uses persisted UUID, and does not retry unknown outcomes", async () => {
  const config = {
    enabled: true,
    apiKey: "synthetic-test-key",
    environment: "sandbox" as const,
  };
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert(String(url) === "https://api-dev.rain.xyz/v1/payment-routes");
    assert(
      new Headers(init?.headers).get("Idempotency-Key") === input.companyId,
    );
    assert(init?.redirect === "error");
    throw Error("network timeout");
  };
  await rejects(
    () => postRainUsdRoute(config, input, input.companyId, transport),
    "receiving_reconciliation_required",
  );
  assert(calls === 1);
  await rejects(
    () =>
      postRainUsdRoute(
        { ...config, enabled: false },
        input,
        input.companyId,
        transport,
      ),
    "receiving_unavailable",
  );
  await rejects(
    () => postRainUsdRoute(config, input, "x".repeat(65), transport),
    "operation_required",
  );
  assert(calls === 1);
});
