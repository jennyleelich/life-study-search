import test from 'node:test';
import assert from 'node:assert/strict';
import { seedGroups, relatedThemes, messageReview, renderSeedInventory } from '../src/genesis-seed-inventory.js';
import { createServer } from '../server.js';

test('every seed has a source cue, Genesis starting verses, detailed summary and development references', () => {
  const items = seedGroups.flatMap(group => group.items);
  assert.equal(items.length, 30);
  for (const item of items) {
    assert.ok(item.title && item.cue && item.summary.length >= 50);
    assert.match(item.origin, /^创/);
    assert.ok(item.development || item.further);
    assert.ok(item.messages.length && item.messages.every(n => Number.isInteger(n) && n >= 1 && n <= 25));
  }
  assert.equal(relatedThemes.length, 6);
  assert.equal(messageReview.length, 25);
});

test('includes previously grouped subjects separately and labels editorial additions', () => {
  const result = renderSeedInventory();
  assert.equal(result.kind, 'study');
  for (const phrase of ['三角局面', '耕地', '彰显基督', '与基督联合', '流血', '称义', '相信福音', '呼求耶和华', '原文核对线索', '补充参读', '第1～25篇逐篇核对表']) assert.ok(result.html.includes(phrase), phrase);
  assert.equal((result.html.match(/<h3>/g) || []).length, 36);
  assert.equal((result.html.match(/<tr>/g) || []).length, 26);
  assert.match(result.html, /不替换前一篇/);
  assert.doesNotMatch(result.html, /<script/);
});

test('the new summary is readable even when both remote sources are unavailable', async t => {
  const server = createServer({ fetchArticle: async () => { throw new Error('Offline'); }, lookupVerses: null });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/article?book=gen&message=1002`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.html, /生命读经解释|生命读经总结/);
  assert.match(data.html, /呼求耶和华的名/);
});
