import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { lookupVerses as recoveryLookup } from './src/recovery.js';
import { BOOKS } from './src/references.js';
import { networkErrorMessage } from './src/network-errors.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const books = JSON.parse(await readFile(new URL('./src/books.json', import.meta.url), 'utf8'));
const articleCache = new Map();
const files = new Map([
  ['/', ['public/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['public/app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['public/style.css', 'text/css; charset=utf-8']],
  ['/references.js', ['src/references.js', 'text/javascript; charset=utf-8']],
  ['/headings.js', ['src/headings.js', 'text/javascript; charset=utf-8']],
]);

export function createServer({ fetchArticle = async (message, bookId, source) => {
  const cacheKey = `${bookId}:${message}`;
  if (articleCache.has(cacheKey)) return articleCache.get(cacheKey);
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Life-study website returned HTTP ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || '';
  const prefix = new TextDecoder().decode(bytes.slice(0, 4096));
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1]
    || /charset\s*=\s*["']?([\w-]+)/i.exec(prefix)?.[1] || 'utf-8';
  const result = { html: new TextDecoder(charset).decode(bytes), source };
  if (articleCache.size >= 50) articleCache.delete(articleCache.keys().next().value);
  articleCache.set(cacheKey, result);
  return result;
}, lookupVerses = recoveryLookup } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const json = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    if (request.method !== 'GET') return json(405, { error: 'Method not allowed.' });
    try {
      if (url.pathname === '/api/books') return json(200, books);
      if (url.pathname === '/api/messages' || url.pathname === '/api/article') {
        const bookId = url.searchParams.get('book') ?? 'gen';
        const book = books.find(item => item.id === bookId);
        if (!book) return json(400, { error: '书卷不存在，请从书卷列表中选择。' });
        const messages = book.messages;
        if (url.pathname === '/api/messages') return json(200, messages);
        const value = url.searchParams.get('message') ?? (bookId === 'gen' ? '4' : '1');
        const message = Number(value);
        if (!/^\d+$/.test(value) || !messages.some(item => item.number === message)) {
          return json(400, { error: '篇目不存在，请从目录中选择。' });
        }
        return json(200, await fetchArticle(message, bookId, messages.find(item => item.number === message).source));
      }
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
      json(502, { error: networkErrorMessage(error) });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () => console.log(`Life-study website listening on port ${port}`));
}
