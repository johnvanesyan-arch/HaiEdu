import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {guardStagingBrowser} from '../../scripts/local-staging-browser-network.mjs';

async function setup(t,handler,{drainTimeoutMs=10000}={}) {
  const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});
  t.after(()=>browser.close());
  const context=await browser.newContext({serviceWorkers:'block'});
  const guard=await guardStagingBrowser(context,{frontendOrigin:origin,backendOrigin:origin},{drainTimeoutMs});
  const page=await context.newPage();await page.goto(origin);
  return {browser,page,guard,origin};
}

test('shutdown waits for an in-flight real response and refuses new requests without removing the guard',async t=>{
  let release,started;const ready=new Promise(r=>started=r);let late=0;
  const {page,guard,browser}=await setup(t,(req,res)=>{
    if(req.url==='/slow'){release=()=>res.end('finished');started();return;}
    if(req.url==='/late')late++;
    res.end('<html><body>Local network regression</body></html>');
  });
  await page.evaluate(()=>{window.slow=fetch('/slow').then(r=>r.text());});await ready;
  let drained=false;const pending=guard.drain().then(()=>{drained=true;});
  const lateResult=await page.evaluate(()=>fetch('/late').then(()=>true,()=>false));
  assert.equal(lateResult,false);assert.equal(late,0);assert.equal(drained,false);
  release();await pending;assert.equal(await page.evaluate(()=>window.slow),'finished');
  await browser.close();assert.equal(drained,true);
});

test('a route transport failure remains a failed journey instead of an unhandled shutdown rejection',async t=>{
  const {page,guard}=await setup(t,(req,res)=>req.url==='/broken'?req.socket.destroy():res.end('<html>Local</html>'));
  await page.evaluate(()=>fetch('/broken').catch(()=>null));
  await assert.rejects(guard.drain(),/owned_browser_transport_errors/);
});

test('redirects and foreign destinations remain blocked and fail the journey',async t=>{
  let escaped=0;
  const {page,guard}=await setup(t,(req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{Location:'/escaped'});res.end();return;}
    if(req.url==='/escaped')escaped++;
    res.end('<html>Local</html>');
  });
  await page.evaluate(async()=>{
    await fetch('/redirect').catch(()=>null);
    await fetch('https://example.invalid/never-contact').catch(()=>null);
  });
  assert.equal(escaped,0);
  await assert.rejects(guard.drain(),/unexpected_browser_network_destination/);
  assert.deepEqual(guard.blocked,['http-redirect','outside-owned-origins']);
});

test('a request that never settles cannot produce a successful shutdown',async t=>{
  let started;const ready=new Promise(r=>started=r);
  const {page,guard}=await setup(t,(req,res)=>{
    if(req.url==='/stuck'){started();return;}
    res.end('<html>Local</html>');
  },{drainTimeoutMs:300});
  await page.evaluate(()=>{void fetch('/stuck').catch(()=>{});});await ready;
  await assert.rejects(guard.drain(),/owned_browser_(drain_timeout|transport_errors)/);
});

test('a forbidden request arriving after drain still fails final verification',async t=>{
  const {page,guard,browser}=await setup(t,(_req,res)=>res.end('<html>Local</html>'));
  await guard.drain();
  await page.evaluate(()=>fetch('https://example.invalid/late').catch(()=>{}));
  await browser.close();
  assert.throws(()=>guard.verify(),/unexpected_browser_network_destination/);
});
