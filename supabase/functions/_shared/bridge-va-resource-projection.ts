type Json = Record<string, unknown>;
const STATES = new Set(['active', 'activated', 'deactivated', 'inactive', 'closed', 'deleted', 'disabled', 'suspended', 'paused']);
const state = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Payment activities describe a transaction, not the virtual account resource.
 * Activation/deactivation activities are refreshed from the provider so replayed
 * or out-of-order events cannot reverse the current account state. */
export async function bridgeVaResourcePayload(input: {
  isActivity: boolean;
  payload: Json;
  existingStatus?: unknown;
  existingDetails?: Json;
  loadCurrent: () => Promise<Json>;
}): Promise<Json> {
  const activity = state(input.payload.type);
  const hasExistingStatus = STATES.has(state(input.existingStatus));
  if (input.isActivity) {
    if (['activation', 'deactivation'].includes(activity) || !hasExistingStatus) {
      const current = await input.loadCurrent();
      if (!STATES.has(state(current.status))) throw Error('bridge_va_current_status_unavailable');
      return current;
    }
    return { ...input.existingDetails, status: input.existingStatus };
  }
  if (STATES.has(state(input.payload.status))) {
    if (hasExistingStatus && state(input.payload.status) === state(input.existingStatus)) return input.payload;
    const current = await input.loadCurrent();
    if (!STATES.has(state(current.status))) throw Error('bridge_va_current_status_unavailable');
    return { ...input.payload, ...current };
  }
  // Partial lifecycle updates must not turn a restricted account active.
  if (hasExistingStatus) return { ...input.payload, status: input.existingStatus };
  const current = await input.loadCurrent();
  if (!STATES.has(state(current.status))) throw Error('bridge_va_current_status_unavailable');
  return current;
}
