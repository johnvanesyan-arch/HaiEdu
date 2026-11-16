import assert from 'node:assert/strict';
import {stagingUrl} from './staging-target.mjs';

// Keep the origin guard installed until the context is closed. Unrouting during
// teardown would let late browser requests escape without checking their target.
export async function guardStagingBrowser(context,target,{drainTimeoutMs=15000}={}) {
  const pending=new Set(),failures=[],blocked=[];
  let stopping=false;
  const verify=()=>{
    assert.equal(failures.length,0,'owned_browser_transport_errors');
    assert.equal(blocked.length,0,'unexpected_browser_network_destination');
  };
  await context.routeWebSocket('**/*',socket=>{
    blocked.push('websocket-outside-journey-scope');socket.close();
  });
  await context.route('**/*',route=>{
    const task=(async()=>{
      try {stagingUrl(target,route.request().url());}
      catch {blocked.push('outside-owned-origins');await route.abort('blockedbyclient');return;}
      if(stopping){await route.abort('blockedbyclient').catch(()=>{});return;}
      const response=await route.fetch({maxRedirects:0,timeout:drainTimeoutMs});
      if(response.status()>=300&&response.status()<400) {
        blocked.push('http-redirect');await route.abort('blockedbyclient');return;
      }
      await route.fulfill({response});
    })().catch(async()=>{
      // Do not print URLs, headers or request bodies: they may contain private
      // local credentials. Transport failures still fail the entire journey.
      failures.push('owned_browser_route_failed');
      await route.abort('failed').catch(()=>{});
    });
    pending.add(task);
    return task.finally(()=>pending.delete(task));
  });
  return {
    blocked,verify,
    async drain() {
      stopping=true;
      let timer;
      try {
        await Promise.race([
          (async()=>{while(pending.size)await Promise.all([...pending]);})(),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('owned_browser_drain_timeout')),drainTimeoutMs);})
        ]);
      } finally {clearTimeout(timer);}
      verify();
    }
  };
}
