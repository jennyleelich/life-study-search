import test from 'node:test';
import assert from 'node:assert/strict';
import { chineseNumber, findReferences } from '../src/references.js';

test('extracts the requested citation and its exact location in prose', () => {
  const text = '人类堕落后，在挪亚的时代里，地再度被死水淹埋。（创七17～24。）';
  assert.deepEqual(findReferences(text), [{ text: '创七17～24', index: text.indexOf('创'),
    book: 'Genesis', chapter: 7, startVerse: 17, endVerse: 24 }]);
});

test('supports traditional names, longer names, and single verses', () => {
  assert.deepEqual(findReferences('創七17～24，約壹三16，林後十二9，约3:16').map(
    ({ book, chapter, startVerse, endVerse }) => [book, chapter, startVerse, endVerse]),
  [['Genesis', 7, 17, 24], ['1 John', 3, 16, 16], ['2 Corinthians', 12, 9, 9], ['John', 3, 16, 16]]);
});

test('parses chapters up to Psalms 150 and ignores invalid ranges', () => {
  assert.equal(chineseNumber('一百五十'), 150);
  assert.equal(chineseNumber('一百零五'), 105);
  assert.equal(chineseNumber('十一'), 11);
  assert.deepEqual(findReferences('创零1 创七0 创七24～17 普通文字'), []);
});
