import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
const DIST = resolve(process.cwd(),'ssr/dist');
const MIME={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const server=createServer((req,res)=>{let p=join(DIST,decodeURIComponent(req.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('404 '+req.url);}res.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>server.listen(4189,r));
const browser=await chromium.launch({headless:true});
for (const [name,path] of [['Exodra','/exodra/'],['Solid','/solid/'],['Qwik','/qwik/']]){
  const ctx=await browser.newContext(); const page=await ctx.newPage();
  const errs=[], fails=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  page.on('requestfailed',r=>fails.push(r.url().split('/').pop()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)fails.push(r.status()+' '+r.url().split('/').pop());});
  await page.goto('http://localhost:4189'+path,{waitUntil:'networkidle'});
  const before=await page.textContent('button[data-b="0"]').catch(()=>'?');
  await page.click('button[data-b="0"]',{force:true}).catch(()=>{});
  await page.waitForTimeout(500);
  const after=await page.textContent('button[data-b="0"]').catch(()=>'?');
  console.log(`\n${name}: btn "${before}" -> "${after}" ${before!==after?'✅ CLICK WORKS':'❌ dead'}`);
  if(errs.length) console.log('  errors:', errs.slice(0,3).join(' | '));
  if(fails.length) console.log('  failed:', fails.slice(0,4).join(' | '));
  await ctx.close();
}
await browser.close(); server.close();
