/** Worker credentials must match trusted server configuration; JWT claims alone prove nothing. */
export function isAuthorizedWorkerToken(token: string, credentials: readonly string[]): boolean {
  return token.length > 0 && credentials.some((credential) => credential.length > 0 && token === credential);
}

/** Store only stable provider codes, never arbitrary provider response bodies. */
export function classifyFcmFailure(status: number, payload: unknown): { code: string; revokeDevice: boolean } {
  const error = (payload as { error?: { details?: unknown[] } } | null)?.error;
  const details = Array.isArray(error?.details) ? error.details : [];
  const fcm = details.find((detail): detail is { '@type': string; errorCode: string } =>
    !!detail && typeof detail === 'object' &&
    (detail as Record<string, unknown>)['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' &&
    typeof (detail as Record<string, unknown>).errorCode === 'string'
  );
  const known = new Set(['UNREGISTERED', 'THIRD_PARTY_AUTH_ERROR', 'SENDER_ID_MISMATCH', 'QUOTA_EXCEEDED', 'UNAVAILABLE', 'INTERNAL', 'INVALID_ARGUMENT']);
  const code = fcm && known.has(fcm.errorCode) ? fcm.errorCode : `HTTP_${status}`;
  return { code, revokeDevice: code === 'UNREGISTERED' };
}
