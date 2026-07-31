---
name: flows-diagram
description: "Produce a branded Amigoscode animated BACKEND-DIAGRAM video: a React/SVG flow diagram (controllers, queues, threads, caches, DB cylinders, arrows, packets) animated over 10s and rendered to a 1440x1440 square MP4, a 960x960 looping GIF, and a 1080x1920 branded reel, then optionally given an ElevenLabs voiceover, word-by-word captions with animated emojis, an infographic-style caption.txt, and an upload title.txt. Use whenever the user wants an animated backend, Java, Spring, database, or concurrency DIAGRAM, flow, or 'how X works' reel, or to add a voiceover, captions, or a title to one of these diagrams. Examples: 'make a flows diagram for the outbox pattern', 'add a diagram about backpressure', 'render the square + reel for saga', 'give the retry diagram a voiceover and captions', 'generate title.txt for these'. This is the SVG-scene pipeline (make.mjs + puppeteer + ffmpeg). It is NOT the HyperFrames explainer-video skill and NOT the CSV reel skill."
license: MIT
---

# Flows diagram

Turn one backend concept into a set of branded animated diagrams. Every diagram is a self
contained React/SVG scene animated across 10 seconds and rendered three ways from one command,
then voiced, captioned, and titled. The voiced, captioned reel is part of the standard
deliverable, not an afterthought.

Zero en dashes or em dashes anywhere (titles, captions, voiceover). Periods and commas only.

## Where things live

- **`$SKILL`** — this skill folder. It carries `scripts/` (the pipeline), `assets/` (brand logos
  and the scene template), and `references/`. Never write output here.
- **`$FLOWS`** — the workspace where diagrams are authored and rendered. One folder per diagram
  (`<name>-flow/`). Resolution order: `FLOWS_DIR` env var, then `workspaceDir` in
  `~/amigoscode-skills/flows-diagram-config.json`, then `~/flows` if it exists, then
  `~/amigoscode-skills/flows` (created on demand).

Set both once per session, then every command below is copy-paste:

```bash
SKILL=~/.claude/skills/flows-diagram          # or the installed plugin path
FLOWS=$(node -e "import('$SKILL/scripts/paths.mjs').then(m=>console.log(m.workspaceDir({create:true})))")
```

First render fetches React and Babel into `$SKILL/.cache` automatically. `puppeteer-core` must be
installed once (`cd $SKILL && npm install`); rendering needs system Chrome (`CHROME_PATH` to
override) plus `ffmpeg` and `ffprobe`.

## The pipeline at a glance

1. **Scene** — author `$FLOWS/<name>-flow/<name>-scene.jsx` (+ copy `animations.jsx`) from
   `$SKILL/assets/template/`. This is the only creative step. See `references/scene-contract.md`.
2. **Render** — `node $SKILL/scripts/make.mjs <folder> <sceneFile> <outBase> "<Title>" "<EYEBROW>" "<caption>"`
   emits the square MP4, the GIF, and the reel. Tune `CROP_TOP`/`CROP_BOTTOM` per diagram so the
   diagram is centered between the title and the footer (see below). See `references/pipeline.md`.
3. **Words** — write `caption.txt` (the /infographic post copy) and `title.txt` (the upload
   name). See `references/voiceover-captions.md`.
4. **Voiceover + captions** — write `vo-script.txt` (~44 words), then run the voiceover +
   Submagic caption pipeline to produce `<base>-reel-voice-over.mp4`. Do this for every diagram
   by default (the reel ships voiced and captioned); only skip it if the user explicitly says
   they just want the silent base videos. See `references/voiceover-captions.md`.

## Fast path for a brand new diagram

```bash
cd "$FLOWS"
mkdir foo-flow
cp "$SKILL/assets/template/animations.jsx"   foo-flow/animations.jsx
cp "$SKILL/assets/template/example-scene.jsx" foo-flow/foo-scene.jsx   # then edit the diagram
# iterate on layout with the fast one-frame check (writes $FLOWS/.work/foo/foo-check.png):
MODE=check node "$SKILL/scripts/make.mjs" foo-flow foo-scene.jsx foo "How Foo Works" "SUBSYSTEM" "x"
# when the frame looks right, full render (square mp4 + gif + reel):
CROP_TOP=150 CROP_BOTTOM=140 node "$SKILL/scripts/make.mjs" foo-flow foo-scene.jsx foo \
  "How Foo Works" "SUBSYSTEM" "Left → Middle → Right"
```

`MODE=check` renders a single mid-timeline frame in ~5s so you can dial in the diagram and the
`CROP_TOP`/`CROP_BOTTOM` padding before committing to a full 30fps render. Always iterate on the
check frame first.

## Conventions (non negotiable)

- **Palette**: purple `#7f56d9` primary, teal `#2FA39B` secondary/success, red `#E5484D`
  failure. Ink text `#20273e`. The scene template's `C` object already holds these.
- **Layout is locked** in `make.mjs`: purple mark at top, eyebrow + title pinned near the top,
  the diagram in the middle, ink wordmark pinned at the bottom. Do not restyle the frame; only
  the diagram inside `#stage` changes.
- **Center the diagram between the title and the footer.** This is the look we want: roughly
  equal breathing room above the diagram (below the title) and below it (above the wordmark), not
  jammed against the title with a big empty gap below. `CROP_TOP`/`CROP_BOTTOM` are how you land
  it: a tall diagram fills the body naturally, but a short or single-row diagram needs a *smaller*
  `CROP_TOP` so it drops into the vertical middle. Always confirm the balance on the `MODE=check`
  frame before the full render. Example: a thin single row centers at `CROP_TOP=95
  CROP_BOTTOM=130`, whereas a tall diagram like a connection pool uses `180/165`.
- **10 seconds, 30fps, k=1** (no breathing zoom). Scenes animate on `useTime()` (0..10).
- **Voiceover ~44 words** so the brand voice lands near 18 to 21 seconds. Longer scripts drift
  past 22s.
- **Caption placement for reels is fixed**: `caption-render.mjs ... 1080 1920 30 <dur> 1545 60 1420`.
- **Clean up after every render**: `make.mjs` wipes `$FLOWS/.work/<outBase>` automatically (set
  `KEEP_WORK=1` to keep frames for debugging). The voiceover driver deletes its caption frames.
  Never leave `.work` or `caps-*` scratch behind; it grows to many GB fast.

## Scaling to many diagrams (use agents)

Writing scenes, `caption.txt`, `vo-script.txt`, and `title.txt` is per diagram authoring work
that parallelizes well: dispatch one general-purpose agent per small batch (3 to 4 diagrams) to
write the text files, giving each agent the exact style spec. Do the RENDERING sequentially in a
single resumable driver (a `done_file` the loop skips) because puppeteer/Chrome and ffmpeg
contend when run in parallel. See `references/pipeline.md` for the batch-render pattern and
`references/voiceover-captions.md` for the batch-voiceover driver.

## References

- `references/pipeline.md` — the `make.mjs` CLI contract, every env var, the tuned 26-diagram
  render matrix (folder / outBase / CROP values / title / eyebrow), and the resumable
  batch-render driver.
- `references/scene-contract.md` — how to author a `<name>-scene.jsx`: the helpers, `KCard`/
  `KIcon`/`ICONS`, the DB cylinder, `Defs`, the `SceneRouter`/`window.*` exports, and how motion
  is driven by time.
- `references/voiceover-captions.md` — `gen-vo.mjs`, `vo-align.mjs`, `caption-render.mjs`, the
  emoji map, the exact ffmpeg composite command, and the `caption.txt` / `title.txt` styles.
