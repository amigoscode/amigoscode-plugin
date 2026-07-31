// Database replication (primary / replica) — PostgreSQL.
// App writes → PRIMARY only; PRIMARY replicates (WAL stream) → REPLICAS; reads served by REPLICAS.
// Reuses the timeline engine from animations.jsx (window globals).
// Exports window.SceneRouter + window.FlowScene (same shape as kafka-scene.jsx).

const { Stage, useTime, Easing, clamp } = window;

const C = {
  pu: '#7f56d9', puL: '#9c80e5', puD: '#5a37a6',
  ink: '#20273e', sub: '#7B84A0',
  pill: '#ffffff', pillEdge: '#E6E3F1',
  puTitle: '#7F56D9', puEdge: 'rgba(127,86,217,0.24)',
  produce: '#7f56d9',       // WRITES (purple)
  consume: '#2FA39B',       // READS + replication stream (teal)
  tealTitle: '#268C85',
  boxFill: 'rgba(127,86,217,0.05)', boxEdge: 'rgba(127,86,217,0.16)',
  tealFill: 'rgba(47,163,155,0.06)', tealEdge: 'rgba(47,163,155,0.22)',
  base: 'rgba(140,110,220,0.40)',
  tealBase: 'rgba(47,163,155,0.34)',
  cylFill: 'rgba(127,86,217,0.13)', cylTop: '#EEF0FB',
};

const clmp = (v, a, b) => Math.max(a, Math.min(b, v));
const bump = (t, c, w) => Math.exp(-((t - c) / w) * ((t - c) / w));

function roundedPath(pts, r) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    let v1x = cx - px, v1y = cy - py; const l1 = Math.hypot(v1x, v1y) || 1; v1x /= l1; v1y /= l1;
    let v2x = nx - cx, v2y = ny - cy; const l2 = Math.hypot(v2x, v2y) || 1; v2x /= l2; v2y /= l2;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    d += ` L ${cx - v1x * rr} ${cy - v1y * rr} Q ${cx} ${cy} ${cx + v2x * rr} ${cy + v2y * rr}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}
function polyPoint(pts, s) {
  s = clmp(s, 0, 1);
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push(l); total += l;
  }
  let d = s * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const t = segs[i] ? d / segs[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    d -= segs[i];
  }
  return pts[pts.length - 1];
}

// ── layout ───────────────────────────────────────────────────────────────────
const APP = { x: 250, y: 360 };
const PRI = { x: 640, y: 360, w: 88 };
const REPL = [
  { id: 'rTop', x: 1130, y: 250, w: 74 },
  { id: 'rMid', x: 1130, y: 460, w: 74 },
  { id: 'rBot', x: 1130, y: 670, w: 74 },
];

const L = {
  primaryBox: { x: 520, y: 250, w: 240, h: 224 },
  replicaBox: { x: 1022, y: 196, w: 204, h: 566 },
  routes: {
    write:   [[350, 360], [552, 360]],
    replTop: [[728, 350], [900, 350], [900, 250], [1056, 250]],
    replMid: [[728, 360], [900, 360], [900, 460], [1056, 460]],
    replBot: [[728, 370], [900, 370], [900, 670], [1056, 670]],
    readTop: [[250, 393], [250, 780], [1250, 780], [1250, 250], [1204, 250]],
    readMid: [[250, 393], [250, 780], [1250, 780], [1250, 460], [1204, 460]],
    readBot: [[250, 393], [250, 780], [1250, 780], [1250, 670], [1204, 670]],
  },
};

// choreography over a seamless 10s loop
const FLOWS = (() => {
  const f = [];
  // writes → primary
  for (const s of [0.3, 2.8, 5.3, 7.8]) f.push({ route: 'write', s, e: s + 1.0, kind: 'write', node: 'app', target: 'primary' });
  // continuous replication stream primary → replicas (staggered waves)
  const rep = ['replTop', 'replMid', 'replBot'];
  const tgt = { replTop: 'rTop', replMid: 'rMid', replBot: 'rBot' };
  for (let i = 0; i < 9; i++) {
    const base = 0.5 + i * 0.95;
    rep.forEach((r, j) => {
      const s = base + j * 0.12;
      if (s + 0.85 < 9.6) f.push({ route: r, s, e: s + 0.85, kind: 'repl', node: 'primary', target: tgt[r] });
    });
  }
  // reads fan out from app → replicas
  const rd = ['readTop', 'readMid', 'readBot'];
  const rtgt = { readTop: 'rTop', readMid: 'rMid', readBot: 'rBot' };
  for (const base of [1.2, 3.7, 6.2, 8.1]) {
    rd.forEach((r, j) => {
      const s = base + j * 0.15;
      f.push({ route: r, s, e: s + 1.1, kind: 'read', node: 'app', target: rtgt[r] });
    });
  }
  return f;
})();

// ── icons ────────────────────────────────────────────────────────────────────
const ICONS = {
  app: <g><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16" /></g>,
};
function KIcon({ type, x, y, color }) {
  return (
    <g transform={`translate(${x - 12},${y - 12})`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[type] || null}
    </g>
  );
}
function KCard({ x, y, title, sub, icon, glow = 0, accent }) {
  const w = 200, h = 66;
  const on = glow > 0.14;
  const chipX = x - w / 2 + 28, chipY = y;
  return (
    <g>
      {glow > 0.03 ? (
        <rect x={x - w / 2 - 5} y={y - h / 2 - 5} width={w + 10} height={h + 10} rx="17"
          fill="none" stroke={accent} strokeWidth="2.5" opacity={glow * 0.6} />
      ) : null}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="13" fill="#fff"
        stroke={on ? accent : C.pillEdge} strokeWidth={on ? 2 : 1.3} filter="url(#pillShadow)" />
      <rect x={chipX - 16} y={chipY - 16} width="32" height="32" rx="8" fill="rgba(127,86,217,0.10)" />
      <KIcon type={icon} x={chipX} y={chipY} color={accent} />
      <text x={x - w / 2 + 56} y={y - 5} fontFamily="Epilogue, sans-serif" fontSize="16.5" fontWeight="700" fill={C.ink}>{title}</text>
      <text x={x - w / 2 + 56} y={y + 15} fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="500" fill={C.sub}>{sub}</text>
    </g>
  );
}

// database cylinder (adapted from request-flow DBNode)
function DBNode({ x, y, w = 80, label, sub, glow = 0, accent }) {
  const top = 18;
  const on = glow > 0.16;
  const edge = on ? accent : C.puEdge;
  return (
    <g>
      {glow > 0.03 ? <ellipse cx={x} cy={y} rx={w + 16} ry={56} fill={accent} opacity={glow * 0.14} filter="url(#glow)" /> : null}
      <path d={`M ${x - w} ${y - 30} V ${y + 30} C ${x - w} ${y + 42} ${x + w} ${y + 42} ${x + w} ${y + 30} V ${y - 30}`}
        fill={C.cylFill} stroke={edge} strokeWidth={on ? 2.2 : 1.6} />
      <ellipse cx={x} cy={y} rx={w} ry={top} fill="none" stroke={C.puEdge} strokeWidth="1.4" opacity="0.7" />
      <ellipse cx={x} cy={y + 15} rx={w} ry={top * 0.9} fill="none" stroke={C.puEdge} strokeWidth="1.1" opacity="0.45" />
      <ellipse cx={x} cy={y - 30} rx={w} ry={top} fill={C.cylTop} stroke={edge} strokeWidth={on ? 2 : 1.6} />
      <ellipse cx={x} cy={y - 30} rx={w * 0.6} ry={top * 0.6} fill="none" stroke={C.puEdge} strokeWidth="1.1" opacity="0.5" />
      <text x={x} y={y - 24} textAnchor="middle" fontFamily="Epilogue, sans-serif" fontSize="12.5" fontWeight="800" fill={C.puTitle} letterSpacing="1.5">{label}</text>
      <text x={x} y={y + 56} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="600" fill={C.sub}>{sub}</text>
    </g>
  );
}

function ReplicationDiagram({ accent }) {
  const t = useTime();
  const write = accent || C.produce;
  const pathRefs = React.useRef({});
  const [lens, setLens] = React.useState({});
  React.useLayoutEffect(() => {
    const o = {};
    for (const k in pathRefs.current) { const el = pathRefs.current[k]; if (el) o[k] = el.getTotalLength(); }
    setLens(o);
  }, []);

  const routeIds = Object.keys(L.routes);
  const routeD = React.useMemo(() => {
    const o = {}; for (const k of routeIds) o[k] = roundedPath(L.routes[k], 18); return o;
  }, []);

  // active streaks
  const active = [];
  for (const fl of FLOWS) {
    if (t < fl.s - 0.05 || t > fl.e + 0.28) continue;
    const p = Easing.easeInOutCubic(clmp((t - fl.s) / (fl.e - fl.s), 0, 1));
    let alpha = 1;
    if (t > fl.e) alpha = clmp(1 - (t - fl.e) / 0.28, 0, 1);
    active.push({ route: fl.route, front01: p, color: fl.kind === 'write' ? write : C.consume, kind: fl.kind, alpha });
  }

  // node glows
  const g = { app: 0, primary: 0, rTop: 0, rMid: 0, rBot: 0 };
  for (const fl of FLOWS) {
    if (fl.kind === 'write') {
      g.app += bump(t, fl.s, 0.32);
      g.primary += bump(t, fl.e, 0.34);
    } else if (fl.kind === 'repl') {
      g.primary += bump(t, fl.s, 0.30) * 0.7;
      g[fl.target] += bump(t, fl.e, 0.32);
    } else { // read
      g.app += bump(t, fl.s, 0.30) * 0.7;
      g[fl.target] += bump(t, fl.e, 0.32);
    }
  }

  const headPoint = (route, front01) => {
    const el = pathRefs.current[route];
    if (el && lens[route]) return el.getPointAtLength(clmp(front01, 0, 1) * lens[route]);
    const p = polyPoint(L.routes[route], front01); return { x: p[0], y: p[1] };
  };

  return (
    <g>
      {/* section labels */}
      <text x={APP.x} y="298" textAnchor="middle" fontFamily="Epilogue, sans-serif" fontSize="14" fontWeight="700" fill={C.puTitle} opacity="0.7" letterSpacing="2">CLIENT</text>

      {/* container zones */}
      <rect x={L.primaryBox.x} y={L.primaryBox.y} width={L.primaryBox.w} height={L.primaryBox.h} rx="22" fill={C.boxFill} stroke={C.boxEdge} strokeWidth="1.4" />
      <text x={L.primaryBox.x + L.primaryBox.w / 2} y={L.primaryBox.y - 12} textAnchor="middle" fontFamily="Epilogue, sans-serif" fontSize="13.5" fontWeight="800" fill={C.puTitle} opacity="0.82" letterSpacing="1">PRIMARY · WRITES</text>

      <rect x={L.replicaBox.x} y={L.replicaBox.y} width={L.replicaBox.w} height={L.replicaBox.h} rx="22" fill={C.tealFill} stroke={C.tealEdge} strokeWidth="1.4" />
      <text x={L.replicaBox.x + L.replicaBox.w / 2} y={L.replicaBox.y - 12} textAnchor="middle" fontFamily="Epilogue, sans-serif" fontSize="13.5" fontWeight="800" fill={C.tealTitle} opacity="0.85" letterSpacing="1">REPLICAS · READS</text>

      {/* base connectors */}
      {routeIds.map((k) => (
        <path key={k} ref={(el) => (pathRefs.current[k] = el)} d={routeD[k]}
          fill="none" stroke={k === 'write' ? C.base : C.tealBase} strokeWidth={k === 'write' ? 4 : 3.5}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={k === 'write' ? '2 7' : k.startsWith('read') ? '2 8' : 'none'}
          opacity={k.startsWith('read') ? 0.5 : 0.7} />
      ))}

      {/* route labels */}
      <text x={451} y={344} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="12.5" fontWeight="700" fill={C.produce}>writes</text>
      <g>
        <text x={868} y={330} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="12.5" fontWeight="700" fill={C.tealTitle}>replication</text>
        <text x={868} y={346} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="10.5" fontWeight="600" fill={C.sub}>WAL stream</text>
      </g>
      <text x={700} y={766} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="12.5" fontWeight="700" fill={C.tealTitle}>reads</text>

      {/* active streaks */}
      {active.map((a, i) => {
        const Ln = lens[a.route];
        const hp = headPoint(a.route, a.front01);
        const dash = a.kind === 'repl' ? 22 : 32;
        return (
          <g key={i} opacity={a.alpha}>
            {Ln ? (
              <path d={routeD[a.route]} fill="none" stroke={a.color} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${dash} ${Ln + dash}`} strokeDashoffset={dash - a.front01 * Ln} />
            ) : null}
            <circle cx={hp.x} cy={hp.y} r="11" fill={a.color} opacity="0.28" filter="url(#glow)" />
            <circle cx={hp.x} cy={hp.y} r="5.5" fill={a.color} />
            <circle cx={hp.x} cy={hp.y} r="2.4" fill="#fff" opacity="0.95" />
          </g>
        );
      })}

      {/* app card */}
      <KCard x={APP.x} y={APP.y} title="Spring App" sub="reads + writes" icon="app" glow={g.app} accent={write} />

      {/* primary database */}
      <DBNode x={PRI.x} y={PRI.y} w={PRI.w} label="PRIMARY" sub="leader" glow={g.primary} accent={C.produce} />

      {/* replica databases */}
      {REPL.map((r) => (
        <DBNode key={r.id} x={r.x} y={r.y} w={r.w} label="REPLICA" sub="follower" glow={g[r.id]} accent={C.consume} />
      ))}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="34%" r="80%">
        <stop offset="0%" stopColor="#FCFBFF" />
        <stop offset="100%" stopColor="#F1EEFA" />
      </radialGradient>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id="pillShadow" x="-40%" y="-60%" width="180%" height="240%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#20273e" floodOpacity="0.14" />
      </filter>
    </defs>
  );
}

function SceneRouter({ variant, accent }) {
  const t = useTime();
  const k = 1;
  const W = 1440, H = 960;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <Defs />
      <rect x="0" y="0" width={W} height={H} fill="url(#bgGrad)" />
      <g transform={`translate(${W / 2},${H / 2}) scale(${k}) translate(${-W / 2},${-H / 2})`}>
        <ReplicationDiagram accent={accent} />
      </g>
    </svg>
  );
}

function FlowScene({ variant, accent }) {
  return (
    <Stage width={1440} height={960} duration={10} loop background="#0e1020">
      <SceneRouter variant={variant} accent={accent} />
    </Stage>
  );
}

window.FlowScene = FlowScene;
window.SceneRouter = SceneRouter;
