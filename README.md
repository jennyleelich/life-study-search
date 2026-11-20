# Life-study search

A Chinese Life-study reader with interactive Bible references. Requires Node.js 24 or later; no dependencies to install.

```sh
cd /workspace/life-study-search
npm start
npm test
```

The server listens on port 3000 (`PORT` can override it). `npm start` enables Node's environment proxy support for cloud networking. `npm start` works in Windows Command Prompt, PowerShell, macOS, and Linux without shell-specific environment assignments. It loads the selected Life-study page on the server, avoiding browser cross-origin restrictions. Source markup is reduced to text and permitted formatting before display. Hover or keyboard focus opens a card with simplified Chinese Recovery Version verses. Clicking a reference opens the Recovery Version site's reference-result page in a new tab, independently of whether the hover request succeeds. Escape closes the card.

## Sources and behavior

If the original article opens in a browser but not in the reader, restart using `npm start`. The launcher enables Node's system certificate trust as well as its normal certificate verification. It uses `HTTP_PROXY`/`HTTPS_PROXY` settings when supplied; it does not automatically copy a browser's proxy configuration. The reader reports certificate, DNS, connection, and timeout failures separately and offers a retry button. These messages help identify local networking problems; a working browser alone does not establish that Node can reach the site.

Allow `simplified.lsmchinese.org`, `recoveryversion.com.tw`, and `www.recoveryversion.com.tw` in restricted cloud networking. No API key is needed. All 63 source-site book catalogs (1,983 messages) are included. Samuel, Kings and Chronicles each combine their two biblical volumes in one Life-study catalog. The book selector groups Old and New Testament books; the message selector lists all messages in the selected book. The “全部篇目索引” link returns to that book's complete index. Previous/next links stay within the selected book.

`src/books.json` preserves titles and actual article URLs from the source indexes, including different filename conventions and single-message books. To refresh the catalog, run `python scripts/update-catalog.py` from the repository root (Python 3, standard library only). The home page opens Genesis's index. `/?book=matt` opens Matthew's index, and `/?book=matt&message=1` opens its first message. Legacy `/?message=4` links still open Genesis. Browser back/forward restores the book and message. Articles are fetched on demand with a bounded in-memory cache; source paragraph breaks are preserved.

The current message's section headings appear in a sticky left-hand navigation on desktop, or above the reader on smaller screens. Click a heading to jump to its original location; the current section is highlighted during scrolling. Heading anchors can be bookmarked together with the message URL. The navigation refreshes when changing messages and is hidden when no headings are detected.

## Genesis 1–4 seed-thought review

A separate editorial study is inserted after Genesis message 25 and before message 26, without renumbering the 120 source messages. Open `/?book=gen&message=1001`, choose its “专题整理” entry, or use Next from message 25. It contains 30 themes, covering all 106 verses of Genesis 1–4 in order. The section navigation includes each chapter and theme. Related-message links return to the original study pages.

`src/genesis-seeds.js` contains original summaries based on a review of Life-study messages 1–25, with message references and further Bible references. These are editorial summaries of that work's interpretations, not quotations or a claim that the author supplied this exact 30-item list. Full simplified Recovery Version verse text is fetched at runtime from its existing source API and is not copied into the repository. Failed or incomplete chapter requests are explicitly marked; summaries remain available and a retry button reloads the verses. The insertion is computed separately from `src/books.json`, so refreshing source catalogs does not remove the study.

The provider uses the source site's own `GET /api/getVerses?VERSION=2&refs=1.7.17,...` API. VERSION 2 supplies simplified Chinese. The `/ref/創七17～24` route displays the corresponding verse results on the source site. Book numbers follow its 66-book order. Multiple units belonging to one verse are joined in order. Missing or incomplete verses produce an explicit error. Successful queries are cached in memory; errors are not cached. Remote service outages remain possible.

The parser supports simplified and traditional book abbreviations, Chinese chapter numbers including `二一`, verse ranges including fullwidth hyphens, and omitted-book continuations such as `启二一25下，二二5`. Cross-chapter ranges and references that omit verse numbers are not currently supported. Provider tests use fixtures. All books' first and last articles (121 distinct pages) were separately checked against the source website, with browser checks for representative Old/New Testament books and live verse previews. Every individual article and citation has not been exhaustively tested.
