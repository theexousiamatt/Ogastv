import { chromium } from 'playwright';

// Run this against a deployed preview before production cutover.
// Example: OGASTV_URL=https://preview.example.com node scripts/qa-navigation.mjs
const origin=(process.env.OGASTV_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const entries=[
  ['Home','/'],
  ['Latest','/latest'],
  ['Lagos Watch','/section/lagos-watch'],
  ['Government & Policies','/section/government-policies'],
  ['Grassroots Voices','/section/grassroots-voices'],
  ['Business & Investment','/section/business-investment'],
  ['Personalities','/section/personalities'],
  ['OgasTV Studio','/watch'],
  ['Live','/live'],
];
const deviceModes=[
  {name:'desktop',viewport:{width:1440,height:900},isMobile:false},
  {name:'laptop',viewport:{width:1024,height:768},isMobile:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true},
  {name:'small-mobile',viewport:{width:320,height:720},isMobile:true},
];
const failures=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  for(const mode of deviceModes){
    const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.isMobile,hasTouch:mode.isMobile});
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    for(const [label,path] of entries){
      try {
        await page.goto(origin,{waitUntil:'domcontentloaded',timeout:45000});
        let link;
        if(mode.isMobile){
          if(label==='Live'){
            link=page.locator('.ogas-public-mobile-navigation__live');
          }else{
            const menu=page.locator('.ogas-public-mobile-menu');
            await menu.locator('summary').click();
            if(!await menu.evaluate(element=>element.open))throw Error('category menu did not open');
            link=menu.locator('a[href="'+path+'"]');
          }
        }else{
          link=path==='/live'?page.locator('.ogas-live-shortcut'):
            page.locator('.ogas-public-nav--sections a[href="'+path+'"]');
        }
        if(await link.count()!==1)throw Error(label+' menu link missing or duplicated');
        await link.click();
        await page.waitForURL(url=>url.pathname===path,{timeout:15000});
        const status=await page.locator('h1').first().textContent();
        if(!status?.trim())throw Error('No page heading rendered for '+path);
        if(mode.isMobile&&label!=='Live'&&await page.locator('.ogas-public-mobile-menu').evaluate(element=>element.open)){
          throw Error('Mobile category menu did not close after navigation');
        }
        console.log('OK '+mode.name+' '+label+' '+path);
      }catch(error){
        failures.push(mode.name+' '+label+' '+path+': '+String(error));
      }
    }
    await page.close();await context.close();
  }
}finally{await browser.close()}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log('Passed '+deviceModes.length*entries.length+' navigation checks.');
