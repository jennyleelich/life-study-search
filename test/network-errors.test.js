import test from 'node:test';
import assert from 'node:assert/strict';
import { networkErrorMessage } from '../src/network-errors.js';

test('explains fetch failures without exposing connection details or proxy credentials', () => {
  const cause = { code: 'SELF_SIGNED_CERT_IN_CHAIN', message: 'sensitive connection details' };
  const message = networkErrorMessage(new TypeError('fetch failed', { cause }));
  assert.match(message, /证书验证失败/);
  assert.doesNotMatch(message, /sensitive/);
  assert.match(networkErrorMessage(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })), /DNS/);
  assert.match(networkErrorMessage(new TypeError('fetch failed', { cause: { errors: [{ code: 'ECONNREFUSED' }] } })), /代理或防火墙/);
  assert.match(networkErrorMessage({ name: 'TimeoutError', message: 'timed out' }), /超时/);
  assert.match(networkErrorMessage(new TypeError('fetch failed')), /无法连接来源网站/);
});
