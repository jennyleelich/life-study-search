import test from 'node:test';
import assert from 'node:assert/strict';
import { chineseNumber, findReferences, recoverySearchUrl } from '../src/references.js';

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

test('parses digit-by-digit chapters without dropping leading digits', () => {
  for (const [text, expected] of [['二一', 21], ['二十一', 21], ['一二', 12], ['一五○', 150], ['一〇五', 105], ['一零五', 105]]) {
    assert.equal(chineseNumber(text), expected);
  }
  const reference = findReferences('（启二一25。）')[0];
  assert.equal(reference.chapter, 21);
  assert.equal(reference.startVerse, 25);
  assert.equal(decodeURIComponent(recoverySearchUrl(reference)), 'https://www.recoveryversion.com.tw/ref/啟二十一25');
  assert.equal(findReferences('启二一5')[0].startVerse, 5);
  assert.equal(findReferences('诗一○五1')[0].chapter, 105);
});

test('inherits omitted books and updates the chapter for subsequent citations', () => {
  const text = '（启二一25下，二二5，7～9，二十一6上，22:10。）';
  const references = findReferences(text);
  assert.deepEqual(references.map(r => [r.text, r.book, r.chapter, r.startVerse, r.endVerse]), [
    ['启二一25', 'Revelation', 21, 25, 25],
    ['二二5', 'Revelation', 22, 5, 5],
    ['7～9', 'Revelation', 22, 7, 9],
    ['二十一6', 'Revelation', 21, 6, 6],
    ['22:10', 'Revelation', 22, 10, 10],
  ]);
  for (const reference of references) {
    assert.equal(text.slice(reference.index, reference.index + reference.text.length), reference.text);
  }
  assert.equal(decodeURIComponent(recoverySearchUrl(references[1])), 'https://www.recoveryversion.com.tw/ref/啟二十二5');
  assert.equal(findReferences('启二一25下。二二5。').length, 1);
});
