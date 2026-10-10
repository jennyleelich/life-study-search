import { findReferences, recoverySearchUrl } from '/references.js';
import { headingLevel } from '/headings.js';

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
window.addEventListener('scroll', () => { if (active && !card.hidden) placeCard(active); updateSectionHighlight(); }, { passive: true });

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

const status = document.querySelector('#status');
const selector = document.querySelector('#message-select');
const sectionSidebar = document.querySelector('#section-sidebar');
const sectionList = document.querySelector('#section-list');
let sections = [];

function clearSections() {
  sections = [];
  sectionList.replaceChildren();
  sectionSidebar.hidden = true;
}

function updateSectionHighlight() {
  if (!sections.length) return;
  let current = sections[0];
  for (const section of sections) {
    if (section.heading.getBoundingClientRect().top <= 100) current = section;
  }
  for (const section of sections) {
    if (section === current) section.link.setAttribute('aria-current', 'location');
    else section.link.removeAttribute('aria-current');
  }
}

function buildSections(article) {
  clearSections();
  // Most original messages use plain text lines for headings, inside one <p>.
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement.closest('h1,h2,h3,h4,a,button')) continue;
    const lines = node.textContent.split(/(\r\n|\n|\r)/);
    if (!lines.some(line => headingLevel(line) !== null)) continue;
    const fragment = document.createDocumentFragment();
    for (const line of lines) {
      if (headingLevel(line) !== null) {
        const heading = document.createElement('span');
        heading.className = 'section-heading';
        heading.dataset.level = headingLevel(line);
        heading.textContent = line;
        fragment.append(heading);
      } else fragment.append(document.createTextNode(line));
    }
    node.replaceWith(fragment);
  }
  const parents = [];
  for (const [index, heading] of [...article.querySelectorAll('.section-heading,h1,h2,h3,h4')].entries()) {
    if (!heading.textContent.trim()) continue;
    heading.id = `section-${index + 1}`;
    heading.classList.add('section-heading');
    heading.tabIndex = -1;
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      hide();
      history.replaceState(null, '', link.href);
      heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      heading.focus({ preventScroll: true });
    });
    const item = document.createElement('li');
    item.append(link);
    const level = heading.dataset.level !== undefined ? Number(heading.dataset.level)
      : headingLevel(heading.textContent) ?? Number(heading.tagName.slice(1)) - 1;
    item.dataset.level = level;
    while (parents.length && parents.at(-1).level >= level) parents.pop();
    let list = sectionList;
    if (parents.length) {
      const parent = parents.at(-1).item;
      list = parent.querySelector(':scope > ol');
      if (!list) { list = document.createElement('ol'); parent.append(list); }
    }
    list.append(item);
    parents.push({ level, item });
    sections.push({ heading, link });
  }
  sectionSidebar.hidden = !sections.length;
  updateSectionHighlight();
}

let messages = [];
let articleRequest;
let loadSequence = 0;

function messageUrl(number) { return `/?message=${number}`; }
function updateNavigation(number) {
  const index = messages.findIndex(item => item.number === number);
  selector.value = String(number);
  for (const [id, item] of [['previous', messages[index - 1]], ['next', messages[index + 1]]]) {
    const link = document.querySelector(`#${id}`);
    link.setAttribute('aria-disabled', String(!item));
    if (item) { link.href = messageUrl(item.number); link.title = item.title; }
    else { link.removeAttribute('href'); link.removeAttribute('title'); }
  }
  const bottom = document.querySelector('#bottom-nav');
  bottom.replaceChildren(...['previous', 'next'].map(id => {
    const link = document.querySelector(`#${id}`).cloneNode(true);
    link.removeAttribute('id');
    return link;
  }));
}

async function loadArticle(number) {
  articleRequest?.abort();
  articleRequest = new AbortController();
  const current = ++loadSequence;
  hide();
  clearSections();
  const article = document.querySelector('#article');
  article.replaceChildren();
  document.querySelector('#example').hidden = true;
  document.querySelector('#bottom-nav').hidden = true;
  article.setAttribute('aria-busy', 'true');
  status.textContent = `正在载入第 ${number} 篇…`;
  updateNavigation(number);
  const original = document.querySelector('#original');
  original.href = `https://simplified.lsmchinese.org/lifestudy/ot/gen${String(number).padStart(3, '0')}.html`;
  try {
    const response = await fetch(`/api/article?message=${number}`, { signal: articleRequest.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '原文载入失败。');
    if (current !== loadSequence) return;
    const source = new DOMParser().parseFromString(data.html, 'text/html');
    const body = source.querySelector('.ls-text, article, main');
    if (!body?.textContent.trim()) throw new Error('来源页面没有可读取的文章内容。');
    copyContent(body, article);
    buildSections(article);
    enhance(article);
    const title = source.querySelector('.msg-title')?.textContent || messages.find(item => item.number === number).title;
    status.textContent = title;
    document.title = `${title} · 生命读经`;
    document.querySelector('#bottom-nav').hidden = false;
    const target = sections.find(section => `#${section.heading.id}` === location.hash);
    if (target) target.heading.scrollIntoView({ block: 'start' });
  } catch (error) {
    if (current !== loadSequence || error.name === 'AbortError') return;
    status.textContent = `原文暂时无法载入：${error.message}。请选择其他篇目或刷新重试。`;
  } finally {
    if (current === loadSequence) article.removeAttribute('aria-busy');
  }
}

function navigate(number) {
  history.pushState(null, '', messageUrl(number));
  window.scrollTo(0, 0);
  loadArticle(number);
}
selector.addEventListener('change', () => navigate(Number(selector.value)));
for (const nav of document.querySelectorAll('.message-nav, .bottom-nav')) {
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(Number(new URL(link.href).searchParams.get('message')));
  });
}
function selectedMessage() {
  const value = new URL(location.href).searchParams.get('message') ?? '4';
  const number = Number(value);
  return /^\d+$/.test(value) && messages.some(item => item.number === number) ? number : null;
}
function loadSelectedMessage() {
  const number = selectedMessage();
  if (number !== null) loadArticle(number);
  else {
    articleRequest?.abort();
    loadSequence++;
    hide();
    clearSections();
    document.querySelector('#article').replaceChildren();
    document.querySelector('#bottom-nav').hidden = true;
    selector.value = '';
    for (const id of ['previous', 'next']) {
      const link = document.querySelector(`#${id}`);
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
    status.textContent = '篇目不存在，请从目录中选择。';
  }
}
window.addEventListener('popstate', loadSelectedMessage);
try {
  const response = await fetch('/api/messages');
  if (!response.ok) throw new Error('目录载入失败');
  messages = await response.json();
  selector.replaceChildren(...messages.map(item => {
    const option = document.createElement('option');
    option.value = item.number;
    option.textContent = item.title;
    return option;
  }));
  selector.disabled = false;
  loadSelectedMessage();
} catch (error) {
  status.textContent = `目录暂时无法载入：${error.message}。请刷新重试。`;
}
