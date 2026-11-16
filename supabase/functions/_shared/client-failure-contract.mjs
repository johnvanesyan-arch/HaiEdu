// This contract is copied byte-for-byte to the Edge runtime by
// scripts/build-client-failure-contract.mjs. No free-form diagnostic strings.
export const FAILURE_VERSION = 1;
export const FAILURE_CATEGORIES = Object.freeze(['service_failure','request_failed','write_unconfirmed','invalid_response','audio_playback','application_exception']);
export const FAILURE_OPERATIONS = Object.freeze(['dashboard_load','learning_load','answer_submit','draft_save','writing_submit','feedback_publish','assignment_send','audio_load','file_load','admin_action','content_action','auth_action','page_execution']);
export const FAILURE_PAGES = Object.freeze(['student','teacher','school_admin','master_admin','content','account','other']);
export const FAILURE_ROUTE = 'record-client-failure';
const keys = ['schemaVersion','buildId','page','operation','category','status','durationMs','eventId'];
export function validateClientFailure(value) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const d = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(d).length !== keys.length || keys.some(k => !d[k] || !Object.hasOwn(d[k], 'value'))) return false;
    return value.schemaVersion === FAILURE_VERSION && typeof value.buildId === 'string' && /^[a-f0-9]{64}$/.test(value.buildId)
      && FAILURE_PAGES.includes(value.page) && FAILURE_OPERATIONS.includes(value.operation) && FAILURE_CATEGORIES.includes(value.category)
      && Number.isInteger(value.status) && (value.status === 0 || value.status >= 100 && value.status <= 599)
      && Number.isInteger(value.durationMs) && value.durationMs >= 0 && value.durationMs <= 60000
      && typeof value.eventId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.eventId);
  } catch { return false; }
}
