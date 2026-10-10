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
const pattern = `(${names})([零〇○一二三四五六七八九十百]+|\\d+:)(\\d+)(?:[～~—–-](\\d+))?`;

export function findReferences(text) {
  const results = [];
  for (const match of text.matchAll(new RegExp(pattern, 'gu'))) {
    const chapter = chineseNumber(match[2].replace(':', ''));
    const startVerse = Number(match[3]);
    const endVerse = Number(match[4] || match[3]);
    if (chapter < 1 || startVerse < 1 || endVerse < startVerse) continue;
    results.push({ text: match[0], index: match.index, book: aliases.get(match[1]),
      chapter, startVerse, endVerse });
    const remainder = text.slice(match.index + match[0].length);
    const continuation = /^(?:[，、,]\s*\d+(?:[～~—–-]\d+)?)+/u.exec(remainder);
    if (continuation) {
      for (const extra of continuation[0].matchAll(/\d+(?:[～~—–-]\d+)?/gu)) {
        const [first, last = first] = extra[0].split(/[～~—–-]/u).map(Number);
        if (first > 0 && last >= first) results.push({ text: extra[0],
          index: match.index + match[0].length + extra.index, book: aliases.get(match[1]),
          chapter, startVerse: first, endVerse: last });
      }
    }
  }
  return results;
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
