/** Classify standalone outline lines without changing their original text. */
export function headingLevel(text) {
  const line = text.trim().normalize('NFKC');
  if (!line || line.length > 110 || /[。！？!?]/u.test(line)) return null;
  if (/^[壹贰貳叁參参肆伍陆陸柒捌玖拾]+[\s、.]+\S/u.test(line)) return 0;
  if (/^[一二三四五六七八九十百]+[\s、.]+\S/u.test(line)) return 1;
  if (/^\d+[\s、.]+\S/u.test(line)) return 2;
  if (/^[a-zA-Z][\s、.]*[\u3400-\u9fff]/u.test(line)) return 3;
  if (/^\([一二三四五六七八九十百零〇○壹贰叁肆伍陆柒捌玖拾\d]+\)\s*\S/u.test(line)) return 4;
  return null;
}
