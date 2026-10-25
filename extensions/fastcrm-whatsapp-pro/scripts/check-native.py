import asyncio,json,tempfile,base64
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/tmp/browser/whatsapp-pro-native')
ROOT.mkdir(parents=True, exist_ok=True)
DIST=str(Path(__file__).resolve().parents[1] / 'dist' / 'fastcrm-whatsapp-pro')
async def main():
 async with async_playwright() as p:
  with tempfile.TemporaryDirectory(prefix='fastcrm-native-') as profile:
   context=await p.chromium.launch_persistent_context(profile,channel='chromium',headless=True,viewport={'width':1280,'height':1800},args=[f'--disable-extensions-except={DIST}',f'--load-extension={DIST}'])
   worker=context.service_workers[0] if context.service_workers else await context.wait_for_event('serviceworker',timeout=15000)
   print('worker',worker.url)
   extension_id=worker.url.split('/')[2]
   page=await context.new_page()
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   # Avoid loading customer data or production services. Navigation is observed, then aborted.
   await context.route('https://fastcrm.metodopare.ai/**',lambda route:route.abort())
   await context.route('https://web.whatsapp.com/**',lambda route:route.abort())
   await page.goto(f'chrome-extension://{extension_id}/sidepanel.html')
   await page.wait_for_function('typeof chrome.runtime?.getManifest === "function"')
   manifest=await page.evaluate('chrome.runtime.getManifest()')
   print('native_manifest',json.dumps({'version':manifest['version'],'permissions':manifest['permissions']}))
   assert manifest['version']=='0.3.1'
   await page.get_by_role('tab',name='Contacto',exact=True).click()
   await page.get_by_label('Número de telefone').fill('912345678')
   await page.get_by_role('button',name='Validar',exact=True).click()
   assert await page.locator('#phone-normalized').inner_text()=='+351912345678'
   print('native_phone_normalized OK')
   await page.screenshot(path=str(ROOT/'desktop.png'))
   await page.get_by_role('button',name='Copiar número',exact=True).click()
   print('native_clipboard_feedback',await page.locator('#phone-feedback').inner_text())
   await page.get_by_role('button',name='Copiar e pesquisar no FastCRM',exact=True).click()
   await page.wait_for_timeout(1000)
   print('native_copy_lookup_feedback',await page.locator('#phone-feedback').inner_text())
   print('native_pages',json.dumps([q.url for q in context.pages]))
   await page.get_by_label('Número de telefone').fill('812345678')
   await page.get_by_role('button',name='Validar',exact=True).click()
   assert not await page.locator('#phone-actions').is_visible()
   print('native_invalid_phone',await page.locator('#phone-feedback').inner_text())
   # Real runtime message, not a mocked Chrome API.
   response=await page.evaluate('chrome.runtime.sendMessage({type:"OPEN_TAB",url:"https://evil.example/dashboard"})')
   assert response['ok'] is False
   print('native_disallowed_url',json.dumps(response,ensure_ascii=False))
   await page.get_by_role('tab',name='Início',exact=True).click()
   await page.get_by_role('button',name='Pesquisar no FastCRM',exact=True).click()
   await page.wait_for_timeout(300)
   print('tab_document_feedback',await page.locator('#nav-feedback').inner_text())
   window_id=await page.evaluate('(async () => (await chrome.windows.getCurrent()).id)()')
   await page.get_by_role('button',name='Pesquisar no FastCRM',exact=True).evaluate('(el, windowId) => el.addEventListener("click", () => chrome.sidePanel.open({windowId}), {once:true})',window_id)
   await page.get_by_role('button',name='Pesquisar no FastCRM',exact=True).click()
   await page.wait_for_timeout(500)
   cdp=await context.new_cdp_session(page)
   targets=await cdp.send('Target.getTargets')
   print('sidepanel_targets',json.dumps(targets))
   panel_target=next(t for t in targets['targetInfos'] if t['url'].endswith('/sidepanel.html') and not t['attached'])
   session=(await cdp.send('Target.attachToTarget',{'targetId':panel_target['targetId'],'flatten':False}))['sessionId']
   counter=0
   async def native_eval(expression):
    nonlocal counter
    counter+=1
    future=asyncio.get_running_loop().create_future()
    def receive(event):
     data=json.loads(event['message'])
     if event['sessionId']==session and data.get('id')==counter and not future.done(): future.set_result(data)
    cdp.on('Target.receivedMessageFromTarget',receive)
    await cdp.send('Target.sendMessageToTarget',{'sessionId':session,'message':json.dumps({'id':counter,'method':'Runtime.evaluate','params':{'expression':expression,'awaitPromise':True,'returnByValue':True,'userGesture':True}})})
    result=await asyncio.wait_for(future,10)
    cdp.remove_listener('Target.receivedMessageFromTarget',receive)
    if result.get('result',{}).get('exceptionDetails'): raise RuntimeError(str(result))
    return result.get('result',{}).get('result',{}).get('value')
   print('real_panel_manifest',await native_eval('chrome.runtime.getManifest().version'))
   await native_eval('document.getElementById("tab-contacto").click(); document.getElementById("input-phone").value="912345678"; document.getElementById("phone-form").requestSubmit()')
   assert await native_eval('document.getElementById("phone-normalized").textContent')=='+351912345678'
   await native_eval('document.getElementById("btn-copy-lookup").click()')
   await page.wait_for_timeout(500)
   feedback=await native_eval('document.getElementById("phone-feedback").textContent')
   print('real_panel_lookup_feedback',feedback)
   print('real_panel_tabs',json.dumps([q.url for q in context.pages]))
   response=await native_eval('chrome.runtime.sendMessage({type:"OPEN_TAB",url:"https://fastcrm.metodopare.ai/dashboard/whatsapp-pro/lookup"})')
   print('real_panel_direct_runtime_open',json.dumps(response,ensure_ascii=False))
   assert response['ok'] is True
   response=await native_eval('chrome.runtime.sendMessage({type:"OPEN_TAB",url:"https://evil.example/dashboard"})')
   assert response['ok'] is False and response['error']=='Destino fora da lista permitida'
   print('real_panel_url_rejected',json.dumps(response,ensure_ascii=False))
   async def capture_native():
    future=asyncio.get_running_loop().create_future()
    def receive(event):
     data=json.loads(event['message'])
     if event['sessionId']==session and data.get('id')==999 and not future.done(): future.set_result(data)
    cdp.on('Target.receivedMessageFromTarget',receive)
    await cdp.send('Target.sendMessageToTarget',{'sessionId':session,'message':json.dumps({'id':999,'method':'Page.captureScreenshot','params':{'format':'png'}})})
    data=await asyncio.wait_for(future,10)
    cdp.remove_listener('Target.receivedMessageFromTarget',receive)
    (ROOT/'native-panel.png').write_bytes(base64.b64decode(data['result']['data']))
   await capture_native()
   await page.set_viewport_size({'width':360,'height':800})
   await page.get_by_role('tab',name='Contacto',exact=True).click()
   await page.screenshot(path=str(ROOT/'mobile.png'))
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   print('native_mobile_no_overflow OK')
   print('page_errors',json.dumps(errors))
   assert not errors
   await context.close()
asyncio.run(main())
