import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters, renderGenesisStudy, withGenesisStudy } from '../src/genesis-seeds.js';

const fixtureLookup = async reference => ({ verses: Array.from({ length: reference.endVerse }, (_, index) => ({ number: index + 1, text: `Fixture ${reference.chapter}:${index + 1} <script>` })) });

test('covers Genesis 1–4 exactly once and cites only reviewed messages', () => {
  let count = 0;
  const referencedStudies = new Set();
  for (const chapter of chapters) {
    const verseNumbers = chapter.topics.flatMap(([, start, end, studies]) => {
      studies.forEach(number => referencedStudies.add(number));
      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    });
    assert.deepEqual(verseNumbers, Array.from({ length: chapter.count }, (_, index) => index + 1));
    count += verseNumbers.length;
  }
  assert.equal(count, 106);
  assert.equal(chapters.reduce((total, chapter) => total + chapter.topics.length, 0), 30);
  assert.deepEqual([...referencedStudies].sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
});

test('inserts a separate study after message 25 without renumbering original messages', () => {
  const original = [{ id: 'gen', messages: [24, 25, 26].map(number => ({ number })) }];
  const updated = withGenesisStudy(original);
  assert.deepEqual(updated[0].messages.map(item => item.number), [24, 25, 1001, 1002, 26]);
  assert.equal(original[0].messages.length, 3);
});

test('renders all verse text, summaries and reference links while escaping upstream text', async () => {
  const result = await renderGenesisStudy(fixtureLookup);
  assert.deepEqual(result.missingChapters, []);
  assert.equal((result.html.match(/Fixture /g) || []).length, 106);
  assert.equal((result.html.match(/<h3>/g) || []).length, 30);
  assert.match(result.html, /不是生命读经原文/);
  assert.match(result.html, /第25篇/);
  assert.doesNotMatch(result.html, /<script>/);
  assert.match(result.html, /&lt;script&gt;/);
});

test('keeps summaries and reports missing verses when a chapter source fails', async () => {
  const result = await renderGenesisStudy(async reference => {
    if (reference.chapter === 3) throw new Error('Unavailable');
    return fixtureLookup(reference);
  });
  assert.deepEqual(result.missingChapters, [3]);
  assert.match(result.html, /本章经文暂时未能完整载入/);
  assert.match(result.html, /女人的后裔/);
  assert.equal((result.html.match(/Fixture /g) || []).length, 82);
});
