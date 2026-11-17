const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:5173/?test',{waitUntil:'domcontentloaded'});
  await page.locator('#agent-select').waitFor();
  assert.equal(await page.locator('#agent-select option').count(),8);
  const menuLayouts=[];
  for(const [width,height]of[[1440,900],[390,844],[320,568],[740,390]]){
   await page.setViewportSize({width,height});
   for(const species of ['curupira','vampire','mummy','construct','fairy']){
    await page.locator('#agent-select').selectOption(species);
    assert.equal(await page.locator(`.selected[data-action="agent:${species}"]`).count(),1);
    const play=await page.locator('[data-action="start"]').boundingBox(),select=await page.locator('#agent-select').boundingBox();
    assert.ok(play.y>=0&&play.y+play.height<=height,`${species} play ${width}x${height}`);
    assert.ok(select.x>=0&&select.x+select.width<=width,`${species} select fits`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    menuLayouts.push({species,width,height,play});
   }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#element-select').selectOption('water');
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.evaluate(()=>window.__game.player.element),'water');
  assert.equal(await page.locator('.skill').count(),2);
  const checks=await page.evaluate(async()=>{
   const g=window.__game,{REWARDS,makeChoice,applyChoice}=await import('/src/progression.ts'),{canMove,distance}=await import('/src/logic.ts');
   const out={};
   const reset=(species)=>{g.menu();g.selectSpecies(species);g.start();g.fieldItems.clear();g.spawnClock=999;g.attackClock=999;g.invuln=999};
   const enemy=(x=0,z=7,kind=0)=>{g.spawn(kind,{x,z});const e=g.enemies.at(-1);if(!e)throw Error('enemy fixture');e.hp=e.maxHp=10000;e.speed=0;e.cooldown=999;return e};
   const crowd=()=>[enemy(),enemy(1.5,6.5),enemy(-1.5,6.5)];
   const learn=(key)=>{if(key==='r'){g.player.level=6;g.player.skills.q=g.player.skills.e=1;g.cooldowns.q=g.cooldowns.e=999}const r=REWARDS.find(r=>r.species===g.player.species&&r.skill===key);applyChoice(g.player,makeChoice(r,g.player,()=>0))};
   const step=(seconds)=>{for(let t=0;t<seconds;t+=1/60)g.update(1/60)};
   for(const species of ['curupira','vampire','mummy','construct','fairy']){
    reset(species);const e=enemy(0,species==='fairy'?9:6);g.attackClock=0;step(1);out[species+'Basic']=e.hp<10000;
   }
   reset('curupira');learn('q');let e=enemy(0,10);step(.6);out.fireball=e.hp<10000&&g.speciesCombat.burns.has(e);
   reset('curupira');learn('e');crowd();g.update(.016);out.primateFury=g.player.empowerTime>0&&g.player.empowerArmor>0;
   reset('curupira');learn('trap');e=enemy();step(.7);out.fireAura=e.hp<10000&&g.speciesCombat.areas.some(a=>a.kind==='flames');
   reset('curupira');learn('r');e=enemy();g.update(.016);out.selva=e.z>7&&g.speciesCombat.revealed(e);
   reset('vampire');learn('q');g.player.hp=50;e=enemy(0,6);e.hp=2;g.update(.016);out.drainNoOverkill=g.player.hp>50&&g.player.hp<51;
   reset('vampire');learn('e');e=enemy();e.windup=.5;g.update(.016);out.hypnosis=e.disoriented>0&&e.windup===0&&g.player.hp===96;
   reset('vampire');learn('e');g.player.hp=33;e=enemy();g.update(.016);out.bloodReserve=g.player.hp===33&&g.cooldowns.e===0;
   reset('vampire');learn('mobility');crowd();g.update(.016);g.speciesCombat.render();out.bat=g.speciesCombat.batTime>0&&g.player.mobilityTime>0&&!g.hero.visible;
   reset('vampire');learn('trap');e=enemy();e.hp-=1;g.update(.016);out.tracking=g.speciesCombat.priorityTarget()===e&&g.speciesCombat.revealed(e);
   reset('vampire');learn('mist');crowd();const specter=enemy(2,7,1);step(.1);out.mist=g.speciesCombat.areas.some(a=>a.kind==='mist')&&g.enemies.some(e=>e.kind===0&&e.disoriented>0)&&specter.disoriented===0;
   reset('vampire');learn('borrow');e=enemy();g.damage(e,20000);enemy();g.update(.016);out.borrow=g.speciesCombat.copyTime>0&&g.speciesCombat.bonusSpeed()>1;
   reset('vampire');learn('r');const victims=crowd();for(const v of victims)v.hp=1;g.update(.016);step(.3);out.bloodServants=g.speciesCombat.servants.length===3&&g.speciesCombat.bleeds.size===0;
   const life=g.speciesCombat.servants[0].life;g.pause();g.update(2);out.pauseNewEffects=g.speciesCombat.servants[0].life===life;g.resume();step(9);out.servantsExpire=g.speciesCombat.servants.length===0;
   reset('mummy');learn('q');e=enemy(0,9);g.update(.016);out.bandagePull=e.z<9&&e.rooted>0;
   reset('mummy');learn('e');e=enemy();g.update(.016);g.invuln=0;const hp=g.player.hp;g.hurt(20,'poison');out.poisonBreath=e.poisonTime>0&&g.player.hp===hp;
   reset('mummy');learn('mobility');crowd();const before={x:g.player.x,z:g.player.z};g.update(.016);out.spiderSafe=distance(before,g.player)>1&&canMove(g.player,g.world.obstacles)&&g.cooldowns.mobility>0;
   out.plagues=[];
   for(let index=0;index<6;index++){
    reset('mummy');learn('r');e=enemy();g.cooldowns.r=999;g.speciesCombat.plague(index,1.2);
    if(index===3)step(1);
    out.plagues.push(index===0?e.disoriented>0:index===1?e.rooted>0:index===2?e.petrified>0:index===3?e.hp<10000:index===4?e.poisonTime>0:e.hp<10000);
   }
   reset('construct');learn('q');e=enemy(0,10);step(.7);out.moduleGun=e.hp<10000&&g.cooldowns.q>0;
   reset('construct');learn('e');enemy();g.update(.016);g.invuln=0;const h=g.player.hp;g.hurt(20);out.armorModule=h-g.player.hp<20;
   reset('construct');learn('defense');g.player.hp=40;g.update(.016);out.repair=g.player.hp>40&&g.cooldowns.defense>0&&g.player.essence<100;
   reset('construct');learn('mobility');e=crowd()[0];g.update(.016);out.overload=e.hp<10000&&g.cooldowns.mobility>0;
   reset('construct');learn('r');g.player.hp=30;e=crowd()[0];g.update(.016);out.reconstructionWarning=g.speciesCombat.reconstruction>0&&e.hp===10000;
   g.invuln=0;g.hurt(999);out.coreProtected=g.player.hp===30&&g.phase==='playing';step(1.3);out.reconstruct=g.player.hp>=g.player.maxHp*.3&&e.hp<10000&&g.phase==='playing';
   out.elements=[];
   for(const element of ['fire','water','earth','air']){
    reset('fairy');g.player.element=element;e=enemy(0,9);g.attackClock=0;step(.9);
    out.elements.push(element==='fire'?g.speciesCombat.burns.has(e):element==='water'?e.slow>0:element==='earth'?e.hp<=9982:e.z>9);
   }
   reset('fairy');learn('q');e=enemy();g.update(.016);out.pixieDust=e.disoriented>0;
   reset('fairy');learn('e');e=enemy();g.update(.016);out.noWastedInterrupt=g.cooldowns.e===0;e.windup=1;g.update(.016);out.interrupt=e.windup===0&&g.cooldowns.e>0;
   reset('fairy');learn('defense');g.player.essence=0;e=enemy();step(4);out.noCombatMeditation=g.cooldowns.defense===0;g.damage(e,20000);step(3.1);out.meditation=g.cooldowns.defense>0&&g.player.essence>30;
   reset('fairy');learn('r');g.player.hp=40;e=enemy();g.update(.016);out.spring=g.player.hp>40&&e.rooted>0;step(2.1);out.summer=e.hp<10000&&g.player.empowerTime>0;step(2);out.autumn=e.slow>0;step(2);out.winter=e.petrified>0;step(2);out.seasonsEnd=!g.speciesCombat.season;
   reset('vampire');learn('mist');crowd();g.update(.016);g.menu();out.menuClears=g.speciesCombat.areas.length===0&&g.speciesCombat.servants.length===0&&g.speciesCombat.bleeds.size===0;
   reset('construct');g.onUI();out.energyLabel=document.querySelector('#eptext').getAttribute('aria-label')==='Energia';
   g.menu();g.selectSpecies('vampire');g.start();g.player.level=10;
   for(const key of ['q','e','mobility','trap','mist','borrow','r'])learn(key);
   for(const key of Object.keys(g.cooldowns))g.cooldowns[key]=0;g.pause();g.resume();g.onUI();
   out.learnedOnly=document.querySelectorAll('.skill').length===9;
   return out;
  });
  console.log(checks);
  for(const[key,value]of Object.entries(checks))assert.ok(Array.isArray(value)?value.every(Boolean):value,key);
  await page.setViewportSize({width:390,height:844});
  const skills=await page.locator('.skills').boundingBox(),xp=await page.locator('.xp-panel').boundingBox();
  assert.ok(skills.y>=100&&skills.y+skills.height<xp.y);
  await page.screenshot({path:'reports/previews/vampire-mobile.png'});
  await page.setViewportSize({width:320,height:568});
  await page.locator('#skill-2').focus();
  assert.ok(await page.locator('.skills').evaluate(el=>el.scrollTop>0),'full vampire kit scrolls on a short mobile screen');
  const lastSkill=await page.locator('#skill-2').boundingBox(),tray=await page.locator('.skills').boundingBox();
  assert.ok(lastSkill.y>=tray.y&&lastSkill.y+lastSkill.height<=tray.y+tray.height+1);
  await page.locator('.skills').evaluate(el=>{el.scrollTop=0});
  await page.evaluate(()=>{window.__game.menu();window.__game.selectSpecies('construct')});
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'reports/previews/eight-agents-menu.png'});
  await page.locator('[data-action="collection"]').click();assert.equal(await page.locator('.collection-grid article').count(),8);
  assert.deepEqual(errors,[]);
  fs.writeFileSync('reports/new-species-validation.json',JSON.stringify({checks,menuLayouts,errors},null,2));
  console.log('Eight-agent selection, all new automatic powers, elements, calamities, safety and mobile: passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
