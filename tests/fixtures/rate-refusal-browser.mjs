export const rateWaitMessage='Խնդրում ենք սպասել 60 վայրկյան և կրկին փորձել։';
// A synthetic, definite pre-business refusal. All other fixture APIs remain real
// local handlers/SQL. No real person, hosted service or email is involved.
export async function refuseAction(page,name,action){
  await page.evaluate(({name,action})=>{
    const client=window.__haieduSupabaseClient??window.__client,invoke=client.functions.invoke;
    window.__rateRefusals=[];
    client.functions.invoke=async(fn,args)=>{
      if(fn!==name||args.body.action!==action)return invoke(fn,args);
      window.__rateRefusals.push({name:fn,body:args.body});
      return {data:null,error:{context:new Response(JSON.stringify({error:'rate_limit_exceeded',retryAfterSeconds:60}),{status:429,headers:{'Retry-After':'60'}})}};
    };
  },{name,action});
}
