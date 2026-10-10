from html.parser import HTMLParser
from urllib.request import urlopen
from urllib.parse import urljoin,urlparse
from concurrent.futures import ThreadPoolExecutor
import json,re
BASE='https://simplified.lsmchinese.org/lifestudy/'
class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[];self.active=None
 def handle_starttag(self,t,a):
  if t=='a':self.active=[dict(a).get('href',''),'']
 def handle_data(self,s):
  if self.active:self.active[1]+=s
 def handle_endtag(self,t):
  if t=='a' and self.active:self.links.append(self.active);self.active=None

def links(url):
 with urlopen(url,timeout=30) as r: html=r.read().decode('utf-8')
 p=Links();p.feed(html);return p.links

def collect(entry):
 href,name=entry;index=urljoin(BASE,href);id=href.split('/')[-1].replace('-idx.html','');messages=[]
 for path,title in links(index):
  source=urljoin(index,path)
  if re.fullmatch(r'[A-Za-z0-9]+\d+\.html', path) and title.strip() and source!=index:
   assert urlparse(source).hostname=='simplified.lsmchinese.org' and '/lifestudy/' in source
   if source not in [m['source'] for m in messages]:messages.append({'number':len(messages)+1,'title':title.strip(),'source':source})
 assert messages,(id,'empty')
 return {'id':id,'name':name.strip(),'testament':'旧约' if href.startswith('ot/') else '新约','indexSource':index,'messages':messages}
entries=[(h,t) for h,t in links(BASE+'index.html') if h.endswith('-idx.html')]
with ThreadPoolExecutor(max_workers=4) as pool: books=list(pool.map(collect,entries))
assert len({b['id'] for b in books})==len(books)
open('src/books.json','w').write(json.dumps(books,ensure_ascii=False,indent=2)+'\n')
print('Catalogs:',len(books),'messages:',sum(len(b['messages']) for b in books))
for b in books: print(b['id'],b['name'],len(b['messages']))
