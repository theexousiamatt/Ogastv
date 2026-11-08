import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = (process.env.OGASTV_URL || 'https://ogastvafrica.ng').replace(/\/$/,'');
const out = path.resolve('live-audit');
await mkdir(out,{recursive:true});
const browsers = [
  {name:'desktop',width:1440,height:900,isMobile:false,deviceScaleFactor:1},
  {name:'mobile',width:390,height:844,isMobile:true,deviceScaleFactor:1,hasTouch:true},
  {name:'small-mobile',width:320,height:700,isMobile:true,deviceScaleFactor:1,hasTouch:true},
];
const errors=[];
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  for(const viewport of browsers){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile,hasTouch:Boolean(viewport.hasTouch),deviceScaleFactor:viewport.deviceScaleFactor,locale:'en-NG',colorScheme:'light'});
    const page=await context.newPage();
    const consoleErrors=[];
    page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,300));});
    page.on('pageerror',err=>consoleErrors.push('Runtime exception: '+err.message.slice(0,300)));
    for(const target of ['/','/latest','/watch','/about','/section/lagos-watch','/reading-list']){
      const response=await page.goto(origin+target,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(600);
      const state=await page.evaluate(()=>{
        const root=document.documentElement;
        const body=document.body;
        const logo=document.querySelector('.ogas-public-brand__logo');
        const h1=document.querySelector('main h1')?.textContent?.trim()||'';
        const width=root.scrollWidth;
        const viewportWidth=window.innerWidth;
        return {
          title:document.title,h1,
          viewportWidth,scrollWidth:width,bodyWidth:body.scrollWidth,
          images:[...document.images].filter(i=>i.getBoundingClientRect().top<window.innerHeight*2)
            .map(i=>({src:i.currentSrc||i.src,broken:i.complete&&i.naturalWidth===0})).slice(0,35),
          logo:{exists:!!logo,loaded:!!logo&&logo.complete&&logo.naturalWidth>0,
            width:logo?.getBoundingClientRect().width||0},
          mobileMenu:!!document.querySelector('.ogas-public-mobile-menu'),
          navVisible:!!document.querySelector('.ogas-public-nav--sections')&&
            getComputedStyle(document.querySelector('.ogas-public-nav--sections')).display!=='none',
        };
      });
      const status=response?.status()||0;
      const badImages=state.images.filter(i=>i.broken);
      const overflow=state.scrollWidth-state.viewportWidth;
      const test={viewport:viewport.name,path:target,status,...state,badImages,overflow,consoleErrors:[...consoleErrors]};
      results.push(test);
      if(status!==200)errors.push(viewport.name+' '+target+' HTTP '+status);
      if(!state.logo.loaded)errors.push(viewport.name+' '+target+' official logo not loaded');
      if(overflow>5)errors.push(viewport.name+' '+target+' horizontal overflow '+overflow+'px');
      if(badImages.length)errors.push(viewport.name+' '+target+' broken image(s): '+badImages.map(i=>i.src).slice(0,3).join(' '));
      if(viewport.name!=='desktop'&&!state.mobileMenu)errors.push(viewport.name+' mobile category menu missing');
      if(consoleErrors.length)errors.push(viewport.name+' '+target+' browser errors: '+consoleErrors.join(' | ').slice(0,550));
      const file=target==='/'?'home':target.slice(1).replaceAll('/','-');
      await page.screenshot({path:path.join(out,viewport.name+'-'+file+'.png'),fullPage:true,animations:'disabled'});
      console.log(JSON.stringify({viewport:viewport.name,path:target,status,overflow,h1:state.h1,logo:state.logo,
        broken:badImages.length,jsErrors:consoleErrors.length}));
      consoleErrors.length=0;
    }
    // Include an actual published story, not just static/archival routes.
    await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
    const firstStory=await page.locator('main a[href^="/stories/"]').first().getAttribute('href');
    if(!firstStory){
      errors.push(viewport.name+' public homepage has no linked published article');
    }else{
      consoleErrors.length=0;
      const response=await page.goto(new URL(firstStory,origin).toString(),{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(650);
      const inspection=await page.evaluate(()=>({
        h1:document.querySelector('main h1')?.textContent?.trim()||'',
        width:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        readingTime:!!document.querySelector('.ogas-reading__meta'),
        saveAction:!!document.querySelector('.ogas-reading__save-button'),
        related:!!document.querySelector('.ogas-reading__related'),
        mainImage:!document.querySelector('.ogas-reading__cover')||
          (document.querySelector('.ogas-reading__cover').complete&&document.querySelector('.ogas-reading__cover').naturalWidth>0),
      }));
      results.push({viewport:viewport.name,path:firstStory,status:response?.status()||0,article:inspection,consoleErrors:[...consoleErrors]});
      if(response?.status()!==200)errors.push(viewport.name+' article HTTP '+response?.status());
      if(inspection.width-inspection.viewport>5)errors.push(viewport.name+' article horizontal overflow');
      if(!inspection.readingTime||!inspection.saveAction||!inspection.related)errors.push(viewport.name+' article reading features missing');
      if(!inspection.mainImage)errors.push(viewport.name+' article cover image broken');
      if(consoleErrors.length)errors.push(viewport.name+' article browser errors: '+consoleErrors.join(' | ').slice(0,400));
      await page.screenshot({path:path.join(out,viewport.name+'-story.png'),fullPage:true,animations:'disabled'});
      consoleErrors.length=0;
    }
    if(viewport.name==='mobile'){
      await page.goto(origin+'/');
      const menu=page.locator('.ogas-public-mobile-menu > summary');
      if(await menu.count()){
        await menu.click();
        const visible=await page.locator('.ogas-public-mobile-menu__panel').isVisible();
        if(!visible)errors.push('Mobile category disclosure did not open');
      }
    }
    await context.close();
  }
}finally{await browser.close();}
await writeFile(path.join(out,'results.json'),JSON.stringify({origin,results,errors},null,2));
if(errors.length){console.error('LIVE AUDIT FAILED:',errors.join('\n'));process.exitCode=1;}
else console.log('LIVE AUDIT PASSED: desktop, mobile and small mobile routes, logo, navigation and overflow');
