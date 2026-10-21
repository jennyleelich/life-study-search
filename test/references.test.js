import test from 'node:test';
import assert from 'node:assert/strict';
import { chineseNumber, findReferences, recoverySearchUrl, defaultStudyBook } from '../src/references.js';

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

test('links fullwidth hyphen ranges and all following verse citations', () => {
  const text = '（利二三2，5－6，15－16，24，27，34，39，41。）';
  const references = findReferences(text);
  assert.deepEqual(references.map(r => [r.text, r.chapter, r.startVerse, r.endVerse]), [
    ['利二三2', 23, 2, 2], ['5－6', 23, 5, 6], ['15－16', 23, 15, 16],
    ['24', 23, 24, 24], ['27', 23, 27, 27], ['34', 23, 34, 34],
    ['39', 23, 39, 39], ['41', 23, 41, 41],
  ]);
  for (const reference of references) {
    assert.equal(reference.book, 'Leviticus');
    assert.equal(text.slice(reference.index, reference.index + reference.text.length), reference.text);
  }
  assert.equal(decodeURIComponent(recoverySearchUrl(references[1])), 'https://www.recoveryversion.com.tw/ref/利二十三5～6');
  assert.equal(decodeURIComponent(recoverySearchUrl(references[2])), 'https://www.recoveryversion.com.tw/ref/利二十三15～16');
  assert.equal(findReferences('利二三5－6')[0].endVerse, 6);
});

test('recognizes lowercase l typos while preserving the original citation text', () => {
  const text = '（创一l8上。)';
  const reference = findReferences(text)[0];
  assert.deepEqual(reference, { text: '创一l8', index: 1, book: 'Genesis', chapter: 1, startVerse: 18, endVerse: 18 });
  assert.equal(decodeURIComponent(recoverySearchUrl(reference)), 'https://www.recoveryversion.com.tw/ref/創一18');
  const rangeText = '创一l8－l9上，l7。';
  const references = findReferences(rangeText);
  assert.deepEqual(references.map(r => [r.text, r.startVerse, r.endVerse]), [['创一l8－l9', 18, 19], ['l7', 17, 17]]);
  for (const ref of references) assert.equal(rangeText.slice(ref.index, ref.index + ref.text.length), ref.text);
  assert.deepEqual(findReferences('普通文字 l8 library'), []);
});

test('uses the current study book for chapter citations inside parentheses', () => {
  const text = '（一13～15。） （ 二二5，7－9。） （创七17～24。） （一）起初';
  const refs = findReferences(text, 'Revelation');
  assert.deepEqual(refs.map(r => [r.text, r.book, r.chapter, r.startVerse, r.endVerse]), [
    ['一13～15', 'Revelation', 1, 13, 15], ['二二5', 'Revelation', 22, 5, 5],
    ['7－9', 'Revelation', 22, 7, 9], ['创七17～24', 'Genesis', 7, 17, 24],
  ]);
  for (const ref of refs) assert.equal(text.slice(ref.index, ref.index + ref.text.length), ref.text);
  assert.deepEqual(findReferences('（一13～15。）'), []);
  assert.deepEqual(findReferences('普通文字一13～15', 'Genesis'), []);
  assert.equal(defaultStudyBook('gen'), 'Genesis');
  assert.equal(defaultStudyBook('rev'), 'Revelation');
  assert.equal(defaultStudyBook('sam', '读经：撒母耳记下七章。'), '2 Samuel');
  assert.equal(defaultStudyBook('sam'), null);
});

test('includes verse ranges with spaces around their separators', () => {
  for (const text of ['腓二6 ～8。', '腓二6 ～ 8。', '腓二6　～　8。', '腓二6\u00a0－\u00a08。']) {
    const refs = findReferences(text);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].startVerse, 6);
    assert.equal(refs[0].endVerse, 8);
    assert.equal(refs[0].text, text.slice(0, -1));
    assert.equal(decodeURIComponent(recoverySearchUrl(refs[0])), 'https://www.recoveryversion.com.tw/ref/腓二6～8');
  }
  const text = '腓二5，6 ～ 8，12－ 13。';
  const refs = findReferences(text);
  assert.deepEqual(refs.map(ref => [ref.startVerse, ref.endVerse]), [[5, 5], [6, 8], [12, 13]]);
  for (const ref of refs) assert.equal(text.slice(ref.index, ref.index + ref.text.length), ref.text);
  assert.equal(findReferences('（二6 ～ 8。）', 'Philippians')[0].endVerse, 8);
});
