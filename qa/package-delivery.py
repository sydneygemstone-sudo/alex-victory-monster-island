"""Reproducible delivery accounting and packaging; no model-token billing claims."""
from pathlib import Path
from datetime import datetime
import hashlib,json,re,subprocess,zipfile
ROOT=Path(__file__).resolve().parent.parent
stamp=datetime.now().astimezone().isoformat()
def dump(name,data):
    (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(raw):return hashlib.sha256(raw).hexdigest()
# Syntax checks inspect source only; they do not execute a browser.
syntax=[]
for folder in ['game','originals']:
    for f in (ROOT/folder).rglob('*'):
        if f.suffix not in ('.js','.mjs') or 'vendor' in f.parts or 'node_modules' in f.parts:continue
        r=subprocess.run(['/opt/homebrew/bin/node','--check',str(f)],capture_output=True,text=True)
        syntax.append({'file':str(f.relative_to(ROOT)),'passed':r.returncode==0,'error':r.stderr[:1500]})
for name in ['site.mjs','server.mjs']:
    r=subprocess.run(['/opt/homebrew/bin/node','--check',str(ROOT/name)],capture_output=True,text=True)
    syntax.append({'file':name,'passed':r.returncode==0,'error':r.stderr[:1500]})
assert all(x['passed'] for x in syntax),syntax
new_tap=(ROOT/'qa/node-tests.tap').read_text();old_tap=(ROOT/'qa/original-rule-tests.tap').read_text()
assert '# pass 20' in new_tap and '# fail 0' in new_tap
assert '# pass 14' in old_tap and '# fail 0' in old_tap
checks={'checked_at':stamp,'release':'2.0.0-family-beta','new_rules_network':{'passed':20,'failed':0},'original_pure_rules':{'candidate_b_passed':8,'codex_astra_passed':6},'syntax':syntax,'scene':json.loads((ROOT/'qa/scene-check.json').read_text()),'static':json.loads((ROOT/'qa/static-check.json').read_text()),'not_verified':['Four-original browser replay blocked by available tool','Physical iPad/Safari visual, audio, touch and performance','Two physical iPads on Wi-Fi','Exact provider model attribution for A/B','Actual input/output/reasoning token bills and total AUD-equivalent spend']}
dump('qa/delivery-checks.json',checks)
# Add visible per-stage footprint and original footprint tables. No language is implied by filenames.
site=ROOT/'site.mjs';text=site.read_text(encoding='utf-8')
old='</p><span class="pill ${e.status===\'partial\'?\'pending\':\'\'}">${T(\'实际 Token / 实际费用：待核验\''
new='</p><small class="subtle">${T(\'交付文本等价单位\',\'交付文字等價單位\',\'Delivered text-equivalent units\')}: ${(e.delivered_text_equivalent||0).toLocaleString()} · ${T(\'示意输出等值\',\'示意輸出等值\',\'Illustrative output equivalent\')} A$${(e.illustrative_output_aud||0).toFixed(2)}</small><br><span class="pill ${e.status===\'partial\'?\'pending\':\'\'}">${T(\'实际 Token / 实际费用：待核验\''
if old in text:text=text.replace(old,new,1)
marker='${section(T(\'可复现的量化，而不是编造账单\''
insert='''${section(T('原版制作量对照','原版製作量對照','Original-build output footprint'))}<div class="card"><p class="subtle">${T('只比较现存自定义代码与界面文字量，排除第三方引擎。A/B 模型身份和四版历史账单未核验；文件越大不等于能力越强。','只比較現存自訂程式與介面文字量，排除第三方引擎。A/B 模型身分和四版歷史帳單未核驗；檔案越大不等於能力越強。','Existing custom code/UI text only, excluding engines. A/B identities and historical bills are unverified. Larger files do not imply greater capability.')}</p>${(footprint.originals||[]).map(v=>`<div class="ledger"><b>${v.id}</b><div><div style="height:10px;background:#e1e8de;border-radius:8px"><div style="width:${Math.min(100,v.custom_text_token_equivalent/16000*100)}%;height:100%;background:#397465;border-radius:8px"></div></div><small>${v.custom_text_token_equivalent.toLocaleString()} ${T('字符估算单位','字元估算單位','character-derived units')}</small></div><span>${T('账单未知','帳單未知','Bill unknown')}</span></div>`).join('')}</div>
'''
if marker in text and 'Original-build output footprint' not in text:text=text.replace(marker,insert+marker,1)
site.write_text(text,encoding='utf-8')
# Stage grouping is explicit and mutually exclusive. Text volume includes reused custom scene code.
paths={
 '01':['archive/manifest.json'],
 '02':['data/comparison.json','docs/CLASSROOM_FEEDBACK.md','docs/PROVENANCE.md'],
 '03':[str(p.relative_to(ROOT)) for p in (ROOT/'game').iterdir() if p.is_file()],
 '04':['server.mjs','package.json','start.command','start.cmd'],
 '05':['index.html','parents.html','comparison.html','development.html','review.html','site.mjs','site.css','assets/icon.svg'],
 '06':['README.md','docs/SPEC-2.0.md','docs/ACCEPTANCE.md','docs/BUDGET.md']+[str(p.relative_to(ROOT)) for p in (ROOT/'qa').iterdir() if p.suffix in ('.mjs','.py')],
 '07':[]}
ledger=json.loads((ROOT/'data/budget.json').read_text(encoding='utf-8'))
rows=[]
for e in ledger['entries']:
    count=0
    for name in sorted(paths[e['id']]):
        f=ROOT/name
        if not f.is_file():continue
        raw=f.read_bytes();chars=len(raw.decode('utf-8'));count+=chars
        rows.append({'stage':e['id'],'path':name,'bytes':len(raw),'unicode_characters':chars,'sha256':sha(raw)})
    e['delivered_characters']=count;e['delivered_text_equivalent']=round(count/4)
    e['illustrative_output_aud']=round(count/4*50/1_000_000,4)
    e['quantity_note']='Unicode characters / 4; not measured tokens. Includes retained/reused custom code. Excludes vendor, repeated packaging, prompts, reasoning and tools.'
    e['recorded_at']=stamp
    if e['id']=='06':e['description']='20 new and 14 original pure-rule checks, all custom-source syntax, real Three.js CPU scene and static DOM references passed. Browser/device acceptance remains outstanding.'
dump('data/budget.json',ledger)
original=json.loads((ROOT/'archive/manifest.json').read_text())
footprint={'generated_at':stamp,'custom_text_token_equivalent':round(sum(x['unicode_characters'] for x in rows)/4),'method':'Unicode characters divided by four; output artifact footprint including reused custom text. Not billed model tokens or total task cost. Vendor, repeated ZIPs, original game bodies, input, reasoning and tool IO excluded.','illustrative_output_aud':round(sum(x['unicode_characters'] for x in rows)/4*50/1_000_000,4),'actual_total_task_cost_aud':None,'transport_base64_characters':71332,'transport_note':'Additional deployment envelope, not provider-token metering and not included in output footprint.','originals':[{'id':v['id'],'custom_text_token_equivalent':v['custom_text_token_equivalent'],'actual_cost_aud':None} for v in original['versions']],'files':rows}
dump('data/delivery-footprint.json',footprint)
# Ship a standalone runnable folder plus its hub and evidence. Original archives remain on the website.
zip_path=ROOT/'Monster-Island-2.0.zip'
names=['README.md','server.mjs','package.json','start.command','start.cmd','index.html','parents.html','comparison.html','development.html','review.html','site.mjs','site.css','.nojekyll']
for directory in ['game','assets','data','docs','qa']:
    names.extend(str(p.relative_to(ROOT)) for p in (ROOT/directory).rglob('*') if p.is_file() and p.suffix not in ('.log',))
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for name in sorted(set(names)):z.write(ROOT/name,'Monster-Island-2.0/'+name)
# Final bundle carries links to preserved originals online; they are not duplicated in this ZIP.
dump('data/package.json',{'file':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':sha(zip_path.read_bytes()),'contains':'New game, vendored engine, LAN server, tri-language hub, docs and QA. Original builds are separate archives on the public hub.'})
print(json.dumps({'syntax_passed':len(syntax),'new_tests_passed':20,'original_tests_passed':14,'text_equivalent':footprint['custom_text_token_equivalent'],'illustrative_output_aud':footprint['illustrative_output_aud'],'bundle_bytes':zip_path.stat().st_size,'bundle_sha256':sha(zip_path.read_bytes())},indent=2))
