# flows-diagram

Turn one backend concept into a **branded animated diagram**: a React/SVG scene animated across
10 seconds and rendered three ways from a single command, then voiced, captioned, and titled.

Built on headless Chrome (puppeteer-core) + ffmpeg. Deterministic: the timeline is stepped to
exact timestamps, so renders are repeatable.

## What you get per diagram

```
$FLOWS/<name>-flow/
├── <base>.mp4                    ← 1440x1440 square, branded frame
├── <base>.gif                    ← 960x960 infinite loop
├── <base>-reel.mp4               ← 1080x1920 vertical reel
├── <base>-reel-voice-over.mp4    ← the reel with voiceover + word-by-word captions
├── <base>-vo.mp3                 ← ElevenLabs narration
├── <name>-scene.jsx              ← the diagram (the only creative file)
├── animations.jsx                ← shared timeline engine (copied per project)
├── vo-script.txt                 ← ~44 word narration script
├── caption.txt                   ← long-form social post copy
└── title.txt                     ← short upload title
```

## Prerequisites

- **Google Chrome** or Chromium (set `CHROME_PATH` if it is not in a standard location).
- **ffmpeg** and **ffprobe** on `PATH`.
- **Node.js 18+**, then `npm install` in this folder (pulls `puppeteer-core`).
- **`ELEVEN_LABS` API key** for the voiceover and forced alignment ([elevenlabs.io](https://elevenlabs.io)).
  Read from the environment, this folder's `.env`, or `~/.env`.

```bash
cp .env.example .env   # then add your key, or: export ELEVEN_LABS=...
npm install
```

React and Babel are fetched into `.cache/` automatically on the first render.

## Usage

In Claude Code:

> "make a flows diagram for the outbox pattern"
> "add a diagram about backpressure"
> "give the retry diagram a voiceover and captions"

Or drive the pipeline directly:

```bash
SKILL=~/.claude/skills/flows-diagram
FLOWS=~/amigoscode-skills/flows

cd "$FLOWS" && mkdir -p outbox-flow
cp "$SKILL/assets/template/animations.jsx"    outbox-flow/animations.jsx
cp "$SKILL/assets/template/example-scene.jsx" outbox-flow/outbox-scene.jsx   # then edit

# fast one-frame layout check
MODE=check node "$SKILL/scripts/make.mjs" outbox-flow outbox-scene.jsx outbox \
  "How the Outbox Pattern Works" "DISTRIBUTED TX" "x"

# full render: square mp4 + looping gif + branded reel
CROP_TOP=150 CROP_BOTTOM=140 node "$SKILL/scripts/make.mjs" outbox-flow outbox-scene.jsx outbox \
  "How the Outbox Pattern Works" "DISTRIBUTED TX" "Write → Outbox → Relay → Broker"
```

## Workspace

Diagrams are authored and rendered **outside** the skill so updating the skill never touches your
work. The workspace resolves in this order:

1. `FLOWS_DIR` environment variable
2. `workspaceDir` in `~/amigoscode-skills/flows-diagram-config.json`
3. `~/flows` if it exists (the original project location)
4. `~/amigoscode-skills/flows` (created on demand)

Copy `config.default.json` to `~/amigoscode-skills/flows-diagram-config.json` to change the
workspace, the ElevenLabs voice, or the voice settings.

## Layout

```
flows-diagram/
├── SKILL.md                  # agent instructions
├── scripts/
│   ├── make.mjs              # scene -> square mp4 + gif + reel
│   ├── gen-vo.mjs            # ElevenLabs TTS
│   ├── vo-align.mjs          # forced alignment -> word timings
│   ├── caption-render.mjs    # Submagic-style caption overlay frames
│   └── paths.mjs             # workspace / Chrome / key / cache resolution
├── assets/
│   ├── logo-mark.svg         # purple mark (top of every frame)
│   ├── amigoscode-logo*.png  # wordmarks
│   └── template/             # animations.jsx + example scene to copy
└── references/
    ├── pipeline.md           # make.mjs contract, env vars, tuned render matrix
    ├── scene-contract.md     # how to author a scene
    └── voiceover-captions.md # voiceover, captions, caption.txt, title.txt
```

## Brand rules

Purple `#7f56d9` primary, teal `#2FA39B` secondary, red `#E5484D` failure, ink `#20273e` text.
10 seconds, 30fps. No en dashes or em dashes anywhere in titles, captions, or narration.

## License

MIT
