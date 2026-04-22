// sliders.jsx — 6 horizontal 2048-value slider variants, candy theme.
// All variants share: VALUES array, shared color map (one hue per power),
// and a useDrag() hook. They differ in track/handle/segment treatment.

const VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

// Hue per power index — saturated candy palette, evenly rotating.
// Pulled-in-spirit from the reference sheet: pink, red, orange, yellow,
// lime, green, teal, sky, blue, indigo, violet, magenta, rose.
const SEG_COLORS = [
  { bg: '#ff5d8f', dark: '#c8346a' }, // 2    - hot pink
  { bg: '#ff3b3b', dark: '#b02424' }, // 4    - red
  { bg: '#ff8a3c', dark: '#c85a1a' }, // 8    - orange
  { bg: '#ffd23c', dark: '#b8941d' }, // 16   - yellow
  { bg: '#b5e84a', dark: '#6fa017' }, // 32   - lime
  { bg: '#4ecd7a', dark: '#1f8a47' }, // 64   - green
  { bg: '#3cd0c0', dark: '#17867a' }, // 128  - teal
  { bg: '#3cbdff', dark: '#1b7bb5' }, // 256  - sky
  { bg: '#5a7cff', dark: '#2d47c0' }, // 512  - blue
  { bg: '#8e5dff', dark: '#5a2ec0' }, // 1024 - indigo
  { bg: '#c14dff', dark: '#7e1dbb' }, // 2048 - violet
  { bg: '#ff4dcc', dark: '#b01c88' }, // 4096 - magenta
  { bg: '#ff4d7a', dark: '#b01c45' }, // 8192 - rose
];

// ────────────────────────────────────────────────────────────
// useDrag — centralized pointer logic: drag the handle OR click
// a tick to snap. Returns {idx, setIdx, trackRef, handleProps, trackProps}.
// ────────────────────────────────────────────────────────────
function useSlider(initial = 4) {
  const [idx, setIdx] = React.useState(initial);
  const trackRef = React.useRef(null);
  const dragging = React.useRef(false);

  const idxFromClientX = (cx) => {
    const el = trackRef.current;
    if (!el) return idx;
    const r = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    return Math.round(pct * (VALUES.length - 1));
  };

  const onDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    const i = idxFromClientX(e.clientX);
    setIdx(i);
    const move = (ev) => { if (dragging.current) setIdx(idxFromClientX(ev.clientX)); };
    const up = () => {
      dragging.current = false;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const pct = idx / (VALUES.length - 1);
  return { idx, setIdx, trackRef, pct, onDown };
}

// Shared: the text-outline technique for candy number labels
const candyText = (size = 22) => ({
  fontFamily: 'Fredoka, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: size,
  color: '#fff',
  textShadow:
    '0 2px 0 rgba(0,0,0,.25),' +
    ' -1.5px -1.5px 0 rgba(0,0,0,.35), 1.5px -1.5px 0 rgba(0,0,0,.35),' +
    ' -1.5px 1.5px 0 rgba(0,0,0,.35), 1.5px 1.5px 0 rgba(0,0,0,.35)',
  lineHeight: 1,
  letterSpacing: -0.5,
});

// Shared: small stop-mark under each tick (the number line)
function TickLabels({ idx, compact = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '0 2px' }}>
      {VALUES.map((v, i) => {
        const active = i === idx;
        return (
          <div key={v} style={{
            flex: '0 0 auto', width: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              fontFamily: 'Fredoka, system-ui, sans-serif',
              fontWeight: active ? 600 : 500,
              fontSize: active ? (compact ? 12 : 13) : (compact ? 10 : 11),
              color: active ? SEG_COLORS[i].dark : '#8a8a94',
              transition: 'all .12s',
              whiteSpace: 'nowrap',
              transform: active ? 'translateY(-1px)' : 'none',
            }}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V1 — Segmented allocation bar.
// 13 colored segments summing to 100%. Drag any divider (edge between
// two segments) to move value between the two neighbors only; other
// segments are unaffected. Each segment keeps a minimum of MIN_PCT.
// ═══════════════════════════════════════════════════════════════════
const MIN_PCT = 2;
const N = VALUES.length;
const EVEN = () => Array(N).fill(100 / N);

function V1_Segmented() {
  const [pcts, setPcts] = React.useState(EVEN);
  const [hoverIdx, setHoverIdx] = React.useState(null);
  const [dragDivider, setDragDivider] = React.useState(null); // index of the divider being dragged (between i and i+1)
  const trackRef = React.useRef(null);

  // Drag a divider between segment i and i+1 — only those two change.
  const onDividerDown = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragDivider(i);
    const el = trackRef.current;
    const r = el.getBoundingClientRect();
    const startX = e.clientX;
    const startL = pcts[i];
    const startR = pcts[i + 1];
    const total = startL + startR;

    const move = (ev) => {
      const deltaPx = ev.clientX - startX;
      const deltaPct = (deltaPx / r.width) * 100;
      let newL = startL + deltaPct;
      let newR = startR - deltaPct;
      if (newL < MIN_PCT) { newL = MIN_PCT; newR = total - MIN_PCT; }
      if (newR < MIN_PCT) { newR = MIN_PCT; newL = total - MIN_PCT; }
      setPcts((prev) => {
        const next = prev.slice();
        next[i] = newL;
        next[i + 1] = newR;
        return next;
      });
    };
    const up = () => {
      setDragDivider(null);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const reset = () => setPcts(EVEN());

  const total = pcts.reduce((a, b) => a + b, 0); // always 100, but guard
  const fmt = (p) => (p < 10 ? p.toFixed(1) : Math.round(p).toString());

  return (
    <div style={{ padding: '28px 36px 32px', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4 }}>allocation</div>
          <div style={{ ...candyText(22), color: '#2a2a33', textShadow: 'none', marginTop: 2 }}>
            Total <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(total)}%</span>
          </div>
        </div>
        <button onClick={reset}
          style={{
            border: 'none', cursor: 'pointer',
            fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: 13,
            color: '#5a5a66', background: '#ececf2',
            padding: '7px 14px', borderRadius: 8,
            boxShadow: '0 1px 0 rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.7)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#e0e0e8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ececf2')}>
          ↻ 重置
        </button>
      </div>

      {/* Track */}
      <div ref={trackRef}
        style={{
          display: 'flex', borderRadius: 14, overflow: 'visible',
          height: 44, position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.2), 0 2px 0 rgba(255,255,255,.5)',
          background: '#d8d8e0',
          touchAction: 'none',
        }}>
        {VALUES.map((v, i) => {
          const c = SEG_COLORS[i];
          const p = pcts[i];
          const hovered = hoverIdx === i;
          const isFirst = i === 0;
          const isLast = i === N - 1;
          const showLabel = p >= 3.2; // only show number inside if there's room
          return (
            <div key={v}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
              style={{
                flex: `0 0 ${p}%`,
                background: `linear-gradient(to bottom, ${c.bg}, ${c.dark})`,
                borderTopLeftRadius: isFirst ? 14 : 0,
                borderBottomLeftRadius: isFirst ? 14 : 0,
                borderTopRightRadius: isLast ? 14 : 0,
                borderBottomRightRadius: isLast ? 14 : 0,
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: hovered ? 'filter .15s' : 'flex-basis .05s linear, filter .15s',
                filter: hovered ? 'brightness(1.08)' : 'none',
                minWidth: 0,
                overflow: 'visible',
              }}>
              {/* inner gloss */}
              <div style={{
                position: 'absolute', top: 3, left: isFirst ? 6 : 2, right: isLast ? 6 : 2, height: 10,
                background: 'linear-gradient(to bottom, rgba(255,255,255,.55), rgba(255,255,255,0))',
                borderRadius: '10px 10px 50% 50%',
                pointerEvents: 'none',
              }} />

              {/* number inside the segment */}
              {showLabel && (
                <div style={{ ...candyText(p > 8 ? 15 : 12), zIndex: 1, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  {v}
                </div>
              )}

              {/* Divider handle on the right edge (not after last segment) */}
              {!isLast && (
                <div
                  onPointerDown={onDividerDown(i)}
                  style={{
                    position: 'absolute', right: -6, top: -4, bottom: -4,
                    width: 12, cursor: 'ew-resize', zIndex: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <div style={{
                    width: 3, height: '70%', background: 'rgba(255,255,255,.75)',
                    borderRadius: 2,
                    boxShadow: dragDivider === i
                      ? '0 0 0 2px rgba(0,0,0,.25), 0 0 10px rgba(255,255,255,.8)'
                      : '0 0 0 1px rgba(0,0,0,.15)',
                    transition: 'box-shadow .12s, height .12s',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Value + percent labels, one column per segment, centered under each */}
      <div style={{ display: 'flex', marginTop: 10, position: 'relative', height: 36 }}>
        {VALUES.map((v, i) => {
          const c = SEG_COLORS[i];
          const p = pcts[i];
          const hovered = hoverIdx === i;
          return (
            <div key={v}
              style={{
                flex: `0 0 ${p}%`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 0, overflow: 'visible',
                transition: 'flex-basis .05s linear',
              }}>
              <div style={{
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: c.dark,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                transform: hovered ? 'translateY(-1px)' : 'none',
                transition: 'transform .12s',
              }}>{v}</div>
              <div style={{
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontWeight: 500,
                fontSize: 11,
                color: hovered ? c.dark : '#9b9ba6',
                marginTop: 3,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>{fmt(p)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V2 — Candy beads on a rail; active bead is a big shiny pointer
// ═══════════════════════════════════════════════════════════════════
function V2_BeadsOnRail() {
  const { idx, trackRef, pct, onDown } = useSlider(5);
  const cur = SEG_COLORS[idx];
  return (
    <div style={{ padding: '60px 40px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>current</div>
      <div style={{ ...candyText(28), color: cur.dark, textShadow: 'none', marginBottom: 32 }}>{VALUES[idx]}</div>

      {/* Arrow pointer */}
      <div style={{ position: 'relative', height: 22, marginBottom: 6 }}>
        <div style={{
          position: 'absolute', left: `${pct * 100}%`, top: 4,
          transform: 'translateX(-50%)', transition: 'left .12s',
        }}>
          <svg width="16" height="18" viewBox="0 0 16 18">
            <path d="M8 18 L0 2 Q0 0 2 0 L14 0 Q16 0 16 2 Z" fill={cur.dark} />
            <path d="M8 16 L1.6 2.6 Q1.6 1.3 2.8 1.3 L13.2 1.3 Q14.4 1.3 14.4 2.6 Z" fill={cur.bg} />
          </svg>
        </div>
      </div>

      {/* Rail with beads */}
      <div ref={trackRef} onPointerDown={onDown}
        style={{ position: 'relative', height: 44, cursor: 'pointer', touchAction: 'none' }}>
        {/* rail */}
        <div style={{
          position: 'absolute', left: 10, right: 10, top: '50%', height: 6, transform: 'translateY(-50%)',
          background: '#d8d8e0', borderRadius: 3, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.25)',
        }} />
        {/* beads */}
        {VALUES.map((v, i) => {
          const c = SEG_COLORS[i];
          const active = i === idx;
          const size = active ? 40 : 18;
          return (
            <div key={v}
              style={{
                position: 'absolute',
                left: `calc(${(i / (VALUES.length - 1)) * 100}% )`,
                top: '50%',
                transform: `translate(-50%, -50%)`,
                width: size, height: size, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, #fff8, ${c.bg} 50%, ${c.dark})`,
                boxShadow: active
                  ? `0 4px 12px rgba(0,0,0,.25), 0 0 0 3px #fff, 0 0 0 5px ${c.dark}44`
                  : `inset 0 -2px 3px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'width .15s, height .15s, box-shadow .15s',
                zIndex: active ? 3 : 1,
              }}>
              {active && <div style={candyText(14)}>{v}</div>}
              {/* gloss highlight */}
              <div style={{
                position: 'absolute', top: '14%', left: '22%',
                width: '38%', height: '22%', background: 'rgba(255,255,255,.6)',
                borderRadius: '50%', filter: 'blur(1px)', pointerEvents: 'none',
              }} />
            </div>
          );
        })}
      </div>
      <TickLabels idx={idx} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V3 — Thermometer: gradient-filled tube with a glass highlight
// ═══════════════════════════════════════════════════════════════════
function V3_Thermometer() {
  const { idx, trackRef, pct, onDown } = useSlider(7);
  const cur = SEG_COLORS[idx];
  const gradStops = SEG_COLORS.slice(0, idx + 1)
    .map((c, i, arr) => `${c.bg} ${(i / Math.max(arr.length - 1, 1)) * 100}%`).join(', ');

  return (
    <div style={{ padding: '60px 40px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>current value</div>
      <div style={{ ...candyText(28), color: cur.dark, textShadow: 'none', marginBottom: 36 }}>{VALUES[idx]}</div>

      {/* bulb + tube */}
      <div style={{ position: 'relative', height: 54 }}>
        {/* bulb on the left */}
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 54, height: 54, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${SEG_COLORS[0].bg} 40%, ${SEG_COLORS[0].dark} 95%)`,
          boxShadow: `inset 0 -3px 6px rgba(0,0,0,.3), 0 3px 8px rgba(0,0,0,.2)`,
          zIndex: 2,
        }} />
        {/* tube */}
        <div ref={trackRef} onPointerDown={onDown}
          style={{
            position: 'absolute', left: 44, right: 24, top: '50%', transform: 'translateY(-50%)',
            height: 32, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', touchAction: 'none',
            background: '#e8e8ee',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.25), inset 0 -1px 2px rgba(255,255,255,.5)',
          }}>
          {/* fill */}
          <div style={{
            position: 'absolute', inset: 0, width: `${pct * 100}%`,
            background: idx === 0
              ? `linear-gradient(to right, ${SEG_COLORS[0].bg}, ${SEG_COLORS[0].bg})`
              : `linear-gradient(to right, ${gradStops})`,
            transition: 'width .12s',
          }} />
          {/* glass highlight */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 4, height: 7,
            background: 'linear-gradient(to bottom, rgba(255,255,255,.6), rgba(255,255,255,0))',
            borderRadius: '16px 16px 50% 50%',
            pointerEvents: 'none',
          }} />
        </div>
        {/* handle — a white puck with the value */}
        <div style={{
          position: 'absolute', left: `calc(44px + (100% - 68px) * ${pct})`,
          top: '50%', transform: 'translate(-50%, -50%)',
          padding: '4px 10px', borderRadius: 14, background: '#fff',
          boxShadow: `0 2px 4px rgba(0,0,0,.2), 0 0 0 3px ${cur.bg}`,
          zIndex: 3, transition: 'left .12s',
          ...candyText(14), color: cur.dark, textShadow: 'none',
        }}>{VALUES[idx]}</div>
      </div>
      <TickLabels idx={idx} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V4 — Notched wood rail w/ wrapped-candy handle (like ref sheet bottom)
// ═══════════════════════════════════════════════════════════════════
function V4_WrappedCandy() {
  const { idx, trackRef, pct, onDown } = useSlider(3);
  const cur = SEG_COLORS[idx];
  return (
    <div style={{ padding: '60px 40px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>value</div>
      <div style={{ ...candyText(28), color: cur.dark, textShadow: 'none', marginBottom: 36 }}>{VALUES[idx]}</div>

      {/* track w/ notches */}
      <div ref={trackRef} onPointerDown={onDown}
        style={{
          position: 'relative', height: 44, cursor: 'pointer', touchAction: 'none',
        }}>
        {/* channel */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: 12,
          transform: 'translateY(-50%)', borderRadius: 6,
          background: 'linear-gradient(to bottom, #bab9c3, #e4e3ed)',
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.7)',
        }} />
        {/* notches */}
        {VALUES.map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${(i / (VALUES.length - 1)) * 100}%`,
            top: '50%', transform: 'translate(-50%, -50%)',
            width: 3, height: 10, background: 'rgba(0,0,0,.25)',
            borderRadius: 2,
          }} />
        ))}
        {/* wrapped candy handle */}
        <div style={{
          position: 'absolute', left: `${pct * 100}%`, top: '50%',
          transform: 'translate(-50%, -50%)', transition: 'left .1s',
          display: 'flex', alignItems: 'center', zIndex: 2,
        }}>
          {/* left wrap */}
          <svg width="14" height="26" viewBox="0 0 14 26" style={{ marginRight: -2 }}>
            <path d="M14 4 Q2 2 0 13 Q2 24 14 22 Z" fill={cur.dark} />
            <path d="M13 5.5 Q3 3.5 1.5 13 Q3 22.5 13 20.5 Z" fill={cur.bg} />
          </svg>
          {/* body */}
          <div style={{
            width: 68, height: 34, borderRadius: 18,
            background: `radial-gradient(ellipse at 30% 25%, #fff9 0%, ${cur.bg} 45%, ${cur.dark})`,
            boxShadow: `0 3px 8px rgba(0,0,0,.25), inset 0 -2px 3px rgba(0,0,0,.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={candyText(16)}>{VALUES[idx]}</div>
            {/* gloss */}
            <div style={{
              position: 'absolute', top: 5, left: 10, width: 22, height: 8,
              background: 'rgba(255,255,255,.7)', borderRadius: '50%', filter: 'blur(1px)',
            }} />
          </div>
          {/* right wrap */}
          <svg width="14" height="26" viewBox="0 0 14 26" style={{ marginLeft: -2 }}>
            <path d="M0 4 Q12 2 14 13 Q12 24 0 22 Z" fill={cur.dark} />
            <path d="M1 5.5 Q11 3.5 12.5 13 Q11 22.5 1 20.5 Z" fill={cur.bg} />
          </svg>
        </div>
      </div>
      <TickLabels idx={idx} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V5 — Stepped bars (progress ladder). Each notch is a stepped block
// ═══════════════════════════════════════════════════════════════════
function V5_SteppedBars() {
  const { idx, trackRef, pct, onDown } = useSlider(6);
  const cur = SEG_COLORS[idx];
  return (
    <div style={{ padding: '60px 40px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>power</div>
      <div style={{ ...candyText(28), color: cur.dark, textShadow: 'none', marginBottom: 24 }}>{VALUES[idx]}</div>

      {/* bars: each bar's height grows with power */}
      <div ref={trackRef} onPointerDown={onDown}
        style={{
          position: 'relative', height: 72, cursor: 'pointer', touchAction: 'none',
          display: 'flex', alignItems: 'flex-end', gap: 4,
          padding: '0 2px 8px',
          borderBottom: '2px solid #d8d8e0',
        }}>
        {VALUES.map((v, i) => {
          const c = SEG_COLORS[i];
          const h = 14 + (i / (VALUES.length - 1)) * 54;
          const active = i <= idx;
          return (
            <div key={v} style={{
              flex: 1, height: h, borderRadius: '6px 6px 2px 2px',
              background: active
                ? `linear-gradient(to bottom, ${c.bg}, ${c.dark})`
                : '#e4e4ec',
              boxShadow: active
                ? `inset 0 -2px 3px rgba(0,0,0,.2), inset 0 2px 2px rgba(255,255,255,.35)`
                : 'inset 0 1px 2px rgba(0,0,0,.08)',
              transition: 'background .1s',
              position: 'relative',
            }}>
              {i === idx && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%',
                  transform: 'translate(-50%, -8px)',
                  ...candyText(13),
                  background: c.bg, padding: '3px 8px', borderRadius: 7,
                  boxShadow: `0 2px 0 ${c.dark}`,
                  whiteSpace: 'nowrap',
                }}>{v}</div>
              )}
            </div>
          );
        })}
        {/* draggable thumb line */}
        <div style={{
          position: 'absolute', left: `calc(${pct * 100}% + 2px)`,
          top: -4, bottom: -4,
          width: 3, background: cur.dark, borderRadius: 2,
          transform: 'translateX(-50%)', pointerEvents: 'none',
          transition: 'left .1s',
          boxShadow: `0 0 0 2px rgba(255,255,255,.8), 0 0 0 4px ${cur.bg}`,
        }} />
      </div>
      <TickLabels idx={idx} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V6 — Striped candy-cane rail; minimalist dot handle
// ═══════════════════════════════════════════════════════════════════
function V6_CandyCane() {
  const { idx, trackRef, pct, onDown } = useSlider(8);
  const cur = SEG_COLORS[idx];

  // build a diagonal-stripes background from all segment colors up to idx
  const stripes = SEG_COLORS.slice(0, idx + 1).map((c, i, arr) => {
    const p0 = (i / arr.length) * 100;
    const p1 = ((i + 1) / arr.length) * 100;
    return `${c.bg} ${p0}%, ${c.bg} ${p1}%`;
  }).join(', ');

  return (
    <div style={{ padding: '60px 40px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>tier</div>
      <div style={{ ...candyText(28), color: cur.dark, textShadow: 'none', marginBottom: 36 }}>{VALUES[idx]}</div>

      <div ref={trackRef} onPointerDown={onDown}
        style={{
          position: 'relative', height: 48, cursor: 'pointer', touchAction: 'none',
        }}>
        {/* rail bg */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: 22,
          transform: 'translateY(-50%)', borderRadius: 11,
          background: '#e4e4ec',
          boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,.25)',
          overflow: 'hidden',
        }}>
          {/* striped fill */}
          <div style={{
            height: '100%', width: `${pct * 100}%`,
            background: idx === 0
              ? SEG_COLORS[0].bg
              : `repeating-linear-gradient(115deg, ${stripes})`,
            transition: 'width .12s',
            position: 'relative',
          }}>
            {/* inner gloss */}
            <div style={{
              position: 'absolute', top: 2, left: 0, right: 0, height: 6,
              background: 'linear-gradient(to bottom, rgba(255,255,255,.5), rgba(255,255,255,0))',
              borderRadius: '11px 11px 50% 50%',
            }} />
          </div>
        </div>
        {/* dot handle w/ floating label */}
        <div style={{
          position: 'absolute', left: `${pct * 100}%`, top: '50%',
          transform: 'translate(-50%, -50%)', transition: 'left .12s',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', zIndex: 3,
        }}>
          <div style={{
            ...candyText(12),
            background: cur.dark, padding: '2px 7px', borderRadius: 5,
            marginBottom: 4, whiteSpace: 'nowrap',
          }}>{VALUES[idx]}</div>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 25%, #fff 0%, ${cur.bg} 55%, ${cur.dark})`,
            boxShadow: `0 2px 6px rgba(0,0,0,.3), 0 0 0 3px #fff`,
          }} />
        </div>
      </div>
      <TickLabels idx={idx} />
    </div>
  );
}

Object.assign(window, {
  V1_Segmented, V2_BeadsOnRail, V3_Thermometer,
  V4_WrappedCandy, V5_SteppedBars, V6_CandyCane,
  VALUES, SEG_COLORS,
});
