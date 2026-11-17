const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],agents=[];page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  const url=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
  await page.goto(url+'/?test',{waitUntil:'domcontentloaded'});
  await page.locator('#agent-select').waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__game),'undefined');
  for(const id of ['curupira','vampire','mummy','construct','fairy']){
   await page.locator('#agent-select').selectOption(id);
   if(id==='fairy')await page.locator('#element-select').selectOption('earth');
   await page.locator('[data-action="start"]').click();
   assert.equal(await page.locator('.skill').count(),2);
   const basic=await page.locator('.basic-attack').getAttribute('aria-label');
   if(id==='construct')assert.equal(await page.locator('#eptext').getAttribute('aria-label'),'Energia');
   if(id==='fairy')assert.match(await page.locator('#claw-stats').innerText(),/18\.0/);
   await page.locator('[data-action="pause"]').click();assert.ok(await page.locator('.loadout').isVisible());
   agents.push({id,basic,initialIcons:2,pause:true});await page.locator('[data-action="menu"]').click();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('reports/production-agents.json',JSON.stringify({localPreview:url,debugHookAbsent:true,agents,errors},null,2));
  console.log('Production preview: five new playable agents, elements, Energia, pause, no debug hook or console errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
