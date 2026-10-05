import { hasActiveMaintenanceVa, requiresActiveMaintenanceVa } from '../supabase/functions/_shared/maintenance-va-email-policy.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
function db(rows:any[], error:unknown=null, user:any={id:'merchant'}) {
 return {from(table:string){const filters:Record<string,string>={}; const q:any={select(){return q},eq(k:string,v:string){filters[k]=v;return q},ilike(){return q},maybeSingle(){return Promise.resolve({data:user,error})},limit(){return Promise.resolve({data:rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)),error})}};return q}};
}
Deno.test('only active VA owned by recipient allows a reminder',async()=>{
 for(const status of ['deactivated','suspended','closed','pending']) assert(!await hasActiveMaintenanceVa(db([{user_id:'merchant',status}]),'merchant'));
 assert(!await hasActiveMaintenanceVa(db([]),'merchant'));
 assert(!await hasActiveMaintenanceVa(db([{user_id:'another',status:'active'}]),'merchant'));
 assert(await hasActiveMaintenanceVa(db([{user_id:'merchant',status:'closed'},{user_id:'merchant',status:'active'}]),'merchant'));
});
Deno.test('email-only caller resolves customer and missing identity is suppressed',async()=>{
 assert(await hasActiveMaintenanceVa(db([{user_id:'merchant',status:'active'}]),undefined,'merchant@example.com'));
 assert(!await hasActiveMaintenanceVa(db([],null,null),undefined,'unknown@example.com'));
 assert(!await hasActiveMaintenanceVa(db([])));
});
Deno.test('VA lookup failure prevents delivery',async()=>{
 let failed=false;try{await hasActiveMaintenanceVa(db([],new Error('offline')),'merchant')}catch{failed=true}assert(failed);
});
Deno.test('payment receipts and verification emails remain outside reminder guard',()=>{
 assert(requiresActiveMaintenanceVa('business.subscription_external_invoice'));
 for(const t of ['business.subscription_payment_status','business.email_verification','business.password_reset']) assert(!requiresActiveMaintenanceVa(t));
});
