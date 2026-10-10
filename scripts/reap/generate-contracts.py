import pathlib,json,re
r=pathlib.Path(__file__).resolve().parents[2]; operations={
'createCard':'reference-post_cards','getCard':'reference-get_cards-cardid','listCards':'reference-get_cards','listDesigns':'reference-get_card-design',
'freezeCard':'reference-put_cards-cardid-status','adjustCredit':'reference-put_cards-cardid-credit','spendControls':'reference-put_cards-cardid-spend-control','revealHtml':'reference-post_cards-cardid-reveal-html','terminateCard':'reference-delete_cards-cardid',
'accountBalance':'reference-get_account-balance','balanceHistory':'reference-get_cards-cardid-balance-history','cardTransactions':'reference-get_cards-cardid-transactions','transactions':'reference-get_transactions','getTransaction':'reference-get_transactions-transactionid','requestReport':'reference-get_files-filetype',
'subscribeCards':'reference-post_webhooks','listCardSubscriptions':'reference-get_webhooks',
'simulateAuthorization':'reference-post_simulate-authorisation','simulateClearing':'reference-post_simulate-transactionid-clearing','simulateRefund':'reference-post_simulate-transactionid-refund','simulateReversal':'reference-post_simulate-transactionid-reversal',
'subscribeCompliance':'compliance-reference-post_notification','listComplianceSubscriptions':'compliance-reference-get_notification','createBusiness':'compliance-reference-post_entity','getEntity':'compliance-reference-get_entity-entityid','createKyb':'compliance-reference-post_entity-entityid-ukyb','amendKyb':'compliance-reference-patch_entity-entityid-ukyb','uploadKyb':'compliance-reference-post_entity-entityid-ukyb-documents','submitKyb':'compliance-reference-post_entity-entityid-ukyb-submit','getKyb':'compliance-reference-get_entity-entityid-ukyb','kybDocuments':'compliance-reference-get_entity-entityid-ukyb-documents','simulateKyb':'compliance-reference-post_simulate-entity-entityid-ukyb','resetKyb':'compliance-reference-post_simulate-entity-entityid-ukyb-reset'}
manifest={x['file']:x for x in json.loads((r/'docs/integrations/reap/reference/manifest.json').read_text()) if x.get('success')}
def strip(x):
 if isinstance(x,dict):return {k:strip(v) for k,v in x.items() if k not in ['description','example','examples','title','x-required','default']}
 if isinstance(x,list):return [strip(v) for v in x]
 return x
out={}
for name,file in operations.items():
 f=file+'.md'; text=(r/'docs/integrations/reap/reference'/f).read_text();spec=None
 for m in re.finditer(r'```json[^\n]*\n(.*?)\n```',text,re.S):
  try:s=json.loads(m.group(1))
  except:continue
  if isinstance(s,dict) and 'openapi' in s:spec=s;break
 assert spec,f
 path,methods=next(iter(spec['paths'].items()));method,op=next((k,v) for k,v in methods.items() if k in ['get','post','put','patch','delete'])
 out[name]={'service':'compliance' if file.startswith('compliance') else 'cards','method':method.upper(),'path':path,'parameters':strip(op.get('parameters',[])), 'body':strip(op.get('requestBody',{})), 'source':manifest[f]['url'],'sourceSha256':manifest[f]['sha256']}
 if '$ref' in json.dumps(out[name]):raise RuntimeError('unresolved ref '+name)
(r/'supabase/functions/_shared/cards/reap/contracts.json').write_text(json.dumps(out,indent=2)+'\n')
print('Generated',len(out),'contracts')
