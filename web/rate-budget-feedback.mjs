// Owner-approved Armenian copy, 2026-11-12. No timer, shared classroom state,
// input clearing, automatic retry, or authorization decision belongs here.
export const rateLimitFallback = 'Չափազանց շատ փորձեր են կատարվել։ Խնդրում ենք քիչ անց կրկին փորձել։';
const waitMessage = seconds => `Խնդրում ենք սպասել ${seconds} վայրկյան և կրկին փորձել։`;
const validWait = value => Number.isSafeInteger(value) && value > 0 && value <= 259200 ? value : null;
// This server code guarantees admission stopped before business work. A
// provider email quota error can follow partial work and is not this guarantee.
export const isRateBudgetRefusal = error => error?.status === 429 && error?.code === 'rate_limit_exceeded';
export function rateLimitMessage(error) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  if (message === rateLimitFallback || /^Խնդրում ենք սպասել [1-9][0-9]{0,5} վայրկյան և կրկին փորձել։$/.test(message ?? '')) return message;
  if (error.rateFeedback !== true && error.code !== 'rate_limit_exceeded' && message !== 'rate_limit_exceeded') return null;
  const wait = validWait(error.retryAfterSeconds);
  return wait ? waitMessage(wait) : rateLimitFallback;
}
export async function invokeRateAware(client, name, options) {
  const result = await client.functions.invoke(name, options);
  const response = result?.error?.context ?? result?.response;
  const status = Number(response?.status ?? result?.error?.status ?? 0);
  if (status !== 429 && result?.data?.error !== 'rate_limit_exceeded') return result;
  let payload = result?.data;
  if (typeof response?.clone === 'function') {
    try { payload = await response.clone().json(); } catch { /* Unknown wait uses reviewed fallback. */ }
  }
  const header = response?.headers?.get?.('retry-after');
  const headerWait = typeof header === 'string' && /^[1-9][0-9]*$/.test(header) ? Number(header) : null;
  const wait = validWait(headerWait) ?? validWait(payload?.retryAfterSeconds);
  const error = Object.assign(new Error(wait ? waitMessage(wait) : rateLimitFallback), {
    code:payload?.error ?? 'rate_limit_exceeded', status:429, rateFeedback:true,
    retryAfterSeconds:wait, context:response, cause:result?.error,
  });
  return {...result, error};
}
