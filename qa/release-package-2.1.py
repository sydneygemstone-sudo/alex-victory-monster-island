"""Build a source-complete 2.1 package only after the recorded checks pass."""
from pathlib import Path
import json,hashlib,shutil,subprocess,zipfile,datetime,re
R=Path(__file__).resolve().parent.parent
read=lambda p:json.loads((R/p).read_text())
write=lambda p,x:(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
render=read('qa/v21/report.json');hub1=read('qa/v21/hub-first.json');hub2=read('qa/v21/hub-second.json')
assert all(x['passed'] for x in render['checks']) and not render['errors']
assert hub1['passed'] and hub2['passed']
originals={k:read(f'qa/v21/original-{k}.json') for k in ['web','astra','opus','glm']}
assert all(not x['errors'] and x['canvas']==1 for x in originals.values())
node='/opt/homebrew/bin/node'
tests=[str(R/'qa'/n) for n in ['core.test.mjs','network.test.mjs','v21-mechanics.test.mjs']]
test=subprocess.run([node,'--test',*tests],capture_output=True,text=True,timeout=30)
(R/'qa/v21/rules.tap').write_text(test.stdout+test.stderr);assert test.returncode==0,test.stdout
assert '# pass 29' in test.stdout and '# fail 0' in test.stdout
syntax=[]
for f in [*list((R/'game').glob('*.mjs')),R/'server.mjs',R/'site-v21.mjs']:
 subprocess.run([node,'--check',str(f)],check=True,capture_output=True);syntax.append(str(f.relative_to(R)))
subprocess.run(['git','-C',str(R),'diff','--exit-code','--','originals','archive'],check=True,capture_output=True)
for name in ['game.js','combat.js']:
 assert sha(R/'originals/codex-astra'/name)==sha(R/'playable/gpt-6-astra'/name)
for f in (R/'qa/v21').glob('*.jpg'):
 if not f.name.startswith('hub-'):shutil.copy2(f,R/'assets/v21'/f.name)
p=R/'package.json';d=json.loads(p.read_text());d['version']='2.1.0';p.write_text(json.dumps(d,indent=2)+'\n')
p=R/'site-v21.mjs';s=p.read_text();old='<p class="fine">${A(m.engineering)}</p>'
new=old+'''${m.key==='astra'?`<p class="fine">${T('发布兼容说明：此试玩入口仅修正原稿 HTML 的资源路径，游戏与战斗代码未改。','發布相容說明：此試玩入口僅修正原稿 HTML 的資源路徑，遊戲與戰鬥程式未改。','Compatibility mirror: only HTML asset paths were fixed. Original game and combat code are unchanged.')}</p>`:''}'''
if new not in s:
 assert old in s;s=s.replace(old,new,1);p.write_text(s)
subprocess.run([node,'--check',str(p)],check=True,capture_output=True)
files=['game/core.mjs','game/view.mjs','game/story.mjs','game/polish.mjs','game/client.mjs','game/audio.mjs','game/game.css','game/i18n.mjs','game/index.html','server.mjs','site-v21.mjs','site-v21.css','index.html','data/costs-2.1.json','data/comparison-2.1.json']
receipt={'release':'2.1.0-beta.1','generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rules':{'passed':29,'failed':0,'method':'Node authoritative rules plus independent HTTP/SSE clients'},'browser':render,'hub':{'passed':True,'pages':8,'languages':['zh-Hans','zh-Hant','en'],'reports':[hub1,hub2]},'original_startups':originals,'originals_unchanged':True,'astra_mirror':'HTML path-only compatibility adaptation; game.js/combat.js byte-identical','syntax_passed':syntax,'unverified':['Physical iPad and Safari','Human listening evaluation on tablet speakers','Public internet co-op backend not deployed','Web request token billing unavailable'],'sha256':{f:sha(R/f) for f in files}}
write('data/acceptance-2.1.json',receipt)
write('data/release-2.1.json',{'release':receipt['release'],'date':'2026-09-22','entry':'game/','hub':'index.html','acceptance':'data/acceptance-2.1.json','costs':'data/costs-2.1.json','notes':'docs/RELEASE-2.1.md','package':'Monster-Island-2.1.zip'})
rootfiles=['README.md','package.json','server.mjs','site-v21.css','site-v21.mjs','start.cmd','start.command','.nojekyll',*['index.html','comparison.html','costs.html','cinematic.html','development.html','parents.html','play-guide.html','review.html']]
paths=[R/p for p in rootfiles if (R/p).is_file()]
for folder in ['assets','game','originals','playable','archive','docs','data']:
 paths.extend(p for p in (R/folder).rglob('*') if p.is_file() and not p.is_symlink() and not any(part.startswith('.') for part in p.relative_to(R).parts))
paths.extend(R/'qa'/f for f in ['core.test.mjs','network.test.mjs','v21-mechanics.test.mjs','bake-roar.py','render-2.1.py','hub-check.py','capture-original.py'])
paths.extend(p for p in (R/'qa/v21').glob('*') if p.suffix in ['.json','.tap'])
paths=sorted(set(p for p in paths if str(p.relative_to(R))!='data/package.json'))
paths=[p for p in paths if str(p.relative_to(R)) not in ['data/package-2.1.json']]
for p in paths:
 if p.suffix in ['.mjs','.js','.json','.md','.py'] and 'vendor' not in p.parts and 'node_modules' not in p.parts:
  text=p.read_text(errors='replace')
  assert not re.search(r'(?:apikey_[0-9a-f]{24,}|ghp_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{25,})',text),str(p)
zip_path=R/'Monster-Island-2.1.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for p in paths:z.write(p,p.relative_to(R))
 z.writestr('PACKAGE-MANIFEST.json',json.dumps({'release':receipt['release'],'files':{str(p.relative_to(R)):sha(p) for p in paths}},indent=2))
with zipfile.ZipFile(zip_path) as z:assert z.testzip() is None
meta={'release':receipt['release'],'file':zip_path.name,'bytes':zip_path.stat().st_size,'sha256':sha(zip_path),'files':len(paths),'contents':'2.1 game, trilingual hub, four unchanged originals and archives, path-compatible Astra mirror, LAN server, token ledger, retrospective and regression evidence','excludes':'Private transcripts, session receipts, credentials, git metadata and development migration scripts'}
write('data/package-2.1.json',meta)
print(json.dumps({'package':meta,'rules':29,'browser':len(render['checks']),'hub_pages':8,'syntax':len(syntax)},indent=2),flush=True)
