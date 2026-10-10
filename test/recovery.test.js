import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupVerses } from '../src/recovery.js';
import { findReferences, recoverySearchUrl } from '../src/references.js';

test('creates the source website reference-result URL', () => {
  const reference = findReferences('创七17～24')[0];
  assert.equal(decodeURIComponent(recoverySearchUrl(reference)), 'https://www.recoveryversion.com.tw/ref/創七17～24');
});

test('inherits the book and chapter for comma-separated verses', () => {
  const references = findReferences('创八13～17，22。创十二1，5，7。');
  assert.deepEqual(references.map(r => [r.text, r.chapter, r.startVerse, r.endVerse]),
    [['创八13～17', 8, 13, 17], ['22', 8, 22, 22], ['创十二1', 12, 1, 1], ['5', 12, 5, 5], ['7', 12, 7, 7]]);
});

test('requests simplified Recovery Version and combines verse units in order', async () => {
  const reference = findReferences('创七17～18')[0];
  const result = await lookupVerses(reference, async url => {
    assert.equal(url.hostname, 'www.recoveryversion.com.tw');
    assert.equal(url.searchParams.get('VERSION'), '2');
    assert.equal(url.searchParams.get('refs'), '1.7.17,1.7.18');
    return { ok: true, json: async () => [
      { chapter_code: 1, section_code: 7, segment_code: 18, unit_code: 2, content: 'B' },
      { chapter_code: 1, section_code: 7, segment_code: 17, unit_code: 0, content: 'First' },
      { chapter_code: 1, section_code: 7, segment_code: 18, unit_code: 1, content: 'A' },
      { chapter_code: 2, section_code: 7, segment_code: 17, unit_code: 0, content: 'Other book' },
    ] };
  });
  assert.deepEqual(result.verses, [{ number: 17, text: 'First' }, { number: 18, text: 'AB' }]);
});

test('does not accept partial verse ranges or HTTP failures', async () => {
  const reference = findReferences('创七17～18')[0];
  await assert.rejects(lookupVerses(reference, async () => ({ ok: true, json: async () => [] })), /完整经文/);
  await assert.rejects(lookupVerses(reference, async () => ({ ok: false, status: 503 })), /HTTP 503/);
});
