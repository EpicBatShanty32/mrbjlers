import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../common/kit';

/** Deterministic PRNG: scenes render identically every time. */
export function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) * 9301 + 49297) % 233280 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const css = (o: Record<string, string | number | undefined>) => o as CSSProperties;
/** Stage coordinates (1600×900) → CSS percentages. */
export const px = (x: number) => `${x / 16}%`;
export const py = (y: number) => `${y / 9}%`;

/**
 * 16:9 box covering the viewport: SVG art and HTML overlays share one coordinate
 * space (stage px 1600×900), whatever the window aspect.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div className="absolute top-1/2 left-1/2" style={{ width: 'max(100vw, 177.78vh)', height: 'max(56.25vw, 100vh)', translate: '-50% -50%' }}>
        {children}
      </div>
    </div>
  );
}

export function Svg({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="none" className={cn('absolute inset-0 h-full w-full overflow-visible', className)} style={style}>
      {children}
    </svg>
  );
}

/** Parallax plane: deeper planes (d→0) drift less, near planes (d→1) more. */
export function Layer({ d = 0, children, className, style }: { d?: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('cs-par', className)} style={{ ...css({ '--px': `${(d * 1.8).toFixed(2)}%`, '--pd': `${Math.round(34 - d * 12)}s`, '--ps': (1.02 + d * 0.05).toFixed(3) }), ...style }}>
      {children}
    </div>
  );
}

// ── rain: tiled SVG streak textures, one composited element per depth ──
const RAIN_LAYERS = [
  { n: 38, w: 180, h: 320, len: 13, sw: 0.8, op: 0.34, speed: 540 }, // far
  { n: 16, w: 230, h: 430, len: 30, sw: 1.15, op: 0.45, speed: 1000 }, // mid
  { n: 4, w: 360, h: 720, len: 90, sw: 3, op: 0.16, speed: 1800 }, // near, out of focus
];

function rainTile(i: number, color: string) {
  const L = RAIN_LAYERS[i];
  const r = rng(17 + i * 31);
  let out = '';
  for (let k = 0; k < L.n; k++) {
    const x = (r() * L.w).toFixed(1), y = r() * L.h, l = L.len * (0.6 + r() * 0.8), o = (L.op * (0.35 + r() * 0.65)).toFixed(2);
    for (const oy of y + l > L.h ? [0, -L.h] : [0]) out += `<line x1='${x}' y1='${(y + oy).toFixed(1)}' x2='${x}' y2='${(y + oy + l).toFixed(1)}' stroke-opacity='${o}'/>`;
  }
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='${L.w}' height='${L.h}'><g stroke='${color}' stroke-width='${L.sw}' stroke-linecap='round'>${out}</g></svg>`);
}

export function Rain({ color = '#c4d8f2', angle = 9, opacity = 1, depth = [0, 1, 2], className, style }: { color?: string; angle?: number; opacity?: number; depth?: number[]; className?: string; style?: CSSProperties }) {
  const key = depth.join();
  const tiles = useMemo(() => key.split(',').map((s) => ({ i: +s, url: rainTile(+s, color) })), [key, color]);
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ opacity, ...style }}>
      <div className="cs-rain-wrap" style={css({ '--ang': `${angle}deg` })}>
        {tiles.map(({ i, url }) => {
          const L = RAIN_LAYERS[i];
          return <div key={i} className="cs-rain" style={css({ backgroundImage: url, '--tw': `${L.w}px`, '--th': `${L.h}px`, '--rd': `${(L.h / L.speed).toFixed(3)}s` })} />;
        })}
      </div>
    </div>
  );
}

/** Soft radial light in stage px. */
export function Glow({ x, y, w, h = w, color, o = 1, className, style }: { x: number; y: number; w: number; h?: number; color: string; o?: number; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn('pointer-events-none absolute', className)}
      style={{ left: px(x - w / 2), top: py(y - h / 2), width: px(w), height: py(h), background: `radial-gradient(closest-side, ${color}, transparent)`, opacity: o, ...style }}
    />
  );
}

/** Out-of-focus light discs (soft edges are baked into the gradient — no blur filters). */
export function Bokeh({ n, seed = 1, colors, x = [0, 1600], y = [0, 900], r = [10, 50], o = [0.15, 0.5], className }: { n: number; seed?: number; colors: string[]; x?: [number, number]; y?: [number, number]; r?: [number, number]; o?: [number, number]; className?: string }) {
  const items = useMemo(() => {
    const R = rng(seed);
    return Array.from({ length: n }, (_, i) => ({
      x: x[0] + R() * (x[1] - x[0]), y: y[0] + R() * (y[1] - y[0]), r: r[0] + R() * (r[1] - r[0]), o: o[0] + R() * (o[1] - o[0]),
      c: colors[i % colors.length], bx: (R() - 0.5) * 50, by: (R() - 0.5) * 50, bd: 6 + R() * 9, dl: -R() * 12,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, seed]);
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      {items.map((b, i) => (
        <div
          key={i}
          className="cs-bokeh absolute rounded-full"
          style={css({
            left: px(b.x - b.r), top: py(b.y - b.r), width: px(b.r * 2), aspectRatio: '1', opacity: b.o,
            background: `radial-gradient(circle, ${b.c} 0%, ${b.c} 48%, transparent 70%)`,
            '--bx': `${b.bx.toFixed(0)}px`, '--by': `${b.by.toFixed(0)}px`, '--bd': `${b.bd.toFixed(1)}s`, animationDelay: `${b.dl.toFixed(1)}s`,
          })}
        />
      ))}
    </div>
  );
}

export function Fog({ y = 620, h = 260, color = 'rgba(150,170,200,.16)', className }: { y?: number; h?: number; color?: string; className?: string }) {
  return (
    <div
      className={cn('cs-fog pointer-events-none absolute -right-[15%] -left-[15%]', className)}
      style={{ top: py(y - h / 2), height: py(h), background: `radial-gradient(42% 50% at 22% 50%, ${color}, transparent), radial-gradient(38% 46% at 68% 42%, ${color}, transparent), radial-gradient(30% 40% at 48% 62%, ${color}, transparent)` }}
    />
  );
}

const NOISE = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)'/></svg>`,
);

/** Vignette + animated film grain (grain optional). */
export function PostFX({ grain }: { grain: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cs-vignette" />
      {grain && <div className="cs-grain" style={{ backgroundImage: NOISE }} />}
    </div>
  );
}
