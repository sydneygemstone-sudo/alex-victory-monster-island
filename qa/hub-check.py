from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent.parent
mode=sys.argv[1] if len(sys.argv)>1 else 'first'
routes=['index.html','comparison.html','costs.html','cinematic.html'] if mode=='first' else ['parents.html','development.html','review.html','play-guide.html']
checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 page=b.new_page(viewport={'width':1180,'height':820});page.set_default_timeout(20000);page.emulate_media(reduced_motion='reduce')
 page.on('pageerror',lambda e:errors.append(str(e)))
 for name in routes:
  page.goto('http://127.0.0.1:8896/'+name+'?lang=zh-Hans',wait_until='load',timeout=12000);page.wait_for_selector('main h1')
  page.evaluate('document.querySelectorAll("img").forEach(i=>i.loading="eager")')
  page.wait_for_function('Array.from(document.images).every(i=>i.complete)')
  missing=page.evaluate('Array.from(document.images).filter(i=>!i.naturalWidth).map(i=>i.getAttribute("src"))')
  checks.append({'page':name,'missingImages':missing,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth+2')})
  for lang in ['zh-Hant','en','zh-Hans']:
   page.select_option('#language',lang)
   checks.append({'page':name,'language':lang,'h1':page.locator('main h1').inner_text(),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth+2')})
  if name=='comparison.html':
   page.click('[data-metric=feel]');assert page.locator('#bars strong').first.inner_text()=='8.2';page.click('[data-metric=art]')
  if name=='review.html':
   page.fill('#device','TEST DEVICE');page.fill('#best','Visible projectile');page.click('#makeReview');assert 'Visible projectile' in page.locator('#report').input_value()
  page.evaluate('scrollTo(0,0)');page.screenshot(path=str(R/'qa/v21'/('hub-'+name+'.jpg')),type='jpeg',quality=75,timeout=25000,animations='disabled')
  if name=='index.html':
   assert page.locator('.cards .card').count()==9
   assert page.locator('.budgetstrip').bounding_box()['y']<120
   page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(R/'qa/v21/hub-mobile.jpg'),type='jpeg',quality=70,timeout=25000,animations='disabled')
   checks.append({'page':name,'mobileOverflow':page.evaluate('document.documentElement.scrollWidth>innerWidth+2')})
   page.set_viewport_size({'width':1180,'height':820})
  print('CHECKED',name,missing,flush=True)
 b.close()
report={'checks':checks,'errors':errors,'passed':not errors and all(not c.get('missingImages') and not c.get('overflow') and not c.get('mobileOverflow') for c in checks)}
(R/f'qa/v21/hub-{mode}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('RESULT',report['passed'],flush=True)
