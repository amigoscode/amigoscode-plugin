// Generate a voiceover MP3 for a diagram via ElevenLabs.
//   node gen-vo.mjs <projectDir> <outBase> "<script text>"
// Writes <projectDir>/<outBase>-vo.mp3. Key read from $ELEVEN_LABS, the skill's
// .env, or ~/.env. Override the voice with VOICE_ID=<id>; the default is the
// Amigoscode brand voice. The voice id also comes from the skill config.

import fs from 'node:fs';
import path from 'node:path';
import { elevenLabsKey, readConfig, resolveProject } from './paths.mjs';

const [projArg, outBase, text] = process.argv.slice(2);
if (!projArg || !outBase || !text) {
  console.error('usage: node gen-vo.mjs <projectDir> <outBase> "<script text>"');
  process.exit(1);
}

let KEY;
try { KEY = elevenLabsKey(); } catch (e) { console.error(e.message); process.exit(1); }

const VOICE = process.env.VOICE_ID || readConfig().voiceId;   // Amigoscode brand voice
const out = path.join(resolveProject(projArg), `${outBase}-vo.mp3`);

const body = {
  text: text.trim(),
  model_id: readConfig().voiceModel,
  voice_settings: readConfig().voiceSettings,
};

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error(`ElevenLabs ${res.status}: ${await res.text()}`); process.exit(1); }
fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log('wrote', out, `(${Math.round(fs.statSync(out).size / 1024)} KB)`);
