/** Read-only reconciliation. Report amounts are decimal strings, never binary sums.
 * Balance here is provider available balance (including holds), not earned revenue. */
export function minorUnits(value: string, precision = 2): bigint {
  if (
    !Number.isInteger(precision) || precision < 0 || precision > 8 ||
    typeof value !== "string" || !/^[-]?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)
  ) throw new Error("Invalid exact decimal");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  if (fraction.length > precision) {
    throw new Error("Precision exceeds currency minor units");
  }
  return (negative ? -1n : 1n) *
    (BigInt(whole) * 10n ** BigInt(precision) +
      BigInt(fraction.padEnd(precision, "0") || "0"));
}
export interface SettlementRow {
  eventKey: string;
  cardId?: string;
  currency: string;
  status: string;
  type: string;
  incoming: string;
  outgoing: string;
  balance: string;
}
export function reconcileSettlement(
  rows: SettlementRow[],
  opening: Record<string, string>,
  closing: Record<string, string>,
  precision: Record<string, number> = { USD: 2, HKD: 2 },
) {
  const balances = new Map<string, bigint>();
  const seen = new Map<string, string>();
  const issues: string[] = [];
  let duplicates = 0;
  const settledSpend: Record<string, bigint> = {},
    refunds: Record<string, bigint> = {};
  for (const [currency, amount] of Object.entries(opening)) {
    if (precision[currency] === undefined) {
      throw new Error("Unconfigured currency");
    }
    balances.set(currency, minorUnits(amount, precision[currency]));
  }
  for (const row of rows) {
    if (!row.eventKey) throw new Error("Verified report row identity required");
    const identity = row.currency + ":" + row.eventKey;
    const content = JSON.stringify(row);
    if (seen.has(identity)) {
      if (seen.get(identity) !== content) {
        issues.push(`conflicting_duplicate:${identity}`);
      } else duplicates++;
      continue;
    }
    seen.set(identity, content);
    const p = precision[row.currency];
    const balance = balances.get(row.currency);
    if (p === undefined || balance === undefined) {
      issues.push(`missing_opening_or_currency:${row.currency}`);
      continue;
    }
    const credit = minorUnits(row.incoming, p),
      debit = minorUnits(row.outgoing, p),
      reported = minorUnits(row.balance, p);
    if (credit < 0n || debit < 0n) {
      throw new Error("In and Out must be non-negative");
    }
    const expected = balance + credit - debit;
    if (expected !== reported) issues.push(`balance_mismatch:${identity}`);
    balances.set(row.currency, expected);
    if (!["PENDING", "CLEARED", "VOID", "DECLINED"].includes(row.status)) {
      issues.push(`unknown_status:${identity}`);
    }
    // Do not infer transaction volume from In/Out: clearing may only release the
    // authorization hold in an available-balance report. Amounts below are report
    // movement totals only, and never additional ledger postings.
    if (row.type === "CAPTURE_SETTLEMENT" && row.status === "CLEARED") {
      settledSpend[row.currency] = (settledSpend[row.currency] ?? 0n) + debit;
    }
    if (row.type === "REFUND_SETTLEMENT" && row.status === "CLEARED") {
      refunds[row.currency] = (refunds[row.currency] ?? 0n) + credit;
    }
  }
  for (
    const currency of new Set([...balances.keys(), ...Object.keys(closing)])
  ) {
    if (
      closing[currency] === undefined || precision[currency] === undefined ||
      balances.get(currency) !==
        minorUnits(closing[currency], precision[currency])
    ) issues.push(`closing_mismatch:${currency}`);
  }
  const strings = (v: Record<string, bigint>) =>
    Object.fromEntries(Object.entries(v).map(([k, n]) => [k, n.toString()]));
  return {
    matched: issues.length === 0,
    issues,
    duplicates,
    balanceMinor: Object.fromEntries(
      [...balances].map(([k, n]) => [k, n.toString()]),
    ),
    clearingOutMinor: strings(settledSpend),
    refundInMinor: strings(refunds),
  };
}
