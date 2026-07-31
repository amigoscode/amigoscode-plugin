# Scene contract (`<name>-scene.jsx`)

A scene is one JSX file that draws an animated SVG diagram on a 1440x960 canvas, driven by the
current time (0..10s). Copy `$SKILL/assets/template/example-scene.jsx` as the template. It is the
cleanest reference: cards, a database cylinder, container zones, and time-driven animated
"streaks" (packets) along rounded routes.

## Required shape

Every scene must, by the end of the file:

```js
window.SceneRouter = SceneRouter;   // REQUIRED — make.mjs mounts this
window.FlowScene   = FlowScene;      // convention — for standalone/loop preview
```

`SceneRouter({ variant, accent })` returns the root `<svg width={1440} height={960}
viewBox="0 0 1440 960">` containing `<Defs/>`, the `url(#bgGrad)` background rect (which
`make.mjs` forces transparent so the page background shows through), and your diagram group.
`variant` comes from the `VARIANT` env var (ignore it unless the diagram has alternate forms,
e.g. request-flow's N-tier). `accent` is passed in as `#5a37a6`; most scenes use their own `C`
palette instead.

## The engine (from `animations.jsx`, on `window`)

```js
const { Stage, useTime, Easing, clamp } = window;
```

- `useTime()` → current time in seconds (0..10), re-renders every frame. All motion derives
  from this. `make.mjs` steps it via `window.__setTime(t)`.
- `Easing.easeInOutCubic(x)` and friends for smooth 0..1 progress.
- `clamp(v,a,b)`. The template also defines local `clmp` and `bump(t,center,width)` (a gaussian
  pulse, used for node glows that peak as a packet arrives).

## Palette `C` (locked brand colors)

Purple `#7f56d9` = primary / writes / producers. Teal `#2FA39B` = secondary / success / reads /
replication. Red `#E5484D` = failure. Ink `#20273e` for text, `#7B84A0` for sub-labels. Copy the
whole `C` object from the template and extend it; do not invent new hues.

## Building blocks in the template (reuse these)

- `roundedPath(points, r)` — SVG path through waypoints with rounded corners. Define each route
  as an array of `[x,y]` points in `L.routes`.
- `polyPoint(points, s)` — point at fraction `s` (0..1) along a polyline (fallback before SVG
  `getPointAtLength` measures are ready).
- `KCard({x,y,title,sub,icon,glow,accent})` — the white rounded node card with an icon chip.
  `glow` (0..1) lights its border as flow arrives.
- `KIcon` + `ICONS` — small stroked glyphs. Add entries to `ICONS` (a `<g>` of paths on a 24x24
  grid) for new node types.
- `DBNode({x,y,w,label,sub,glow,accent})` — the database cylinder.
- `Defs()` — `bgGrad` (background), `glow` (gaussian blur for packet halos), `pillShadow` (card
  drop shadow). Keep these ids; the frame CSS and other helpers depend on `bgGrad`.

## Animating flow (the core idea)

1. Lay out nodes as constants (`APP`, `PRI`, `REPL`, container boxes in `L`).
2. Define routes as point arrays in `L.routes`.
3. Build a `FLOWS` list: each entry `{ route, s, e, kind, node, target }` is one packet that
   travels `route` from time `s` to `e`. Stagger `s` values across the 10s so the diagram always
   has something moving (retention). Keep the choreography seamless as a loop (nothing mid-flight
   at t=10 that would pop at t=0).
4. Each frame: compute which `FLOWS` are active, draw a moving dash + a glowing head circle along
   the route, and accumulate `bump()` glows on the source/target nodes.

## Motion rules

- 10 seconds, 30fps, `k=1` (no breathing zoom — the template sets `const k = 1`).
- Something visible in motion at all times; new visual beats every ~2 to 4s.
- Keep the diagram within roughly the central band of the 1440x960 canvas; `CROP_TOP`/
  `CROP_BOTTOM` in `make.mjs` trims the empty top/bottom padding, so leave predictable margins
  rather than pushing art to the extreme edges.

## Workflow

1. `cp "$SKILL/assets/template/animations.jsx" foo-flow/animations.jsx` (do not edit; it is the
   shared engine — every project keeps its own copy).
2. `cp "$SKILL/assets/template/example-scene.jsx" foo-flow/foo-scene.jsx` and rewrite the layout,
   routes, `FLOWS`, and node cards for the new concept.
3. Iterate with `MODE=check node "$SKILL/scripts/make.mjs" foo-flow foo-scene.jsx foo "Title" "EYEBROW" "x"`.
4. For a hard layout, spin up a general-purpose agent to draft the scene from the template with
   these rules, then render and eyeball the check frame yourself.
