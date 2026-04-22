// plan-admin.jsx — 4 layout variants for configuring a Plan
// (N Stages, each with: length in blocks, probability distribution
// over a subset of 2048 values + "stone", and an expected-value readout.)

const ALL_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
const STONE_VALUE = 0; // 'stone' obstacle — contributes 0 to expected block value

const COLOR_MAP = {
  2:    { bg: '#ff4d7a', dark: '#b01c45' },
  4:    { bg: '#ff5d8f', dark: '#c8346a' },
  8:    { bg: '#ff8a3c', dark: '#c85a1a' },
  16:   { bg: '#ff3b3b', dark: '#b02424' },
  32:   { bg: '#8e5dff', dark: '#5a2ec0' },
  64:   { bg: '#ffd23c', dark: '#b8941d' },
  128:  { bg: '#c14dff', dark: '#7e1dbb' },
  256:  { bg: '#ff4dcc', dark: '#b01c88' },
  512:  { bg: '#4ecd7a', dark: '#1f8a47' },
  1024: { bg: '#7a4a2a', dark: '#4a2a14' },
  2048: { bg: '#f4737b', dark: '#92454a' },
  4096: { bg: '#c14dff', dark: '#7e1dbb' },
  8192: { bg: '#5a3a1a', dark: '#2a1a08' },
  0:    { bg: '#a8a8b0', dark: '#606068' }, // stone
};

const labelOf = (v) => (v === STONE_VALUE ? 'stone' : String(v));

// Tiny candy chip used as an icon in pool lists and probability-bar items
function CandyChip({ v, size = 22, selected, hasNumber = true }) {
  const c = COLOR_MAP[v];
  const isStone = v === STONE_VALUE;
  return (
    <div style={{
      position: 'relative',
      width: size, height: size,
      borderRadius: isStone ? 5 : '50%',
      background: isStone
        ? 'linear-gradient(135deg, #c0c0c8, #808088)'
        : `radial-gradient(circle at 30% 25%, #fff 0%, ${c.bg} 55%, ${c.dark})`,
      boxShadow: selected
        ? `0 0 0 2px #fff, 0 0 0 4px ${c.dark}`
        : `0 1px 2px rgba(0,0,0,.2), inset 0 -1px 2px rgba(0,0,0,.2)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {hasNumber && !isStone && (
        <div style={{
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.45,
          color: '#fff',
          textShadow: '0 1px 0 rgba(0,0,0,.3)',
          lineHeight: 1,
        }}>{v}</div>
      )}
    </div>
  );
}

// Compute expected value of one block given weight map { v: weight }.
// 'stone' key normalizes to 0 (STONE_VALUE) so it doesn't poison the sum.
function expectedValue(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let sum = 0;
  for (const [v, w] of Object.entries(weights)) {
    const numV = v === 'stone' ? 0 : Number(v);
    sum += numV * (w / total);
  }
  return sum;
}

// Redistribute a weights map so it sums to target (default 100), keeping ratios.
function normalize(weights, target = 100) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;
  const out = {};
  for (const [k, w] of Object.entries(weights)) out[k] = (w / total) * target;
  return out;
}

// Equal-split across a set of keys, summing to 100
function evenSplit(keys) {
  const out = {};
  const n = keys.length;
  if (n === 0) return out;
  keys.forEach((k) => { out[k] = 100 / n; });
  return out;
}

// Deterministic token-sequence generator for a given plan + seed.
// Mirrors the real backend rules: weighted sampling per stage, stones
// inserted at even intervals (no stone in the first 4 positions).
function genTokens(plan, seed) {
  const tokens = [];
  let i = 0;
  const totalLen = plan.stages.reduce((a, s) => a + (s.length || 0), 0);
  for (const stage of plan.stages) {
    const keys = Object.keys(stage.weights).filter((k) => k !== 'stone').map(String);
    const vals = keys.map((k) => stage.weights[k] || 0);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < stage.length; k++) {
      const r = Math.abs(Math.sin((seed + i * 31) * 1.14592)) * total;
      let acc = 0, pick = keys[0] || '2';
      for (let j = 0; j < keys.length; j++) {
        acc += vals[j];
        if (r <= acc) { pick = keys[j]; break; }
      }
      tokens.push(pick);
      i++;
    }
  }
  let stoneBudget = 0;
  for (const s of plan.stages) {
    const total = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1;
    const ratio = (s.weights.stone || 0) / total;
    stoneBudget += ratio * s.length;
  }
  const stoneCount = Math.round(stoneBudget);
  if (stoneCount > 0 && totalLen > 4) {
    const interval = Math.max(1, Math.floor(totalLen / stoneCount));
    for (let n = 0; n < stoneCount; n++) {
      const pos = Math.min((n + 1) * interval - 1, totalLen - 1);
      if (pos >= 4 && pos < tokens.length) tokens[pos] = 'stone';
    }
  }
  return tokens;
}

// ─────────────────────────────────────────────────────────────
// Inline Lucide SVG icons (MIT · lucide.dev · stroke-based 24×24)
// Usage:  <Icon name="Pencil" size={14} />
// Color flows via currentColor; size in px.
// ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16, strokeWidth = 2 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' } };
  switch (name) {
    case 'BarChart3':         return <svg {...p}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
    case 'LineChart':         return <svg {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
    case 'Gamepad2':          return <svg {...p}><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/></svg>;
    case 'Settings':          return <svg {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'RefreshCw':         return <svg {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
    case 'X':                 return <svg {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
    case 'ChevronRight':      return <svg {...p}><path d="m9 18 6-6-6-6"/></svg>;
    case 'ChevronDown':       return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case 'ChevronLeft':       return <svg {...p}><path d="m15 18-6-6 6-6"/></svg>;
    case 'ArrowUp':           return <svg {...p}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
    case 'ArrowDown':         return <svg {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
    case 'ArrowLeft':         return <svg {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
    case 'Plus':              return <svg {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
    case 'Minus':             return <svg {...p}><path d="M5 12h14"/></svg>;
    case 'LogOut':            return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'Pencil':            return <svg {...p}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>;
    case 'Trash2':            return <svg {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
    case 'Check':             return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    case 'Search':            return <svg {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
    case 'StretchHorizontal': return <svg {...p}><rect width="20" height="6" x="2" y="4" rx="2"/><rect width="20" height="6" x="2" y="14" rx="2"/></svg>;
    case 'StretchVertical':   return <svg {...p}><rect width="6" height="20" x="4" y="2" rx="2"/><rect width="6" height="20" x="14" y="2" rx="2"/></svg>;
    case 'ChartNoAxesGantt':  return <svg {...p}><path d="M8 6h10"/><path d="M6 12h9"/><path d="M11 18h7"/></svg>;
    default:                  return null;
  }
}

Object.assign(window, {
  ALL_VALUES, STONE_VALUE, COLOR_MAP, CandyChip,
  labelOf, expectedValue, normalize, evenSplit, genTokens, Icon,
});
