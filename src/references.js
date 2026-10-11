/** Parse Chinese Life-study chapter and verse references without changing prose. */
export const BOOKS = [
  ['创', '創', 'Genesis'], ['出', '出', 'Exodus'], ['利', '利', 'Leviticus'],
  ['民', '民', 'Numbers'], ['申', '申', 'Deuteronomy'], ['书', '書', 'Joshua'],
  ['士', '士', 'Judges'], ['得', '得', 'Ruth'], ['撒上', '撒上', '1 Samuel'],
  ['撒下', '撒下', '2 Samuel'], ['王上', '王上', '1 Kings'], ['王下', '王下', '2 Kings'],
  ['代上', '代上', '1 Chronicles'], ['代下', '代下', '2 Chronicles'],
  ['拉', '拉', 'Ezra'], ['尼', '尼', 'Nehemiah'], ['斯', '斯', 'Esther'],
  ['伯', '伯', 'Job'], ['诗', '詩', 'Psalms'], ['箴', '箴', 'Proverbs'],
  ['传', '傳', 'Ecclesiastes'], ['歌', '歌', 'Song of Songs'],
  ['赛', '賽', 'Isaiah'], ['耶', '耶', 'Jeremiah'], ['哀', '哀', 'Lamentations'],
  ['结', '結', 'Ezekiel'], ['但', '但', 'Daniel'], ['何', '何', 'Hosea'],
  ['珥', '珥', 'Joel'], ['摩', '摩', 'Amos'], ['俄', '俄', 'Obadiah'],
  ['拿', '拿', 'Jonah'], ['弥', '彌', 'Micah'], ['鸿', '鴻', 'Nahum'],
  ['哈', '哈', 'Habakkuk'], ['番', '番', 'Zephaniah'], ['该', '該', 'Haggai'],
  ['亚', '亞', 'Zechariah'], ['玛', '瑪', 'Malachi'], ['太', '太', 'Matthew'],
  ['可', '可', 'Mark'], ['路', '路', 'Luke'], ['约', '約', 'John'],
  ['徒', '徒', 'Acts'], ['罗', '羅', 'Romans'], ['林前', '林前', '1 Corinthians'],
  ['林后', '林後', '2 Corinthians'], ['加', '加', 'Galatians'],
  ['弗', '弗', 'Ephesians'], ['腓', '腓', 'Philippians'], ['西', '西', 'Colossians'],
  ['帖前', '帖前', '1 Thessalonians'], ['帖后', '帖後', '2 Thessalonians'],
  ['提前', '提前', '1 Timothy'], ['提后', '提後', '2 Timothy'], ['多', '多', 'Titus'],
  ['门', '門', 'Philemon'], ['来', '來', 'Hebrews'], ['雅', '雅', 'James'],
  ['彼前', '彼前', '1 Peter'], ['彼后', '彼後', '2 Peter'],
  ['约壹', '約壹', '1 John'], ['约贰', '約貳', '2 John'],
  ['约叁', '約參', '3 John'], ['犹', '猶', 'Jude'], ['启', '啟', 'Revelation'],
];

const aliases = new Map(BOOKS.flatMap(([simple, traditional, book]) =>
  [[simple, book], [traditional, book]]));
const digits = { 零: 0, 〇: 0, '○': 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

export function chineseNumber(text) {
  if (/^\d+$/.test(text)) return Number(text);
  // Life-study citations also spell chapters digit by digit: 二一 = 21, 一○五 = 105.
  if (text && [...text].every(character => character in digits)) {
    return Number([...text].map(character => digits[character]).join(''));
  }
  let total = 0;
  let digit = 0;
  for (const character of text) {
    if (character in digits) digit = digits[character];
    else if (character === '十' || character === '百') {
      total += (digit || 1) * (character === '十' ? 10 : 100);
      digit = 0;
    } else return NaN;
  }
  return total + digit;
}

const names = [...aliases.keys()].sort((a, b) => b.length - a.length).join('|');
const pattern = `(${names})([零〇○一二三四五六七八九十百]+|\\d+:)(\\d+)(?:[～~－—–-](\\d+))?`;

export function findReferences(text, defaultBook = null) {
  const results = [];
  // Some source citations contain a lowercase l in place of 1 (e.g. 创一l8).
  // Normalize only for matching; equal-length substitution preserves text offsets.
  const matchingText = text.replace(/l(?=\d)/g, '1');
  for (const match of matchingText.matchAll(new RegExp(pattern, 'gu'))) {
    const chapter = chineseNumber(match[2].replace(':', ''));
    const startVerse = Number(match[3]);
    const endVerse = Number(match[4] || match[3]);
    if (chapter < 1 || startVerse < 1 || endVerse < startVerse) continue;
    results.push({ text: text.slice(match.index, match.index + match[0].length), index: match.index, book: aliases.get(match[1]),
      chapter, startVerse, endVerse });
    const remainder = matchingText.slice(match.index + match[0].length);
    // A following citation may omit its book, or both its book and chapter.
    // 上/中/下 describe part of the preceding verse and remain ordinary text.
    const continuation = /^(?:[上中下]?[，、,]\s*(?:[零〇○一二三四五六七八九十百]+|\d+:)?\d+(?:[～~－—–-]\d+)?)+/u.exec(remainder);
    if (continuation) {
      let inheritedChapter = chapter;
      for (const extra of continuation[0].matchAll(/[上中下]?[，、,]\s*(([零〇○一二三四五六七八九十百]+|\d+:)?(\d+)(?:[～~－—–-](\d+))?)/gu)) {
        if (extra[2]) inheritedChapter = chineseNumber(extra[2].replace(':', ''));
        const first = Number(extra[3]);
        const last = Number(extra[4] || extra[3]);
        const index = match.index + match[0].length + extra.index + extra[0].length - extra[1].length;
        if (inheritedChapter > 0 && first > 0 && last >= first) results.push({ text: text.slice(index, index + extra[1].length),
          index,
          book: aliases.get(match[1]), chapter: inheritedChapter, startVerse: first, endVerse: last });
      }
    }
  }
  const defaultEntry = BOOKS.find(entry => entry[2] === defaultBook);
  if (defaultEntry) {
    for (const parenthesis of text.matchAll(/[（(]([^（）()\r\n]+)[）)]/gu)) {
      const inner = parenthesis[1];
      const leading = /^\s*(?=(?:[零〇○一二三四五六七八九十百]+|\d+:)[\dl])/u.exec(inner);
      if (!leading) continue;
      const start = parenthesis.index + 1 + leading[0].length;
      const alias = defaultEntry[0];
      const citation = inner.slice(leading[0].length);
      for (const ref of findReferences(alias + citation)) {
        const index = start + Math.max(0, ref.index - alias.length);
        if (results.some(existing => existing.index === index)) continue;
        const length = ref.text.length - (ref.index === 0 ? alias.length : 0);
        results.push({ ...ref, index, text: text.slice(index, index + length) });
      }
    }
  }
  return results.sort((a, b) => a.index - b.index);
}

const studyCodes = 'gen exo lev num deu jos jud ruth sam sam king king chr chr ezr neh est job psa pro ecc song isa jer lam eze dan hos joe amos oba jona mich nahu haba zeph hag zech mala matt mark luke john acts roma 1cor 2cor gal ephi phil col 1the 2the 1tim 2tim titu phmn hebr jame 1pet 2pet 1joh 2joh 3joh juda rev'.split(' ');

export function defaultStudyBook(id, articleText = '') {
  const candidates = BOOKS.filter((entry, index) => studyCodes[index] === id);
  if (candidates.length === 1) return candidates[0][2];
  const reading = /读经\s*[:：]\s*([^\r\n]+)/u.exec(articleText)?.[1] || '';
  const names = { sam: ['撒母耳记上', '撒母耳记下'], king: ['列王纪上', '列王纪下'], chr: ['历代志上', '历代志下'] };
  const matching = candidates.filter((entry, index) => reading.startsWith(names[id]?.[index] || '\0') || reading.startsWith(entry[0]) || reading.startsWith(entry[1]));
  return matching.length === 1 ? matching[0][2] : null;
}

function chapterChinese(value) {
  const symbols = '零一二三四五六七八九';
  let result = '';
  if (value >= 100) { result += symbols[Math.floor(value / 100)] + '百'; value %= 100; if (value > 0 && value < 10) result += '零'; }
  if (value >= 10) { const tens = Math.floor(value / 10); result += (tens === 1 && !result ? '' : symbols[tens]) + '十'; value %= 10; }
  if (value) result += symbols[value];
  return result;
}

export function recoverySearchUrl(reference) {
  const book = BOOKS.find(entry => entry[2] === reference.book);
  if (!book) throw new Error('Unknown Bible book.');
  const text = `${book[1]}${chapterChinese(reference.chapter)}${reference.startVerse}${reference.endVerse === reference.startVerse ? '' : `～${reference.endVerse}`}`;
  return `https://www.recoveryversion.com.tw/ref/${encodeURIComponent(text)}`;
}
