import { BOOKS, recoverySearchUrl } from './references.js';

const cache = new Map();
export async function lookupVerses(reference, fetcher = fetch) {
  const volume = BOOKS.findIndex(entry => entry[2] === reference.book) + 1;
  if (!volume) throw new Error('Unknown Bible book.');
  const numbers = Array.from({ length: reference.endVerse - reference.startVerse + 1 }, (_, index) => reference.startVerse + index);
  const refs = numbers.map(number => `${volume}.${reference.chapter}.${number}`).join(',');
  const key = `2:${refs}`;
  if (fetcher === fetch && cache.has(key)) return cache.get(key);
  const url = new URL('https://www.recoveryversion.com.tw/api/getVerses');
  url.searchParams.set('VERSION', '2'); // Source site's simplified Chinese Recovery Version.
  url.searchParams.set('refs', refs);
  const response = await fetcher(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`恢复本网站返回 HTTP ${response.status}，请稍后重试。`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('恢复本经文格式不正确。');
  const grouped = new Map();
  for (const row of rows) {
    const number = Number(row.segment_code);
    if (Number(row.chapter_code) !== volume || Number(row.section_code) !== reference.chapter
      || !numbers.includes(number) || typeof row.content !== 'string') continue;
    if (!grouped.has(number)) grouped.set(number, []);
    grouped.get(number).push({ unit: Number(row.unit_code), text: row.content });
  }
  const verses = numbers.map(number => ({ number,
    text: (grouped.get(number) || []).sort((a, b) => a.unit - b.unit).map(part => part.text).join('') }));
  if (verses.some(verse => !verse.text.trim())) throw new Error('未找到完整经文，请检查章节和节数。');
  const result = { verses, searchUrl: recoverySearchUrl(reference) };
  if (fetcher === fetch) {
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, result);
  }
  return result;
}
