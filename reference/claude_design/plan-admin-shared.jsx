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
  2048: { bg: '#fff2cc', dark: '#b89a40' },
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
          color: v === 2048 ? '#8a6a10' : '#fff',
          textShadow: v === 2048 ? 'none' : '0 1px 0 rgba(0,0,0,.3)',
          lineHeight: 1,
        }}>{v}</div>
      )}
    </div>
  );
}

// Compute expected value of one block given weight map { v: weight }
function expectedValue(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let sum = 0;
  for (const [v, w] of Object.entries(weights)) {
    sum += Number(v) * (w / total);
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

Object.assign(window, {
  ALL_VALUES, STONE_VALUE, COLOR_MAP, CandyChip,
  labelOf, expectedValue, normalize, evenSplit,
});
