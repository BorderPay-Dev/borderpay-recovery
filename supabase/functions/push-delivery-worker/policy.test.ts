import { classifyFcmFailure, isAuthorizedWorkerToken } from './policy.ts';
function eq(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected result'); }
Deno.test('trusted worker secrets authorize, blank and forged JWT claims do not', () => {
  eq(isAuthorizedWorkerToken('cron-fixture', ['cron-fixture', '', 'service-fixture']), true);
  eq(isAuthorizedWorkerToken('service-fixture', ['cron-fixture', 'service-fixture']), true);
  eq(isAuthorizedWorkerToken('', ['', '']), false);
  const forged = btoa(JSON.stringify({alg:'none'})) + '.' + btoa(JSON.stringify({role:'service_role'})) + '.unsigned';
  eq(isAuthorizedWorkerToken(forged, ['cron-fixture', 'service-fixture']), false);
  eq(isAuthorizedWorkerToken('wrong', ['', 'cron-fixture']), false);
});
function failure(errorCode: string) { return {error:{details:[{'@type':'type.googleapis.com/google.firebase.fcm.v1.FcmError',errorCode}]}}; }
Deno.test('expired registration retires the device', () => eq(classifyFcmFailure(404, failure('UNREGISTERED')), {code:'UNREGISTERED',revokeDevice:true}));
Deno.test('Apple credential failure preserves device registration', () => eq(classifyFcmFailure(401, failure('THIRD_PARTY_AUTH_ERROR')), {code:'THIRD_PARTY_AUTH_ERROR',revokeDevice:false}));
Deno.test('generic 404 does not retire a valid device', () => eq(classifyFcmFailure(404, {error:{message:'resource not found'}}), {code:'HTTP_404',revokeDevice:false}));
Deno.test('untrusted messages cannot trigger retirement or enter stored errors', () => {
  eq(classifyFcmFailure(500, {error:{message:'UNREGISTERED token-sensitive',details:'bad'}}), {code:'HTTP_500',revokeDevice:false});
  eq(classifyFcmFailure(500, failure('untrusted-secret')), {code:'HTTP_500',revokeDevice:false});
  eq(classifyFcmFailure(500, null), {code:'HTTP_500',revokeDevice:false});
});
