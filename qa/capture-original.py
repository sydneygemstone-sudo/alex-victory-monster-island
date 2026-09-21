from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent.parent
key=sys.argv[1]
urls={'opus':'candidate-a/index.html','glm':'candidate-b/index.html','astra':'codex-astra/play.html','web':'web-6pro/index.html'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 page=b.new_page(viewport={'width':1180,'height':820});page.set_default_timeout(6000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8896/'+('playable/gpt-6-astra/play.html' if key=='astra' else 'originals/'+urls[key]),wait_until='load',timeout=15000)
 for selector in ['#start','#startBtn','#btnStart']:
  if page.locator(selector).count() and page.locator(selector).is_visible():
   page.locator(selector).click();break
 page.keyboard.down('w');page.wait_for_timeout(800);page.keyboard.up('w')
 page.screenshot(path=str(R/f'assets/original-{key}.jpg'),type='jpeg',quality=78)
 report={'key':key,'method':'Chrome 1180x820 actual original; start and 0.8s forward movement only. Not a full completion test.','errors':errors,'canvas':page.locator('canvas').count()}
 (R/f'qa/v21/original-{key}.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report),flush=True);b.close()
