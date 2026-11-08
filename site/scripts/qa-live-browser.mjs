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
        if(mode.isMobile&&route==='/'){
          const menu=page.locator('.ogas-public-mobile-menu');
          if(await menu.count()){
            await menu.locator('summary').click();
            const open=await menu.evaluate(el=>el.hasAttribute('open'));
            if(!open)issues.push(name+': mobile category menu fails to open');
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
