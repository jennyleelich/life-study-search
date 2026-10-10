import { findReferences, recoverySearchUrl } from '/references.js';

const card = document.querySelector('#verse-card');
const content = document.querySelector('#verse-content');
const search = document.querySelector('#verse-search');
const cache = new Map();
let active = null;
let hideTimer;
let sequence = 0;

function safeSearchUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['recoveryversion.com.tw', 'www.recoveryversion.com.tw'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

async function lookup(reference) {
  const params = new URLSearchParams({ book: reference.book, chapter: reference.chapter,
    startVerse: reference.startVerse, endVerse: reference.endVerse });
  const key = params.toString();
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(`/api/verses?${params}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '经文暂时无法载入。');
  const url = safeSearchUrl(result.searchUrl);
  if (!url || !Array.isArray(result.verses) || !result.verses.length || result.verses.some(
    verse => !Number.isInteger(verse.number) || typeof verse.text !== 'string')) {
    throw new Error('经文来源返回的结果不完整。');
  }
  const data = { ...result, searchUrl: url };
  cache.set(key, data);
  return data;
}

function placeCard(anchor) {
  const bounds = anchor.getBoundingClientRect();
  const below = innerHeight - bounds.bottom - 26;
  const above = bounds.top - 26;
  const placeBelow = below >= Math.min(480, above);
  card.style.maxHeight = `${Math.max(80, Math.min(480, placeBelow ? below : above))}px`;
  card.style.left = `${Math.max(16, Math.min(bounds.left, innerWidth - card.offsetWidth - 16))}px`;
  card.style.top = `${Math.max(16, placeBelow ? bounds.bottom + 10 : bounds.top - card.offsetHeight - 10)}px`;
}

async function show(anchor, reference) {
  clearTimeout(hideTimer);
  active?.setAttribute('aria-expanded', 'false');
  active = anchor;
  anchor.setAttribute('aria-expanded', 'true');
  const current = ++sequence;
  card.hidden = false;
  document.querySelector('#verse-title').textContent = reference.text;
  content.textContent = '正在查询恢复本经文…';
  search.hidden = true;
  search.removeAttribute('href');
  placeCard(anchor);
  try {
    const data = await lookup(reference);
    if (current !== sequence) return;
    content.textContent = data.verses.map(verse => `${verse.number}  ${verse.text}`).join('\n\n');
    search.href = data.searchUrl;
    search.hidden = false;
  } catch (error) {
    if (current === sequence) content.textContent = error.message;
  }
  if (current === sequence) placeCard(anchor);
}

function hide() {
  sequence++;
  card.hidden = true;
  active?.setAttribute('aria-expanded', 'false');
}
const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 250); };
card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
card.addEventListener('mouseleave', scheduleHide);
document.querySelector('#close-card').addEventListener('click', () => { hide(); active?.focus(); hide(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
window.addEventListener('resize', hide);
window.addEventListener('scroll', () => { if (active && !card.hidden) placeCard(active); });

function enhance(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement.closest('a, button')) continue;
    const references = findReferences(node.textContent);
    if (!references.length) continue;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const reference of references) {
      fragment.append(node.textContent.slice(offset, reference.index));
      const button = document.createElement('a');
      button.href = recoverySearchUrl(reference);
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
      button.className = 'reference';
      button.textContent = reference.text;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `${reference.text}，预览经文；点击打开查询结果`);
      button.addEventListener('mouseenter', () => show(button, reference));
      button.addEventListener('focus', () => show(button, reference));
      button.addEventListener('mouseleave', scheduleHide);
      button.addEventListener('blur', event => { if (!card.contains(event.relatedTarget)) scheduleHide(); });
      fragment.append(button);
      offset = reference.index + reference.text.length;
    }
    fragment.append(node.textContent.slice(offset));
    node.replaceWith(fragment);
  }
}

// Copy only inert text and a small set of formatting elements from the source.
function copyContent(source, destination) {
  const allowed = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'BR', 'B', 'STRONG', 'EM', 'I', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'TR', 'TD']);
  const excluded = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'NAV', 'HEADER', 'FOOTER', 'FORM', 'NOSCRIPT', 'SVG']);
  for (const node of source.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) destination.append(document.createTextNode(node.textContent));
    else if (node.nodeType === Node.ELEMENT_NODE && !excluded.has(node.tagName)) {
      const target = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
      copyContent(node, target);
      destination.append(target);
    }
  }
}

try {
  const response = await fetch('/api/article');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '原文载入失败。');
  const source = new DOMParser().parseFromString(data.html, 'text/html');
  const body = source.querySelector('.ls-text, article, main') || source.body;
  const article = document.querySelector('#article');
  copyContent(body, article);
  if (!article.textContent.trim()) throw new Error('来源页面没有可读取的内容。');
  enhance(article);
  document.querySelector('#status').textContent = source.querySelector('.msg-title')?.textContent || '原文已载入。悬停出处查看经文，点击打开查询结果。';
} catch (error) {
  document.querySelector('#status').textContent = `原文暂时无法载入：${error.message}`;
  document.querySelector('#example').hidden = false;
  enhance(document.querySelector('#example-text'));
}
