import { parse } from "jsr:@std/yaml";
import { assertEquals, assert } from "jsr:@std/assert";
Deno.test("public OpenAPI parses and only publishes business onboarding and neutral wallet fields",async()=>{
 const spec:any=parse(await Deno.readTextFile('docs/api/openapi-v1.yaml'));
 assertEquals(spec.components.schemas.CreateCustomerRequest.properties.account_type.enum,['business']);
 assertEquals(spec.components.parameters.CustomerAuthorization.name,'X-BorderPay-Customer-Authorization');
 assertEquals(spec.paths['/v1/onboarding-authorizations'].post.requestBody.content['application/json'].schema.properties.requested_account_types.items.enum,['business']);
 assertEquals(spec.components.schemas.CreateVirtualAccountRequest.required,['currency']);
 assert(spec.components.schemas.TransferParty.properties.wallet_id);
 function walk(value:any) {
  if(!value||typeof value!=='object')return;
  if(typeof value.$ref==='string'&&value.$ref.startsWith('#/')) {
   let target:any=spec;for(const key of value.$ref.slice(2).split('/')) target=target?.[key];assert(target,`Unresolved reference ${value.$ref}`);
  }
  for(const child of Object.values(value))walk(child);
 }
 walk(spec);
});
