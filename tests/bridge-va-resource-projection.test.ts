import { bridgeVaResourcePayload } from '../supabase/functions/_shared/bridge-va-resource-projection.ts';
const equal = (a: unknown, b: unknown) => { if (a !== b) throw Error(`Expected ${b}, got ${a}`); };

Deno.test('payment activity preserves deactivation and the VA resource, not transaction fields', async () => {
  const resource = await bridgeVaResourcePayload({ isActivity: true,
    payload: { id: 'activity', type: 'payment_processed', currency: 'usdc', receipt: { final_amount: '100' } },
    existingStatus: 'deactivated', existingDetails: { id: 'va', currency: 'eur', source_deposit_instructions: { currency: 'eur' } },
    loadCurrent: () => { throw Error('Ordinary activity should not request another provider read'); },
  });
  equal(resource.status, 'deactivated'); equal(resource.id, 'va'); equal(resource.currency, 'eur'); equal(resource.receipt, undefined);
});
Deno.test('activation and deactivation activity use current provider state, including stale replay', async () => {
  for (const type of ['activation', 'deactivation']) for (const current of ['active', 'deactivated', 'closed', 'suspended']) {
    let reads = 0;
    const resource = await bridgeVaResourcePayload({ isActivity: true, payload: { type }, existingStatus: 'active',
      loadCurrent: async () => { reads++; return { id: 'va', status: current }; } });
    equal(reads, 1); equal(resource.status, current);
  }
});
Deno.test('partial resource update preserves prior restriction, first activity requires a real VA', async () => {
  const partial = await bridgeVaResourcePayload({ isActivity: false, payload: { id: 'va' }, existingStatus: 'suspended', loadCurrent: async () => { throw Error('unexpected'); } });
  equal(partial.status, 'suspended');
  const initial = await bridgeVaResourcePayload({ isActivity: true, payload: { amount: '100' }, loadCurrent: async () => ({ id: 'va', status: 'active', currency: 'eur' }) });
  equal(initial.id, 'va'); equal(initial.currency, 'eur'); equal(initial.amount, undefined);
});
Deno.test('provider outage or unknown state fails for retry instead of activating a VA', async () => {
  for (const loadCurrent of [async () => { throw Error('provider_unavailable'); }, async () => ({status: 'unknown'})]) {
    let failed = false;
    try { await bridgeVaResourcePayload({ isActivity: true, payload: {type: 'activation'}, existingStatus: 'deactivated', loadCurrent }); }
    catch { failed = true; }
    equal(failed, true);
  }
});

Deno.test('late resource activation cannot override the current provider deactivation', async () => {
  const resource = await bridgeVaResourcePayload({ isActivity: false, payload: {id: 'va', status: 'active'}, existingStatus: 'deactivated',
    loadCurrent: async () => ({ id: 'va', status: 'deactivated' }) });
  equal(resource.status, 'deactivated');
});
