import {invokeLearnerFunction} from './answer-response-recovery.mjs';

export const hintConflictMessage = 'Հարցի վիճակը փոխվել է։ Թարմացրեք հարցը՝ շարունակելու համար։';
export const hintRefreshLabel = 'Թարմացնել հարցը';

export async function invokeForHint(supabase, name, body, isCurrent) {
  const identity = async () => (await supabase.auth.getSession()).data?.session?.user?.id;
  const actor = await identity();
  const authorized = async () => Boolean(actor) && isCurrent() && actor === await identity();
  const result = await invokeLearnerFunction(supabase, name, {
    body, beforeRequest: authorized, afterRequest: authorized,
  });
  // A timed-out request can finish after the next question or a sign-in change.
  return await authorized() ? result : {stale:true};
}

export function focusHint(panel) {
  panel.focus({preventScroll:true});
  panel.scrollIntoView({block:'start'});
}
