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
  const diagnosticRequired = !active && data.practiceAccess?.unlocked === false;
  return {
    title: diagnosticRequired ? 'Սկսեք ձեր մեկնարկային մակարդակից' : 'Ձեր հաջորդ ուսումնական քայլը',
    description: diagnosticRequired
      ? 'Բացեք գնահատումները՝ այս բաժնի ախտորոշիչը և դրա պայմանները տեսնելու համար։'
      : 'Բացեք ընտրված բաժինը՝ հասանելի աշխատանքները և հմտությունները տեսնելու համար։',
    count: '', action: diagnosticRequired ? 'Դիտել գնահատումները' : 'Բացել դասընթացը',
    href: contextHref(context, diagnosticRequired ? 'assessment' : 'course'), readiness,
  };
}
