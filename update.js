// Fetches @sg88hk's own posts + posts that tag @sg88hk via the official
// Instagram Graph API, and writes 4 pages to docs/ (served by GitHub Pages):
//   follow-zh.html / follow-en.html  -> 關注我們 (own posts)
//   tagged-zh.html / tagged-en.html  -> 網友分享 (tagged posts)
const fs = require('fs');
const path = require('path');

const { IG_USER_ID, IG_TOKEN } = process.env;
const HIDE = (process.env.HIDE || '').split(',').map(s => s.trim()).filter(Boolean);
const MAX = 12;
const OUT = path.join(__dirname, 'docs');
const IMG = path.join(OUT, 'img');
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,username,timestamp';

async function getList(edge) {
  const url = `https://graph.facebook.com/v21.0/${IG_USER_ID}/${edge}?fields=${FIELDS}&limit=30&access_token=${IG_TOKEN}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(`Instagram API (${edge}): ${data.error.message}`);
  const posts = [];
  for (const p of data.data || []) {
    if (posts.length >= MAX) break;
    if (HIDE.some(h => h === p.id || (p.permalink || '').includes(h))) continue;
    const src = p.media_type === 'VIDEO' ? (p.thumbnail_url || p.media_url) : p.media_url;
    const file = p.id + '.jpg';
    // Keep a local copy: Instagram image links expire after a few days
    if (src && !fs.existsSync(path.join(IMG, file))) {
      try {
        const r = await fetch(src);
        if (r.ok) fs.writeFileSync(path.join(IMG, file), Buffer.from(await r.arrayBuffer()));
      } catch (e) { console.warn('Image failed', p.id, e.message); }
    }
    posts.push({
      id: p.id, link: p.permalink, user: p.username ? '@' + p.username : '',
      img: fs.existsSync(path.join(IMG, file)) ? 'img/' + file : null,
      video: p.media_type === 'VIDEO',
    });
  }
  return posts;
}

async function main() {
  if (!IG_USER_ID || !IG_TOKEN) throw new Error('Missing IG_USER_ID or IG_TOKEN secret');
  fs.mkdirSync(IMG, { recursive: true });
  const own = await getList('media');
  let tagged = [];
  try { tagged = await getList('tags'); } catch (e) { console.warn(e.message); }

  const keep = new Set([...own, ...tagged].map(p => p.id + '.jpg'));
  for (const f of fs.readdirSync(IMG)) if (!keep.has(f)) fs.unlinkSync(path.join(IMG, f));

  fs.writeFileSync(path.join(OUT, 'posts.json'), JSON.stringify({ own, tagged, updated: new Date().toISOString() }, null, 2));
  for (const lang of ['zh', 'en']) {
    fs.writeFileSync(path.join(OUT, `follow-${lang}.html`), page(own, lang, false));
    fs.writeFileSync(path.join(OUT, `tagged-${lang}.html`), page(tagged, lang, true));
  }
  console.log(`Updated: ${own.length} own posts, ${tagged.length} tagged posts`);
}

const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IG_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>';
const PLAY = '<svg width="38" height="38" viewBox="0 0 24 24" fill="rgba(255,255,255,.92)"><path d="M8 5v14l11-7z"/></svg>';
const CHEV = d => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;

function page(posts, lang, showUser) {
  const zh = lang === 'zh';
  const empty = zh ? '暫時未有帖文' : 'No posts yet';
  const tiles = posts.map(p => `<a class="t" href="${esc(p.link)}" target="_blank" rel="noopener">${
      p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : `<iframe src="${esc(p.link)}embed/" scrolling="no" loading="lazy"></iframe>`
    }${p.video ? `<span class="play">${PLAY}</span>` : ''}<span class="ov">${IG_ICON}${showUser && p.user ? `<span>${esc(p.user)}</span>` : ''}</span></a>`).join('');
  return `<!DOCTYPE html>
<html lang="${zh ? 'zh-Hant-HK' : 'en'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;height:100%;background:transparent;overflow:hidden;font-family:Georgia,serif}
  .wrap{position:relative;height:100%}
  .row{display:flex;gap:24px;height:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none}
  .row::-webkit-scrollbar{display:none}
  .t{position:relative;flex:0 0 auto;height:100%;aspect-ratio:1/1;overflow:hidden;background:#f2f2f2;display:block;scroll-snap-align:start}
  .t img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
  .t iframe{display:block;width:100%;height:1000px;border:0;margin-top:-54px;pointer-events:none}
  .t:hover img{transform:scale(1.04)}
  .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
  .ov{position:absolute;inset:0;background:rgba(17,17,17,.5);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:14px;letter-spacing:.04em;opacity:0;transition:opacity .35s}
  .t:hover .ov{opacity:1}
  .nav{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#333;box-shadow:0 1px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .3s}
  .nav.on{opacity:1;pointer-events:auto}
  .prev{left:8px}.next{right:8px}
  .empty{display:flex;align-items:center;justify-content:center;height:100%;font-size:15px;color:#8a8073;letter-spacing:.05em}
</style></head>
<body>${posts.length ? `<div class="wrap"><div class="row" id="r">${tiles}</div>
<button class="nav prev" id="p" aria-label="${zh ? '上一組' : 'Previous'}">${CHEV('l')}</button>
<button class="nav next" id="n" aria-label="${zh ? '下一組' : 'Next'}">${CHEV('r')}</button></div>
<script>
  var r=document.getElementById('r'),p=document.getElementById('p'),n=document.getElementById('n');
  function upd(){p.classList.toggle('on',r.scrollLeft>4);n.classList.toggle('on',r.scrollLeft+r.clientWidth<r.scrollWidth-4);}
  p.onclick=function(){r.scrollBy({left:-r.clientWidth,behavior:'smooth'})};
  n.onclick=function(){r.scrollBy({left:r.clientWidth,behavior:'smooth'})};
  r.addEventListener('scroll',upd);window.addEventListener('resize',upd);upd();
</script>` : `<div class="empty">${empty}</div>`}</body></html>`;
}

main().catch(e => { console.error(e.message); process.exit(1); });
