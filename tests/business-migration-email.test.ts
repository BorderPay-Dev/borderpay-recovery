import { renderMigrationNotice } from '../supabase/functions/_shared/email-templates/business-migration.ts';
import { BUSINESS_MIGRATION_NOTICE as copy } from '../supabase/functions/_shared/email-templates/business-migration-copy.ts';
function assert(v:unknown){if(!v)throw new Error('assertion failed');}
Deno.test('notice safely explains restricted balances and pending partner approval',()=>{
 const r=renderMigrationNotice({company_name:'Example <script>alert(1)</script>'});
 assert(!r.html.includes('<script>'));assert(r.html.includes('&lt;script&gt;'));
 for(const item of copy.items)assert(r.text.includes(item.text));
 assert(r.text.includes('does not unlock withdrawals'));assert(r.text.includes('do not start another transaction'));
 assert(r.text.includes('launch depends on partner approvals'));assert(r.subject===copy.subject);
});
