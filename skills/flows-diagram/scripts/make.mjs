// Shared pipeline for the animated flow-diagram series.
//
//   MODE=check node make.mjs <projectDir> <sceneFile> <outBase> "<title>" "<EYEBROW>" "<caption>"
//     check -> one landscape frame to .work/<outBase>-check.png (fast layout check)
//   node make.mjs <projectDir> <sceneFile> <outBase> "<title>" "<EYEBROW>" "<caption>"
//     full  -> <projectDir>/<outBase>.mp4  (1440x960 landscape)
//              <projectDir>/<outBase>.gif  (960x640 infinite loop)
//              <projectDir>/<outBase>-reel.mp4  (1080x1920 branded reel)
//
// projectDir may be absolute, or a folder name inside the workspace (e.g. "kafka-flow").
// The workspace is FLOWS_DIR, else the configured workspaceDir, else ~/flows, else
// ~/amigoscode-skills/flows. Each project needs animations.jsx + the named sceneFile
// (exporting window.SceneRouter).
//
// Example:
//   node make.mjs kafka-flow kafka-scene.jsx kafka-flow \
//     "How Kafka Works" "APACHE KAFKA" "Producers → Partitions → Consumer Group"

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { ASSETS_DIR, CACHE_DIR, chromePath, ensureCache, resolveProject, workspaceDir } from './paths.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME = chromePath();
const LOGO = path.join(ASSETS_DIR, 'amigoscode-logo.png');       // white wordmark (bottom)
const MARK = path.join(ASSETS_DIR, 'logo-mark.svg');             // purple mark (top)

const MODE = process.env.MODE || 'full';
const [projArg, sceneFile, outBase, TITLE, EYEBROW, CAPTION] = process.argv.slice(2);
if (!projArg || !sceneFile || !outBase) {
  console.error('usage: node make.mjs <projectDir> <sceneFile> <outBase> "<Title>" "<EYEBROW>" "<caption>"');
  process.exit(1);
}
const projectDir = resolveProject(projArg);
// per-render scratch, kept in the workspace so the skill folder stays clean
const WORK = path.join(workspaceDir({ create: true }), '.work', outBase);
fs.mkdirSync(WORK, { recursive: true });

await ensureCache();   // React + Babel, fetched once into .cache/

const Babel = require(path.join(CACHE_DIR, 'babel.js'));
const react = fs.readFileSync(path.join(CACHE_DIR, 'react.js'), 'utf8');
const reactDom = fs.readFileSync(path.join(CACHE_DIR, 'react-dom.js'), 'utf8');
const animations = fs.readFileSync(path.join(projectDir, 'animations.jsx'), 'utf8');
const scene = fs.readFileSync(path.join(projectDir, sceneFile), 'utf8');
const logoData = 'data:image/png;base64,' + fs.readFileSync(LOGO).toString('base64');
const logoInkData = 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS_DIR, 'amigoscode-logo-ink.png')).toString('base64');
const markData = 'data:image/svg+xml;base64,' + fs.readFileSync(MARK).toString('base64');

const opts = { presets: [[Babel.availablePresets['react'], { runtime: 'classic' }]] };
const compile = (code, name) => Babel.transform(code, { ...opts, filename: name }).code;
const cAnimations = compile(animations, 'animations.jsx');
const cScene = compile(scene, sceneFile);

const FPS = 30, DURATION = 10, N = FPS * DURATION;
const VARIANT = process.env.VARIANT || 'N-tier';   // scenes that ignore it (e.g. kafka) are unaffected
const mountFor = (dur) => `
(function(){
  var e = React.createElement, extSet = null;
  function Root(){
    var s = React.useState(0); extSet = s[1];
    var ctx = { time:s[0], duration:${dur}, playing:false, setTime:s[1], setPlaying:function(){} };
    return e(window.TimelineContext.Provider,{value:ctx}, e(window.SceneRouter,{variant:${JSON.stringify(VARIANT)},accent:'#5a37a6'}));
  }
  ReactDOM.createRoot(document.getElementById('stage')).render(e(Root));
  window.__setTime=function(v){ if(extSet) extSet(v); };
})();`;
const scripts = `<script>${react}</script><script>${reactDom}</script>
<script>(function(){${cAnimations}})();</script>
<script>(function(){${cScene}})();</script>`;

// Landscape: 1:1 SQUARE, composed like the reel. Purple mark at the top, then
// eyebrow + title pinned near the top edge, the full-width diagram centered in
// the middle, and the ink wordmark pinned near the bottom edge.
// CROP_TOP/CROP_BOTTOM trim the diagram's empty padding.
const LW = 1440, LH = 1440;
const CROP_TOP = +(process.env.CROP_TOP || 0), CROP_BOTTOM = +(process.env.CROP_BOTTOM || 0);
const CARD_H = 960 - CROP_TOP - CROP_BOTTOM;
// header (mark + eyebrow + title) pinned near the top, diagram top-aligned just
// below the title so it hugs the header, wordmark pinned near the bottom.
const CARD_TOP = 372;
const landscapeHTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@100..900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
 html,body{margin:0}
 #frame{position:relative;width:${LW}px;height:${LH}px;overflow:hidden;
   background:radial-gradient(125% 65% at 50% 30%, #FCFBFF 0%, #F1EEFA 100%);
   font-family:'Epilogue',system-ui,sans-serif;}
 /* make the diagram's own bg transparent so the frame's single background
    shows through continuously — mark, header, diagram and footer share one bg. */
 #stage svg rect[fill="url(#bgGrad)"]{fill:transparent !important;}
 .mark{position:absolute;top:74px;left:50%;transform:translateX(-50%);width:104px;height:104px;}
 .header{position:absolute;top:256px;left:0;right:0;text-align:center;padding:0 100px;}
 .eyebrow{color:#7F56D9;font-size:23px;font-weight:700;letter-spacing:8px;text-transform:uppercase;margin:0 0 14px;}
 .title{color:#20273e;font-size:54px;font-weight:800;line-height:1.05;letter-spacing:-1px;margin:0;}
 .card{position:absolute;top:${CARD_TOP}px;left:0;width:${LW}px;height:${CARD_H}px;overflow:hidden;}
 .card #stage{margin-top:-${CROP_TOP}px;}
 .card svg{display:block;width:${LW}px;height:960px;}
 .footer{position:absolute;bottom:74px;left:0;right:0;text-align:center;}
 .wordmark{width:286px;opacity:0.94;}
</style></head><body>
<div id="frame">
 <img class="mark" src="${markData}">
 <div class="header"><p class="eyebrow">${EYEBROW || ''}</p><h1 class="title">${TITLE || ''}</h1></div>
 <div class="card"><div id="stage"></div></div>
 <div class="footer"><img class="wordmark" src="${logoInkData}"></div>
</div>${scripts}<script>${mountFor(DURATION)}</script></body></html>`;

const reelHTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@100..900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
 html,body{margin:0}
 #reel{position:relative;width:1080px;height:1920px;overflow:hidden;
   background:radial-gradient(95% 48% at 50% 46%, #FCFBFF 0%, #F1EEFA 100%);
   font-family:'Epilogue',system-ui,sans-serif;}
 /* diagram bg transparent so the reel's single background shows through */
 #stage svg rect[fill="url(#bgGrad)"]{fill:transparent !important;}
 .glow{position:absolute;left:50%;top:52%;width:1240px;height:1240px;transform:translate(-50%,-50%);
   background:radial-gradient(circle, rgba(127,86,217,0.12), rgba(127,86,217,0) 60%);}
 .mark{position:absolute;top:104px;left:50%;transform:translateX(-50%);width:132px;height:132px;}
 .top{position:absolute;top:392px;left:0;right:0;text-align:center;padding:0 80px;}
 .eyebrow{color:#7F56D9;font-size:30px;font-weight:700;letter-spacing:9px;text-transform:uppercase;margin:0 0 20px;}
 .title{color:#20273e;font-size:78px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin:0;}
 .card{position:absolute;left:0;top:660px;width:1080px;height:720px;overflow:hidden;}
 .card svg{display:block;width:1080px;height:720px;}
 .caption{position:absolute;top:1452px;left:0;right:0;text-align:center;color:#7a7296;font-size:24px;font-weight:600;font-family:'JetBrains Mono',monospace;}
 .logo{position:absolute;bottom:150px;left:50%;transform:translateX(-50%);width:430px;opacity:0.95;}
</style></head><body>
<div id="reel">
 <div class="glow"></div>
 <img class="mark" src="${markData}">
 <div class="top"><p class="eyebrow">${EYEBROW || ''}</p><h1 class="title">${TITLE || ''}</h1></div>
 <div class="card"><div id="stage"></div></div>
 <div class="caption">${CAPTION || ''}</div>
 <img class="logo" src="${logoInkData}">
</div>${scripts}<script>${mountFor(DURATION)}</script></body></html>`;

async function capture(html, { w, h, scale, sel, framesDir }) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const hp = path.join(WORK, 'harness.html');
  fs.writeFileSync(hp, html);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: scale });
  await page.goto('file://' + hp, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, 600));
  const el = await page.$(sel);
  const frames = MODE === 'check' ? [Math.round(N * 0.26)] : [...Array(N).keys()];
  for (const f of frames) {
    const t = (f / N) * DURATION;
    await page.evaluate((tt) => new Promise((res) => { window.__setTime(tt); requestAnimationFrame(() => requestAnimationFrame(res)); }), t);
    await el.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(4, '0')}.png`) });
    if (f % 30 === 0) process.stdout.write(`  ${f}/${N}\r`);
  }
  await browser.close();
}

const TARGET = process.env.TARGET || 'full';   // landscape | reel | full
const sz = (p) => Math.round(fs.statSync(p).size / 1024);
// scratch frames/harness are disposable once ffmpeg has the outputs; wipe them
// after a successful render. Set KEEP_WORK=1 to keep them for debugging.
const KEEP_WORK = process.env.KEEP_WORK === '1';
const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });

(async () => {
  if (MODE === 'check') {
    const fd = path.join(WORK, 'frames-check');
    await capture(landscapeHTML, { w: LW + 40, h: LH + 40, scale: 1, sel: '#frame', framesDir: fd });
    const only = fs.readdirSync(fd)[0];
    const out = path.join(WORK, `${outBase}-check.png`);
    fs.copyFileSync(path.join(fd, only), out);
    console.log('check frame:', out);
    if (!KEEP_WORK) { rmrf(fd); rmrf(path.join(WORK, 'harness.html')); }
    return;
  }

  const done = [];
  if (TARGET === 'landscape' || TARGET === 'full') {
    const fdL = path.join(WORK, 'frames-land');
    await capture(landscapeHTML, { w: LW + 40, h: LH + 40, scale: 2, sel: '#frame', framesDir: fdL });
    console.log(`  ${N}/${N} landscape frames   `);
    const mp4 = path.join(projectDir, `${outBase}.mp4`);
    spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(fdL, 'f_%04d.png'),
      '-vf', `scale=${LW}:${LH}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4],
      { stdio: ['ignore', 'ignore', 'inherit'] });
    const pal = path.join(WORK, 'pal.png');
    spawnSync('ffmpeg', ['-y', '-i', mp4, '-vf', 'fps=20,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff', pal], { stdio: 'ignore' });
    const gif = path.join(projectDir, `${outBase}.gif`);
    spawnSync('ffmpeg', ['-y', '-i', mp4, '-i', pal, '-lavfi', 'fps=20,scale=960:-1:flags=lanczos,paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', gif], { stdio: 'ignore' });
    done.push(`${mp4} (${sz(mp4)} KB)`, `${gif} (${sz(gif)} KB)`);
  }

  if (TARGET === 'reel' || TARGET === 'full') {
    const fdR = path.join(WORK, 'frames-reel');
    await capture(reelHTML, { w: 1080, h: 1920, scale: 2, sel: '#reel', framesDir: fdR });
    console.log(`  ${N}/${N} reel frames   `);
    const reel = path.join(projectDir, `${outBase}-reel.mp4`);
    spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(fdR, 'f_%04d.png'),
      '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', reel],
      { stdio: ['ignore', 'ignore', 'inherit'] });
    done.push(`${reel} (${sz(reel)} KB)`);
  }

  if (!KEEP_WORK) rmrf(WORK);   // wipe this render's scratch frames/harness
  console.log('done:\n  ' + done.join('\n  '));
})().catch((e) => { console.error(e); process.exit(1); });
