import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { lookupVerses as recoveryLookup } from './src/recovery.js';
import { BOOKS } from './src/references.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const source = 'https://simplified.lsmchinese.org/lifestudy/ot/gen004.html';
const files = new Map([
  ['/', ['public/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['public/app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['public/style.css', 'text/css; charset=utf-8']],
  ['/references.js', ['src/references.js', 'text/javascript; charset=utf-8']],
]);

export function createServer({ fetchArticle = async () => {
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Life-study website returned HTTP ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || '';
  const prefix = new TextDecoder().decode(bytes.slice(0, 4096));
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1]
    || /charset\s*=\s*["']?([\w-]+)/i.exec(prefix)?.[1] || 'utf-8';
  return { html: new TextDecoder(charset).decode(bytes), source };
}, lookupVerses = recoveryLookup } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const json = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    if (request.method !== 'GET') return json(405, { error: 'Method not allowed.' });
    try {
      if (url.pathname === '/api/article') return json(200, await fetchArticle());
      if (url.pathname === '/api/verses') {
        const book = url.searchParams.get('book');
        const chapter = Number(url.searchParams.get('chapter'));
        const startVerse = Number(url.searchParams.get('startVerse'));
        const endVerse = Number(url.searchParams.get('endVerse'));
        if (!BOOKS.some(entry => entry[2] === book) || ![chapter, startVerse, endVerse].every(
          value => Number.isInteger(value) && value > 0 && value <= 200)
          || endVerse < startVerse || endVerse - startVerse > 100) {
          return json(400, { error: 'Invalid Bible reference.' });
        }
        if (!lookupVerses) return json(503, {
          error: '恢复本经文查询尚未接通：需要先验证来源网站的查询接口。',
        });
        return json(200, await lookupVerses({ book, chapter, startVerse, endVerse }));
      }
      const file = files.get(url.pathname);
      if (!file) return json(404, { error: 'Not found.' });
      response.writeHead(200, { 'Content-Type': file[1],
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'",
        'X-Content-Type-Options': 'nosniff' });
      response.end(await readFile(resolve(root, file[0])));
    } catch (error) {
      json(502, { error: error.message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () => console.log(`Life-study website listening on port ${port}`));
}
