# Life-study search

A Chinese Life-study reader with interactive Bible references. Requires Node.js 24 or later; no dependencies to install.

```sh
cd /workspace/life-study-search
npm start
npm test
```

The server listens on port 3000 (`PORT` can override it). `npm start` enables Node's environment proxy support for cloud networking. It loads the requested Genesis Life-study page on the server, avoiding browser cross-origin restrictions. Source markup is reduced to text and permitted formatting before display. Hover or keyboard focus opens a card with simplified Chinese Recovery Version verses. Clicking a reference opens the Recovery Version site's reference-result page in a new tab, independently of whether the hover request succeeds. Escape closes the card.

## Sources and behavior

Allow `simplified.lsmchinese.org`, `recoveryversion.com.tw`, and `www.recoveryversion.com.tw` in restricted cloud networking. No API key is needed. The source reader currently targets Genesis Life-study message four, as requested.

The provider uses the source site's own `GET /api/getVerses?VERSION=2&refs=1.7.17,...` API. VERSION 2 supplies simplified Chinese. The `/ref/創七17～24` route displays the corresponding verse results on the source site. Book numbers follow its 66-book order. Multiple units belonging to one verse are joined in order. Missing or incomplete verses produce an explicit error. Successful queries are cached in memory; errors are not cached. Remote service outages remain possible.

The parser supports simplified and traditional book abbreviations, Chinese chapter numbers, verse ranges, and continuation verses such as `创八13～17，22`. Cross-chapter ranges and references that omit verse numbers are not currently supported. Provider tests use fixtures; live article retrieval and Genesis 7:17–24 were separately checked against the source websites.
