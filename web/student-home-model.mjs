import { contextHref } from './learning-navigation.mjs';
import { registeredExtensionHref } from './learning-extensions.mjs';

export const learningModeLabels = Object.freeze({
  diagnostic: 'Ախտորոշիչ', practice: 'Վարժանք',
  mastery_check: 'Յուրացման ստուգում', chapter_review: 'Գլխի կրկնություն',
});

// A read-only presentation of the exact selected unit. No cross-course ranking,
// score calculation, session creation or client-side eligibility decision.
export function homeLearningSummary(context, data) {
  const active = data.activeSession;
  const knownActive = active && Object.hasOwn(learningModeLabels, active.mode);
  const required = (data.skills || []).filter(skill => skill.requiredForReadiness !== false);
  const readiness = required.length && required.every(skill => typeof skill.ready === 'boolean')
    ? { ready: required.filter(skill => skill.ready).length, required: required.length } : null;
  if (knownActive) {
    const spec = active.policyBindingId ? null : data.modes?.[active.mode];
    let href = registeredExtensionHref(spec?.extensionKey, active.mode, context);
    if (href && active.targetSkillId) href += '&skill=' + encodeURIComponent(active.targetSkillId);
    return {
      title: 'Շարունակեք այնտեղից, որտեղ կանգ եք առել',
      description: learningModeLabels[active.mode],
      count: Number.isInteger(active.answered) && Number.isInteger(active.planned)
        ? `Պատասխանված է ${active.answered} / ${active.planned} հարցի։` : '',
      action: 'Շարունակել',
      href: href || contextHref(context, 'assessment', { action: active.mode, skill: active.targetSkillId }),
      readiness,
    };
  }
  // Unknown active modes must remain within the existing course workspace.
  // Without a session, name the concrete next step from the same rules as the unit path.
  // Home stays read-only (16.5B.1): every step is an entry link to the course's
  // assessments, never a link that starts an attempt.
  const diagnosticRequired = !active && data.practiceAccess?.unlocked === false;
  const [diagnostic, practice, mastery] = active ? [] : homeLearningPath(data);
  const entry = { count: '', href: contextHref(context, 'assessment'), readiness };
  if (diagnosticRequired && diagnostic?.state === 'next') return { ...entry,
    title: 'Սկսեք ախտորոշիչից',
    description: Number.isInteger(data.modes?.diagnostic?.questions)
      ? `${data.modes.diagnostic.questions} հարց։ Ախտորոշիչը ցույց է տալիս, թե որտեղից սկսել վարժանքը։`
      : 'Ախտորոշիչը ցույց է տալիս, թե որտեղից սկսել վարժանքը։',
    action: 'Անցնել ախտորոշիչին' };
  if (diagnosticRequired) return { ...entry,
    title: 'Սկսեք ձեր մեկնարկային մակարդակից',
    description: 'Գնահատումների բաժնում տեսեք այս բաժնի ախտորոշիչը և դրա պայմանները։',
    action: 'Անցնել գնահատումներին' };
  if (mastery?.state === 'next') return { ...entry,
    title: 'Կարող եք անցնել յուրացման ստուգմանը',
    description: 'Սկսելուց առաջ կարդացեք ստուգման կանոնները։',
    action: 'Անցնել ստուգմանը' };
  if (practice?.state === 'current') return { ...entry,
    title: 'Շարունակեք վարժանքով',
    description: 'Վարժանքի հարցերը հիմնված են այս բաժնի պահանջվող հմտությունների վրա։',
    action: 'Անցնել վարժանքին' };
  return {
    title: 'Ձեր հաջորդ ուսումնական քայլը',
    description: 'Բացեք ընտրված բաժինը՝ հասանելի աշխատանքները և հմտությունները տեսնելու համար։',
    count: '', action: 'Բացել դասընթացը', href: contextHref(context, 'course'), readiness,
  };
}

const enabledMode = spec => spec?.status === 'configured' || spec?.status === 'registered_legacy';

// «Your path in this unit»: the diagnostic → practice → mastery-check sequence of the
// exact selected unit, read from the same dashboard reply and the same rules the course
// page uses for its mode cards. Presentation only: it starts nothing, decides no
// eligibility of its own and shows no assessment score.
export function homeLearningPath(data) {
  const active = data.activeSession, modes = data.modes || {};
  const required = (data.skills || []).filter(skill => skill.requiredForReadiness !== false);
  const known = required.length > 0 && required.every(skill => typeof skill.ready === 'boolean');
  const ready = required.filter(skill => skill.ready === true).length;
  const lifecycle = data.lifecycle?.state ?? '';
  const progress = mode => active?.mode === mode && Number.isInteger(active.answered) && Number.isInteger(active.planned)
    ? `Ընթացքի մեջ է · պատասխանված է ${active.answered} / ${active.planned}` : 'Ընթացքի մեջ է';
  const step = (mode, state, detail) => ({ mode, label: learningModeLabels[mode], state, detail });
  const unavailable = mode => step(mode, 'unavailable', 'Դեռ ակտիվացված չէ');

  const diagnostic = !enabledMode(modes.diagnostic) && !data.baseline ? unavailable('diagnostic')
    : data.baseline ? step('diagnostic', 'done', 'Ավարտված է')
    : active?.mode === 'diagnostic' ? step('diagnostic', 'current', progress('diagnostic'))
    : step('diagnostic', 'next', 'Հաջորդ քայլը');

  const readiness = known ? `պատրաստ է ${ready} / ${required.length} պահանջվող հմտություն` : '';
  const practice = !enabledMode(modes.practice) ? unavailable('practice')
    : data.practiceAccess?.unlocked !== true ? step('practice', 'locked', 'Կբացվի ախտորոշիչից հետո')
    : active?.mode === 'practice' ? step('practice', 'current', [progress('practice'), readiness].filter(Boolean).join(' · '))
    : step('practice', 'current', readiness ? `Ընթացքի մեջ է · ${readiness}` : 'Ընթացքի մեջ է');

  const masteryReady = known && ready === required.length;
  const retryReady = /^mastery_retry_\d+_ready$/.test(lifecycle);
  const mastery = lifecycle === 'mastery_passed' ? step('mastery_check', 'done', 'Հանձնված է')
    : lifecycle === 'mastery_failed_final' ? step('mastery_check', 'done', 'Ավարտված է')
    : !enabledMode(modes.mastery_check) ? unavailable('mastery_check')
    : active?.mode === 'mastery_check' ? step('mastery_check', 'current', progress('mastery_check'))
    : data.practiceAccess?.unlocked === true && (masteryReady || retryReady)
      ? step('mastery_check', 'next', active ? 'Հասանելի կլինի ընթացիկ աշխատանքն ավարտելուց հետո' : 'Հասանելի է')
    : /^review_required/.test(lifecycle) ? step('mastery_check', 'locked', 'Նախ ավարտեք պարտադիր կրկնությունը')
    : step('mastery_check', 'locked', known
      ? `Կբացվի, երբ ${required.length} պահանջվող հմտություններն էլ պատրաստ լինեն`
      : 'Կբացվի, երբ պահանջվող հմտությունները պատրաստ լինեն');

  return [diagnostic, practice, mastery];
}
