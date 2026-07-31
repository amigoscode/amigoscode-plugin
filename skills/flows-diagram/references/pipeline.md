# Render pipeline (`scripts/make.mjs`)

One command turns a scene into all three outputs. It compiles `animations.jsx` + the scene with
Babel, mounts them in system Chrome via puppeteer-core, steps `window.__setTime(t)` for each of
300 frames (30fps x 10s), screenshots `#frame`/`#reel`, and pipes frames through ffmpeg.

React and Babel are fetched once into `$SKILL/.cache` on the first render. Chrome is located
automatically (macOS and Linux paths); set `CHROME_PATH` to override. `ffmpeg` and `ffprobe` must
be on `PATH`, and `puppeteer-core` installed in the skill folder (`npm install`).

## CLI contract

```
node $SKILL/scripts/make.mjs <projectDir> <sceneFile> <outBase> "<Title>" "<EYEBROW>" "<caption>"
```

- `<projectDir>` — absolute path, or a folder name inside the workspace `$FLOWS`, e.g.
  `kafka-flow`. Must contain `animations.jsx` and `<sceneFile>`.
- `<sceneFile>` — the scene, e.g. `kafka-scene.jsx` (exports `window.SceneRouter`).
- `<outBase>` — output basename. Outputs land in `<projectDir>/`:
  - `<outBase>.mp4` — 1440x1440 square
  - `<outBase>.gif` — 960x960 infinite loop
  - `<outBase>-reel.mp4` — 1080x1920 branded reel
- `<Title>` — big headline (shown on square + reel). Title Case, no dashes.
- `<EYEBROW>` — small uppercase kicker above the title, e.g. `APACHE KAFKA`.
- `<caption>` — small monospace line under the reel diagram only (the square ignores it; pass
  `"x"` when rendering square-only). Example: `Producers → Partitions → Consumer Group`.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `FLOWS_DIR` | see below | Workspace holding the `<name>-flow/` folders. Falls back to `workspaceDir` in `~/amigoscode-skills/flows-diagram-config.json`, then `~/flows`, then `~/amigoscode-skills/flows`. |
| `CHROME_PATH` | auto | Chrome/Chromium binary used for rendering. |
| `MODE` | `full` | `check` = render ONE mid-timeline frame to `$FLOWS/.work/<outBase>/<outBase>-check.png` (fast layout check). Always use this while dialing in the diagram + crop. |
| `TARGET` | `full` | `landscape` = square mp4 + gif only; `reel` = reel only; `full` = all three. |
| `CROP_TOP` | `0` | Pixels trimmed off the TOP of the 960-tall diagram. Raise it to pull the diagram DOWN, lower it to push UP. Use it to center the diagram between the title and the footer. |
| `CROP_BOTTOM` | `0` | Pixels trimmed off the BOTTOM of the diagram. Mostly sets how much empty stage the card keeps below the content; keep it large enough that the card never reaches the wordmark. |
| `VARIANT` | `N-tier` | Passed to `SceneRouter`; only scenes that branch on it (e.g. request-flow) care. |
| `KEEP_WORK` | unset | `1` keeps `$FLOWS/.work/<outBase>` scratch frames for debugging. Otherwise they are wiped after a successful render. |

The layout is fixed in `make.mjs` (mark top, eyebrow+title near top, diagram card at
`CARD_TOP=372`, wordmark at bottom). The only per-diagram tuning is `CROP_TOP`/`CROP_BOTTOM`. The
goal is to CENTER the diagram vertically between the title and the footer, with roughly equal gaps
above and below. Because the card top is fixed, `CROP_TOP` is what moves the visible diagram: a
tall diagram fills the body on its own, but a short or single-row diagram needs a smaller
`CROP_TOP` so it drops to the middle instead of hugging the title. Dial these on the `MODE=check`
frame and eyeball the top and bottom gaps. Only affects the square; the reel scales the whole
frame so its diagram is already centered.

## Workflow per diagram

```
# 1. fast layout loop — one frame, ~5s each, adjust CROP until the diagram hugs the title
MODE=check CROP_TOP=150 CROP_BOTTOM=140 node "$SKILL/scripts/make.mjs" foo-flow foo-scene.jsx foo "How Foo Works" "SUBSYSTEM" "x"
# 2. full render once happy
CROP_TOP=150 CROP_BOTTOM=140 node "$SKILL/scripts/make.mjs" foo-flow foo-scene.jsx foo "How Foo Works" "SUBSYSTEM" "A → B → C"
```

Rendering is Chrome + ffmpeg heavy. Run renders **sequentially**, never several `make.mjs` in
parallel (Chrome and ffmpeg contend and the machine thrashes).

## Tuned render matrix (the 26 diagrams built with this pipeline)

Copy the closest row when adding a similar diagram. `CROP` is `CROP_TOP/CROP_BOTTOM`. These are
the values that shipped; the scenes themselves are not bundled with the skill.

| folder | outBase | CROP | Title | EYEBROW |
|---|---|---|---|---|
| request-flow | request-flow | 40/40 | How a Request Flows | SPRING BOOT (VARIANT=N-tier) |
| kafka-flow | kafka-flow | 120/120 | How Kafka Works | APACHE KAFKA |
| auth-flow | auth-flow | 60/60 | How JWT Auth Works | SPRING SECURITY |
| cicd-flow | cicd-flow | 92/58 | How CI/CD Works | DEVOPS |
| vthreads-flow | vthreads-flow | 150/140 | Virtual vs Platform Threads | JAVA 21 |
| replication-flow | replication-flow | 170/140 | How DB Replication Works | POSTGRESQL |
| ratelimit-flow | ratelimit | 145/185 | How Rate Limiting Works | TOKEN BUCKET |
| cache-flow | cache | 130/138 | Cache-Aside with Redis | CACHING |
| transaction-flow | transaction | 66/64 | How @Transactional Works | SPRING AOP |
| passby-flow | passby | 150/140 | Pass by Value vs Reference | JAVA MEMORY |
| gc-flow | gc | 150/140 | How G1 Garbage Collection Works | JVM MEMORY |
| threadpool-flow | threadpool | 130/150 | How a Thread Pool Works | EXECUTORSERVICE |
| deadlock-flow | deadlock | 120/120 | How Deadlocks Happen | JAVA CONCURRENCY |
| cfuture-flow | cfuture | 55/45 | How CompletableFuture Works | ASYNC JAVA |
| beanlifecycle-flow | beanlifecycle | 60/70 | The Spring Bean Lifecycle | SPRING IOC |
| filterchain-flow | filterchain | 20/20 | The Security Filter Chain | SPRING SECURITY |
| startup-flow | startup | 60/65 | How Spring Boot Starts Up | SPRING BOOT |
| index-flow | index | 150/140 | How Database Indexes Work | POSTGRESQL |
| hikari-flow | hikari | 180/165 | How a Connection Pool Works | HIKARICP |
| nplusone-flow | nplusone | 150/140 | The N+1 Query Problem | SPRING DATA JPA |
| locking-flow | locking | 150/140 | Optimistic vs Pessimistic Locking | JPA CONCURRENCY |
| circuit-flow | circuit | 130/150 | How a Circuit Breaker Works | RESILIENCE4J |
| loadbalancer-flow | loadbalancer | 150/140 | How a Load Balancer Works | SCALING |
| saga-flow | saga | 150/120 | How the Saga Pattern Works | DISTRIBUTED TX |
| retry-flow | retry | 140/40 | Retry with Exponential Backoff | RESILIENCE |
| idempotency-flow | idempotency | 124/130 | How Idempotency Keys Work | API DESIGN |

## Resumable batch render (many diagrams)

When re-rendering or building several, drive `make.mjs` from one sequential shell loop with a
`done_file` so a killed run resumes without redoing finished diagrams. Pattern:

```zsh
done_file=/tmp/square-done.txt; touch "$done_file"
run() {  # $1 env  $2 args  $3 outBase
  grep -qx "$3" "$done_file" && { echo "skip $3"; return; }
  eval "$1 node \"$SKILL/scripts/make.mjs\" $2" && echo "$3" >> "$done_file"
}
run 'CROP_TOP=120 CROP_BOTTOM=120' 'kafka-flow kafka-scene.jsx kafka-flow "How Kafka Works" "APACHE KAFKA" "x"' kafka-flow
# ...one run line per diagram...
```

Renders can take ~1 to 2 min each; a long batch may exceed a single background-command lifetime,
so run in the background and relaunch the same script (the `done_file` skips finished work).
