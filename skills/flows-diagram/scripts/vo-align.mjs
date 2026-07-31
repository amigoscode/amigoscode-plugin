// Word-level timestamps for a voiceover via ElevenLabs forced alignment.
//   node vo-align.mjs <audio.mp3> "<exact transcript>" <out-words.json>
import fs from 'node:fs';
import path from 'node:path';
import { elevenLabsKey } from './paths.mjs';

const [audioPath, text, outJson] = process.argv.slice(2);
if (!audioPath || !text || !outJson) {
  console.error('usage: node vo-align.mjs <audio.mp3> "<exact transcript>" <out-words.json>');
  process.exit(1);
}
let KEY;
try { KEY = elevenLabsKey(); } catch (e) { console.error(e.message); process.exit(1); }

const fd = new FormData();
fd.append('file', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }), path.basename(audioPath));
fd.append('text', text);

const res = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
  method: 'POST', headers: { 'xi-api-key': KEY }, body: fd,
});
if (!res.ok) { console.error(`forced-alignment ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
const words = (data.words || []).filter((w) => w.text && w.text.trim())
  .map((w) => ({ text: w.text.trim(), start: w.start, end: w.end }));
fs.writeFileSync(outJson, JSON.stringify(words, null, 2));
console.log(`wrote ${outJson}: ${words.length} words, ends ${words[words.length - 1]?.end?.toFixed(2)}s`);
