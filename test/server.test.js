import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function runServer(t, options) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves the page and article through the same origin', async t => {
  const base = await runServer(t, { fetchArticle: async () => ({ html: '<p>创七17～24</p>' }) });
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /生命读经/);
  assert.deepEqual(await (await fetch(`${base}/api/article`)).json(), { html: '<p>创七17～24</p>' });
  assert.equal((await fetch(`${base}/server.js`)).status, 404);
});

test('lists all Genesis messages and validates article selection', async t => {
  const base = await runServer(t, { fetchArticle: async number => ({ number }) });
  const messages = await (await fetch(`${base}/api/messages`)).json();
  assert.equal(messages.length, 120);
  assert.deepEqual(messages.map(item => item.number), Array.from({ length: 120 }, (_, index) => index + 1));
  for (const number of [1, 4, 120]) {
    assert.deepEqual(await (await fetch(`${base}/api/article?message=${number}`)).json(), { number });
  }
  for (const value of ['0', '121', '../gen001', '1.5', '']) {
    assert.equal((await fetch(`${base}/api/article?message=${encodeURIComponent(value)}`)).status, 400);
  }
});

test('passes normalized references to a provider and rejects invalid ranges', async t => {
  const base = await runServer(t, { lookupVerses: async reference => ({ reference,
    verses: [{ number: 17, text: 'Test fixture only' }], searchUrl: 'https://recoveryversion.com.tw/' }) });
  const query = '/api/verses?book=Genesis&chapter=7&startVerse=17&endVerse=24';
  const result = await (await fetch(base + query)).json();
  assert.deepEqual(result.reference, { book: 'Genesis', chapter: 7, startVerse: 17, endVerse: 24 });
  assert.equal((await fetch(base + query.replace('endVerse=24', 'endVerse=1'))).status, 400);
});

test('reports missing provider and source failures without fabricating verses', async t => {
  const base = await runServer(t, { lookupVerses: null, fetchArticle: async () => { throw new Error('Source blocked'); } });
  assert.equal((await fetch(`${base}/api/verses?book=Genesis&chapter=7&startVerse=17&endVerse=24`)).status, 503);
  const response = await fetch(`${base}/api/article`);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'Source blocked');
});
