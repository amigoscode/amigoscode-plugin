// Render a Submagic-style animated caption overlay as a transparent PNG sequence.
//   node caption-render.mjs <wordsJson> <framesDir> <W> <H> <fps> <dur> <capCenterY> <fontSize> <emojiY>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromePath } from './paths.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const CHROME = chromePath();

const [wordsJson, framesDir, W, H, FPS, DUR, CAP_Y, FONT, EMOJI_Y] =
  process.argv.slice(2).map((x, i) => (i >= 2 && i <= 8 ? Number(x) : x));
const words = JSON.parse(fs.readFileSync(wordsJson, 'utf8'));

// curated keyword -> emoji. Broad enough to cover every diagram topic, but the
// per-video scripts only hit a handful of these, so captions stay tasteful.
// Override for a single run with EMOJI_JSON=<path-to-json>.
const EMOJI = (() => {
  const base = {
    // request-flow
    request: '📨', boot: '🍃', controller: '🎮', service: '⚙️',
    repository: '🗄️', database: '💾', response: '📦', bug: '🐛',
    // kafka
    kafka: '🟣', queue: '📮', log: '📜', producer: '📤', producers: '📤',
    consumer: '📥', consumers: '📥', topic: '📋', partition: '🗂️',
    partitions: '🗂️', offset: '📍', replay: '⏪', broker: '🖥️',
    // shared backend vocabulary (used by other diagrams)
    cache: '🧊', redis: '🧊', thread: '🧵', threads: '🧵', lock: '🔒',
    retry: '🔁', index: '📇', pool: '🏊', deadlock: '💀', token: '🎟️',
    scale: '📈', replica: '📑', saga: '🧩', jwt: '🔑', memory: '🧠',
  };
  const p = process.env.EMOJI_JSON;
  if (p) { try { return { ...base, ...JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch {} }
  return base;
})();

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800;900&display=swap" rel="stylesheet">
<style>
 html,body{margin:0;background:transparent;}
 #stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:'Epilogue',system-ui,sans-serif;}
 #emoji{position:absolute;left:0;right:0;top:${EMOJI_Y}px;text-align:center;font-size:96px;line-height:1;transform-origin:center center;will-change:transform,opacity;}
 #wrap{position:absolute;left:50%;top:${CAP_Y}px;transform:translate(-50%,-50%);
   width:900px;text-align:center;line-height:1.18;}
 .w{display:inline-block;margin:4px 8px;font-size:${FONT}px;font-weight:800;letter-spacing:-0.5px;
   text-transform:uppercase;color:#20273e;
   text-shadow:0 2px 10px rgba(255,255,255,0.9),0 0 2px rgba(255,255,255,0.9);}
 .w.active{color:#fff;background:#7f56d9;border-radius:14px;padding:2px 16px;margin:4px 8px;
   box-shadow:0 8px 22px rgba(127,86,217,0.45);text-shadow:none;}
</style></head><body>
<div id="stage"><div id="emoji"></div><div id="wrap"></div></div>
<script>
 const WORDS = ${JSON.stringify(words)};
 const EMOJI = ${JSON.stringify(EMOJI)};
 const clean = (t)=>t.toLowerCase().replace(/[^a-z]/g,'');
 // group into short caption chunks (<=3 words, break on sentence/comma end)
 const chunks=[]; let cur=[];
 for(const w of WORDS){ cur.push(w);
   if(cur.length>=3 || /[.,!?]$/.test(w.text)){ chunks.push(cur); cur=[]; } }
 if(cur.length) chunks.push(cur);
 const C = chunks.map(ws=>({ws,start:ws[0].start,end:ws[ws.length-1].end}));
 for(let i=0;i<C.length;i++) C[i].hold = (i+1<C.length? C[i+1].start : C[i].end+0.6);
 const wrap=document.getElementById('wrap'), emo=document.getElementById('emoji');
 function ease(x){return 1-Math.pow(1-x,3);}
 function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}
 // emoji events: each keyword emoji animates in and holds briefly past its word
 const EV=[]; for(const w of WORDS){ const e=EMOJI[clean(w.text)]; if(e) EV.push({e,start:w.start,until:w.end+0.55}); }
 window.__setTime=function(t){
   let ci=-1;
   for(let i=0;i<C.length;i++){ if(t>=C[i].start-0.06 && t<C[i].hold){ ci=i; break; } }
   if(ci<0){ wrap.innerHTML=''; emo.textContent=''; emo.style.opacity=0; return; }
   const ch=C[ci]; let html='';
   for(const w of ch.ws){
     const on = t>=w.start-0.02 && t<=w.end+0.06;
     const cls = on? 'w active':'w';
     let style='';
     if(on){ const p=Math.min(1,(t-w.start)/0.13); const s=1.28-0.28*ease(p);
       style='transform:scale('+s.toFixed(3)+');'; }
     html+='<span class="'+cls+'" style="'+style+'">'+w.text.replace(/[.,!?]+$/,'')+'</span>';
   }
   wrap.innerHTML=html;
   // emoji: animate in (fade + rise + bounce scale), hold, then fade out
   let ev=null; for(let i=EV.length-1;i>=0;i--){ if(t>=EV[i].start && t<EV[i].until){ ev=EV[i]; break; } }
   if(ev){
     const p=Math.min(1,(t-ev.start)/0.30);
     const s=Math.max(0.05,easeOutBack(p));            // 0 -> overshoot -> 1
     const ty=(1-ease(p))*34;                          // rises up into place
     let op=Math.min(1,(t-ev.start)/0.12);             // quick fade in
     const fo=(ev.until-t)/0.22; if(fo<1) op=Math.min(op,Math.max(0,fo)); // fade out
     emo.textContent=ev.e; emo.style.opacity=op.toFixed(3);
     emo.style.transform='translateY('+ty.toFixed(1)+'px) scale('+s.toFixed(3)+')';
   } else { emo.textContent=''; emo.style.opacity=0; }
 };
</script></body></html>`;

const N = Math.ceil(DUR * FPS);
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
const hp = path.join(framesDir, '_cap.html');
fs.writeFileSync(hp, html);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto('file://' + hp, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts && document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));
const el = await page.$('#stage');
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => new Promise((res) => { window.__setTime(tt); requestAnimationFrame(() => requestAnimationFrame(res)); }), t);
  await el.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(4, '0')}.png`), omitBackground: true });
  if (f % 60 === 0) process.stdout.write(`  ${f}/${N}\r`);
}
await browser.close();
console.log(`\n${N} caption frames -> ${framesDir}`);
