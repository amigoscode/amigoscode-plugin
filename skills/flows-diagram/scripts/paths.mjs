// Shared path / environment resolution for the flows-diagram pipeline.
//
// The skill ships as a self-contained folder, but the diagrams a user authors
// (scenes + rendered video) live in a workspace OUTSIDE the skill so an update
// of the skill never touches their work.
//
// Workspace resolution order:
//   1. FLOWS_DIR env var
//   2. "workspaceDir" in ~/amigoscode-skills/flows-diagram-config.json
//   3. ~/flows                    (legacy home of the original project)
//   4. ~/amigoscode-skills/flows  (default, created on demand)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ASSETS_DIR = path.join(SKILL_DIR, 'assets');
export const CACHE_DIR = path.join(SKILL_DIR, '.cache');
export const CONFIG_PATH = path.join(os.homedir(), 'amigoscode-skills', 'flows-diagram-config.json');

const expand = (p) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

export function readConfig() {
  const defaults = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'config.default.json'), 'utf8'));
  if (!fs.existsSync(CONFIG_PATH)) return defaults;
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return defaults;
  }
}

export function workspaceDir({ create = false } = {}) {
  const cfg = readConfig();
  const candidates = [
    process.env.FLOWS_DIR,
    cfg.workspaceDir,
    path.join(os.homedir(), 'flows'),
  ].filter(Boolean).map(expand);

  for (const c of candidates) if (fs.existsSync(c)) return c;

  const fallback = expand(candidates[0] || path.join(os.homedir(), 'amigoscode-skills', 'flows'));
  if (create) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

// A project arg may be absolute, relative to the workspace, or relative to cwd.
export function resolveProject(arg) {
  if (!arg) throw new Error('missing <projectDir>');
  const tries = [
    path.isAbsolute(arg) ? arg : null,
    path.resolve(workspaceDir(), arg),
    path.resolve(process.cwd(), arg),
  ].filter(Boolean);
  for (const t of tries) if (fs.existsSync(t)) return t;
  return tries[0];   // caller creates it / fails with a clear ENOENT
}

// Chrome for puppeteer-core. CHROME_PATH wins; otherwise probe the usual homes.
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

export function chromePath() {
  const env = process.env.CHROME_PATH || process.env.CHROME;
  if (env) {
    if (!fs.existsSync(env)) throw new Error(`CHROME_PATH does not exist: ${env}`);
    return env;
  }
  for (const c of CHROME_CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error(
    'Google Chrome not found. Install Chrome, or set CHROME_PATH=/path/to/chrome.'
  );
}

// The ElevenLabs key: process env, then the skill's .env, then ~/.env.
export function elevenLabsKey() {
  if (process.env.ELEVEN_LABS) return process.env.ELEVEN_LABS.trim();
  for (const f of [path.join(SKILL_DIR, '.env'), path.join(os.homedir(), '.env')]) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^\s*ELEVEN_LABS\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('ELEVEN_LABS key not found. Set it in the environment, skills/flows-diagram/.env, or ~/.env.');
}

// React + Babel are fetched once into .cache/ and reused by every render.
const VENDOR = {
  'react.js': 'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'react-dom.js': 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'babel.js': 'https://unpkg.com/@babel/standalone@^7/babel.min.js',
};

export async function ensureCache() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const [file, url] of Object.entries(VENDOR)) {
    const dest = path.join(CACHE_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) continue;
    process.stdout.write(`  fetching ${file} ...\n`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
}
