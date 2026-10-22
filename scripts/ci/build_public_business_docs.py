from pathlib import Path
import shutil,re,json
root=Path(__file__).resolve().parents[2];out=root/'dist-partner-docs'
if out.exists():shutil.rmtree(out)
shutil.copytree(root/'docs/developer-site',out)
source=root/'docs/api';dest=out/'artifacts/api'
shutil.copytree(source,dest,ignore=shutil.ignore_patterns('onboarding','node_modules','package-lock.json','test'))
for f in out.rglob('*'):
 if f.is_file() and f.suffix in ['.html','.js','.ts','.json','.md','.yaml','.mjs']:
  text=f.read_text()
  assert not re.search(r'\b(?:bridge|persona|conduit|muralpay)\b|bridge_',text,re.I),f'Provider identity in public docs: {f}'
  assert not re.search(r'account_type["\s:]+individual|individual\s*\|\s*business|\[individual,\s*business\]',text,re.I),f'Personal onboarding in public docs: {f}'
print('Public docs assembled; provider identity and personal onboarding checks passed')
