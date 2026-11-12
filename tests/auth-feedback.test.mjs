import test from 'node:test';
import assert from 'node:assert/strict';
import { newPasswordProblem, authErrorMessage } from '../web/auth-feedback.mjs';

test('new passwords accept six characters, preserve spaces and allow more than twelve', () => {
  for (const value of ['abcdef', 'Աբգդեզ', '🔒'.repeat(6), ' A  B ', 'a'.repeat(48)]) {
    assert.equal(newPasswordProblem(value, value), '', value.length);
  }
});
test('minimum counts Unicode characters and mismatch has its own explanation', () => {
  for (const value of ['', 'abcde', 'Աբգդե', '🔒'.repeat(5)]) {
    assert.match(newPasswordProblem(value, value), /6 նիշ/);
  }
  assert.match(newPasswordProblem('abcdef', 'abcdeg'), /չեն համընկնում/);
});
test('email and request limits do not blame credentials or invent a retry duration', () => {
  assert.match(authErrorMessage({ code: 'over_email_send_rate_limit', status: 429 }), /նամակների.*սահմանաչափ/);
  assert.match(authErrorMessage({ code: 'over_request_rate_limit', status: 429 }), /չափազանց շատ/);
  assert.doesNotMatch(authErrorMessage({ status: 429 }), /գաղտնաբառը|րոպե|ժամ/);
});
test('password and challenge errors offer the action that can resolve them', () => {
  assert.match(authErrorMessage({ code: 'weak_password' }), /6 նիշ/);
  assert.match(authErrorMessage({ code: 'same_password' }), /տարբերվի/);
  for (const code of ['captcha_failed', 'captcha_required', 'captcha_expired']) {
    assert.match(authErrorMessage({ code }), /Ավարտեք անվտանգության ստուգումը/);
  }
  assert.match(authErrorMessage({ code: 'captcha_unavailable' }), /չբեռնվեց/);
  assert.match(authErrorMessage({ code: 'reauthentication_needed' }), /հաստատեք մուտքը/);
});
test('network errors are localized, unknown provider text and account data are not echoed', () => {
  for (const error of [{ name: 'AuthRetryableFetchError' }, { name: 'AbortError' }, new TypeError('Failed to fetch')]) {
    assert.match(authErrorMessage(error), /ինտերնետային կապը/);
  }
  for (const action of ['login', 'register', 'reset', 'password', 'email', 'invitation']) {
    const text = authErrorMessage({ message: 'Raw provider details for a private account', code: 'unknown' }, action);
    assert.doesNotMatch(text, /Raw provider|private account/);
    assert.match(text, /[Ա-ֆ]/);
  }
});
test('stale-account cancellation keeps the shared controller suppression contract', () => {
  assert.equal(authErrorMessage(new Error('account_session_changed'), 'reset'), 'account_session_changed');
});
