import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://ogastvafrica.ng';
const routes = ['/', '/latest', '/section/lagos-watch', '/watch', '/about', '/contact', '/reading-list'];
const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, deviceScaleFactor: 1 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 },
  { name: 'small-mobile', viewport: { width: 320, height: 720 }, isMobile: true, deviceScaleFactor: 2 },
];
const results = [];
const issues = [];
await fs.mkdir('qa-live-screenshots', { recursive: true });
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
try {
  // Verify a real published article as part of the reader journey.
  const discovery = await browser.newPage();
  try {
    await discovery.goto(ORIGIN+'/latest',{waitUntil:'domcontentloaded',timeout:45000});
    const storyUrl=await discovery.locator('a[href^="/stories/"]').first().getAttribute('href');
    if(storyUrl&&storyUrl.startsWith('/stories/'))routes.push(storyUrl);
    else issues.push('No published article link found on latest-news archive');
  } finally {await discovery.close();}
  for (const mode of viewports) {
    const context = await browser.newContext({
      viewport:mode.viewport, isMobile:mode.isMobile, hasTouch:mode.isMobile,
      deviceScaleFactor:mode.deviceScaleFactor, ignoreHTTPSErrors:false,
      reducedMotion:'reduce',
    });
    for (const route of routes) {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror',error=>pageErrors.push(error.message));
      let status = 0;
      try {
        const response = await page.goto(ORIGIN+route,{waitUntil:'domcontentloaded',timeout:45000});
        status = response?.status() || 0;
        // Trigger lazy images as a real reader scrolls the article/archive.
        await page.evaluate(async () => {
          const step = Math.max(480, Math.round(innerHeight * .85));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise(resolve => setTimeout(resolve, 45));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(800);
        const state = await page.evaluate(() => ({
          title:document.title,
          width:innerWidth,
          scrollWidth:document.documentElement.scrollWidth,
          missingImages:[...document.images].filter(img=>{
            const box=img.getBoundingClientRect();
            return box.width>0 && box.height>0 && img.complete && img.naturalWidth===0;
          }).slice(0,10).map(img=>img.src),
          headings:[...document.querySelectorAll('h1')].map(el=>el.textContent?.trim()).slice(0,3),
        }));
        const name=(route==='/'?'home':route.replaceAll('/','-').replace(/^-/,''))+'-'+mode.name;
        await page.screenshot({path:path.join('qa-live-screenshots',name+'.png'),fullPage:true,timeout:30000});
        results.push({route,device:mode.name,status,...state,pageErrors});
        if(status!==200)issues.push(name+': HTTP '+status);
        if(state.scrollWidth>state.width+3)issues.push(name+': horizontal overflow '+state.scrollWidth+'/'+state.width);
        if(state.missingImages.length)issues.push(name+': '+state.missingImages.length+' broken visible image(s)');
        if(pageErrors.length)issues.push(name+': '+pageErrors.join('; ').slice(0,350));
        if(route.startsWith('/stories/')){
          const save=page.locator('.ogas-reading__save-button');
          if(await save.count()){
            if(!(await save.isVisible())){
              // Report the actual computed state instead of an unhelpful 30s click timeout.
              const details=await save.evaluate(node=>{
                const parts=[];
                let el=node;
                for(let n=0;el&&n<5;n++,el=el.parentElement){
                  const css=getComputedStyle(el);
                  const rect=el.getBoundingClientRect();
                  parts.push({tag:el.tagName,className:typeof el.className==='string'?el.className:'',
                    display:css.display,visibility:css.visibility,opacity:css.opacity,
                    width:Math.round(rect.width),height:Math.round(rect.height)});
                }
                return parts;
              });
              issues.push(name+': save-story button hidden '+JSON.stringify(details));
            }else{
              await save.scrollIntoViewIfNeeded({timeout:10000});
              await save.click({timeout:10000});
              if(!(await save.getAttribute('aria-pressed'))?.includes('true'))
                issues.push(name+': save-story action did not toggle');
            }
          }else issues.push(name+': save-story action missing');
        }
        if(mode.isMobile&&route==='/'){
          const menu=page.locator('.ogas-public-mobile-menu');
          if(await menu.count()){
            await menu.locator('summary').click();
            const open=await menu.evaluate(el=>el.hasAttribute('open'));
            if(!open)issues.push(name+': mobile category menu fails to open');
            else {
              // Same-route clicks must close too: the persistent header is not remounted.
              await menu.locator('a[href="/"]').click();
              if(await menu.evaluate(el=>el.open))
                issues.push(name+': category menu remains open after selecting Home on Home');
              await menu.locator('summary').click();
              await menu.locator('a[href="/section/grassroots-voices"]').click();
              await page.waitForURL(url=>url.pathname==='/section/grassroots-voices',{timeout:15000});
              if(await menu.evaluate(el=>el.open))
                issues.push(name+': category menu remains open after route navigation');
            }
          } else issues.push(name+': no mobile category menu found');
        }
      } catch (error) {
        issues.push(mode.name+route+': '+String(error).slice(0,300));
      } finally { await page.close(); }
    }
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile('qa-live-screenshots/results.json',JSON.stringify({run:new Date().toISOString(),results,issues},null,2));
console.log(JSON.stringify({routesChecked:results.length,issues},null,2));
if(issues.length)process.exitCode=1;
