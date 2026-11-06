import {invokeLearnerFunction} from './answer-response-recovery.mjs';

export const hintConflictMessage = 'Հարցի վիճակը փոխվել է։ Թարմացրեք հարցը՝ շարունակելու համար։';
export const hintRefreshLabel = 'Թարմացնել հարցը';

export async function invokeForHint(supabase, name, body, isCurrent) {
  const identity = async () => (await supabase.auth.getSession()).data?.session?.user?.id;
  let actor;
  const result = await invokeLearnerFunction(supabase, name, {
    body,
    beforeRequest: async () => {
      actor = await identity();
      return Boolean(actor) && isCurrent();
    },
    afterRequest: async () => isCurrent() && actor === await identity(),
  });
  return isCurrent() ? result : {stale:true};
}

export function focusHint(panel) {
  panel.focus({preventScroll:true});
  panel.scrollIntoView({block:'start'});
}
