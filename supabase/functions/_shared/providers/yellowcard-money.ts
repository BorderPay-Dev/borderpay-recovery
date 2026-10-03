/** Decimal arithmetic for ledger/display values. No floats in balance aggregation. */
const SCALE = 1000000000000n;
export function units(value: string): bigint {
  if (!/^-?(?:0|[1-9]\d{0,23})(?:\.\d{1,12})?$/.test(value)) throw new Error('Invalid decimal amount');
  const negative = value.startsWith('-'), [whole, fraction = ''] = value.replace('-', '').split('.');
  return (BigInt(whole)*SCALE+BigInt(fraction.padEnd(12,'0'))) * (negative ? -1n : 1n);
}
export function decimal(n: bigint): string {
  const sign = n < 0n ? '-' : '', a = n < 0n ? -n : n;
  const f = String(a%SCALE).padStart(12,'0').replace(/0+$/, '');
  return sign+String(a/SCALE)+(f ? '.'+f : '');
}
export function providerAmount(value: unknown): string {
  if (typeof value === 'string') { units(value); return value; }
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value)>Number.MAX_SAFE_INTEGER) throw new Error('Invalid provider amount');
  const s=String(value); units(s); return s;
}
export function jsonAmount(value: string): number {
  const n=Number(value); if (!Number.isFinite(n) || providerAmount(n)!==decimal(units(value))) throw new Error('Amount cannot be represented by provider JSON safely');
  return n;
}
export interface Balance {
  merchantId: string; environment: 'production'|'sandbox'; resourceId: string; kind: 'fiat'|'crypto'|'virtual_account';
  asset: string; available: string; held: string | null; observedAt: string; active: boolean;
}
export interface Rate { asset: string; usdPerUnit: string; observedAt: string; source: string }
export function usdPortfolio(merchantId: string, environment: Balance['environment'], balances: Balance[], rates: Rate[], now = Date.now(), maxAgeMs=60000) {
  const unique=new Set<string>(); let sum=0n; const missing:string[]=[];
  const validTime=(s:string)=>Number.isFinite(Date.parse(s)) && Date.parse(s)<=now+5000 && now-Date.parse(s)<=maxAgeMs;
  for (const b of balances) {
    if (b.merchantId!==merchantId || b.environment!==environment) throw new Error('Balance ownership mismatch');
    if (b.kind==='virtual_account') continue; // Linked fiat wallet already owns this money.
    const key=`${b.kind}:${b.resourceId}:${b.asset}`;
    if (unique.has(key)) throw new Error('Duplicate source balance'); unique.add(key);
    const amount=units(b.available); if(amount<0n) throw new Error('Negative available balance');
    if (!validTime(b.observedAt)) { missing.push(key); continue; }
    // Restricted funds remain visible, but are never labelled spendable by active=false.
    if (b.asset==='USD') { sum+=amount; continue; }
    const matches=rates.filter(r=>r.asset===(b.kind==='crypto'?b.asset.split('_')[0]:b.asset) && r.source && validTime(r.observedAt));
    if(matches.length!==1 || units(matches[0].usdPerUnit)<=0n) { missing.push(key); continue; }
    sum+=amount*units(matches[0].usdPerUnit)/SCALE;
  }
  // Never present a partial value as the total. Missing rates include stablecoins.
  return {currency:'USD', total:missing.length ? null : decimal(sum), knownSubtotal:decimal(sum), complete:missing.length===0, missing, valuedAt:new Date(now).toISOString()};
}
