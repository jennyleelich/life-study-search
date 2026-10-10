import test from 'node:test';
import assert from 'node:assert/strict';
import { headingLevel } from '../src/headings.js';

test('recognizes the source outline hierarchy including fullwidth characters', () => {
  for (const [text, level] of [
    ['参　内容', 0], ['壹　总纲', 0], ['一　神的心愿和目的', 1],
    ['１ 神原始的创造 ', 2], ['a 动机', 3], ['b 目的', 3], ['c 根据', 3],
    ['ｄ凭借', 3], ['e　过程', 3], ['（一）　起初', 4], ['（二）　神创造', 4],
    ['（三）创造证明神的存在', 4], ['（七）生出植物生命', 4],
  ]) assert.equal(headingLevel(text), level, text);
});

test('does not classify prose, Bible references or blank lines as headings', () => {
  for (const text of ['', '\n', '一切生命都来自基督。', '（创七17～24。）',
    '这是一段普通文字', 'a normal English sentence']) assert.equal(headingLevel(text), null);
});
