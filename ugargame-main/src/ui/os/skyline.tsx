import { memo, useMemo, type CSSProperties } from 'react';

/** Deterministic PRNG (mulberry32) so skylines are identical on every render. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

export interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Lit when t < lit fraction. */
  t: number;
  warm: boolean;
}
export interface City {
  W: number;
  H: number;
  body: string;
  stripes: string;
  gold: string;
  wins: Win[];
  lights: { x: number; y: number; d: number }[];
}
export type CityKind = 'novo' | 'moscow';

/**
 * Procedural skyline. Новозаровск: panel blocks, 16-storey towers, a striped power-plant chimney,
 * a TV tower and a church. Москва: Moscow-City glass cluster, Stalinist high-rises, Ostankino.
 * layer 0 = far, 1 = mid, 2 = near.
 */
export function genCity(seed: number, kind: CityKind, layer: 0 | 1 | 2, W = 1600, H = 420): City {
  const r = rng(seed);
  const rb = (a: number, b: number) => a + r() * (b - a);
  let body = '';
  let stripes = '';
  let gold = '';
  const wins: Win[] = [];
  const lights: City['lights'] = [];
  const g = layer === 0 ? { sx: 6, sy: 8, cw: 3, ch: 4 } : layer === 1 ? { sx: 8, sy: 10, cw: 4, ch: 5 } : { sx: 10, sy: 12, cw: 5, ch: 6 };
  const glassG = { sx: g.sx - 2, sy: g.sy - 3, cw: g.cw, ch: g.ch * 0.55 };
  const light = (x: number, y: number) => lights.push({ x: f(x), y: f(y), d: f(r() * 3) });
  const grid = (x: number, top: number, w: number, h: number, gg = g) => {
    const cols = Math.floor((w - 6) / gg.sx);
    const rows = Math.floor((h - 10) / gg.sy);
    const ox = x + (w - cols * gg.sx) / 2 + (gg.sx - gg.cw) / 2;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) wins.push({ x: f(ox + j * gg.sx), y: f(top + 6 + i * gg.sy), w: gg.cw, h: f(gg.ch), t: r(), warm: r() < 0.8 });
  };
  const box = (x: number, w: number, h: number, win = true, gg = g) => {
    const top = H - h;
    body += `M${f(x)} ${H}V${f(top)}H${f(x + w)}V${H}Z`;
    if (win) grid(x, top, w, h, gg);
    return top;
  };
  const roof = (x: number, w: number, top: number) => {
    if (r() < 0.6) body += `M${f(x + w * rb(0.15, 0.6))} ${f(top)}v-${f(rb(4, 9))}h${f(rb(10, 22))}v${f(rb(4, 9))}z`;
    if (r() < 0.35) {
      const ax = x + w * rb(0.2, 0.8);
      const ah = rb(10, 22);
      body += `M${f(ax)} ${f(top)}v-${f(ah)}h1.6v${f(ah)}z`;
      light(ax + 0.8, top - ah);
    }
  };

  // Landmarks (reserve their x-range so ordinary buildings do not overlap them).
  const reserved: [number, number][] = [];
  const marks: (() => void)[] = [];
  const mark = (x0: number, x1: number, draw: () => void) => {
    reserved.push([x0, x1]);
    marks.push(draw);
  };
  const tvTower = (cx: number, h: number, ost = false) =>
    mark(cx - 20, cx + 20, () => {
      const top = H - h;
      body += ost
        ? `M${cx - 15} ${H}L${cx - 4} ${f(H - h * 0.35)}L${cx - 2.2} ${f(top)}H${cx + 2.2}L${cx + 4} ${f(H - h * 0.35)}L${cx + 15} ${H}Z`
        : `M${cx - 18} ${H}L${cx - 3} ${f(H - h * 0.55)}V${f(top)}H${cx + 3}V${f(H - h * 0.55)}L${cx + 18} ${H}Z`;
      const py = H - h * (ost ? 0.62 : 0.72);
      body += `M${cx - 10} ${f(py)}h20v8h-20z M${cx - 0.8} ${f(top)}v-22h1.6v22z`;
      light(cx, top - 22);
      light(cx, py - 1);
    });
  const chimney = (cx: number, h: number) =>
    mark(cx - 12, cx + 12, () => {
      const top = H - h;
      body += `M${cx - 10} ${H}L${cx - 5} ${f(top)}H${cx + 5}L${cx + 10} ${H}Z`;
      const band = h * 0.06;
      for (let k = 0; k < 4; k++) {
        const y0 = top + k * band * 2;
        const half = (y: number) => 5 + ((y - top) / h) * 5;
        stripes += `M${f(cx - half(y0))} ${f(y0)}H${f(cx + half(y0))}L${f(cx + half(y0 + band))} ${f(y0 + band)}H${f(cx - half(y0 + band))}Z`;
      }
      light(cx, top - 2);
      light(cx, top + h * 0.45);
    });
  const church = (cx: number) =>
    mark(cx - 46, cx + 46, () => {
      const bh = H * 0.2;
      const top = box(cx - 30, 60, bh, false);
      body += `M${cx - 12} ${f(top)}V${f(top - 22)}H${cx + 12}V${f(top)}Z`;
      const yb = top - 22;
      const dome = `M${cx - 14} ${f(yb)}C${cx - 17} ${f(yb - 12)} ${cx - 6} ${f(yb - 18)} ${cx} ${f(yb - 30)}C${cx + 6} ${f(yb - 18)} ${cx + 17} ${f(yb - 12)} ${cx + 14} ${f(yb)}Z`;
      body += dome + `M${cx - 0.9} ${f(yb - 30)}v-14h1.8v14z M${cx - 5} ${f(yb - 40)}h10v1.6h-10z`;
      gold += dome;
      // bell tower
      const bt = box(cx + 34, 14, H * 0.42, false);
      const bd = `M${cx + 34} ${f(bt)}C${cx + 34} ${f(bt - 8)} ${cx + 41} ${f(bt - 10)} ${cx + 41} ${f(bt - 18)}C${cx + 41} ${f(bt - 10)} ${cx + 48} ${f(bt - 8)} ${cx + 48} ${f(bt)}Z`;
      body += bd;
      gold += bd;
      grid(cx - 30, top, 60, bh, { ...g, sx: g.sx * 1.6, sy: g.sy * 1.5 });
    });
  const stalin = (cx: number, h: number, w: number) =>
    mark(cx - w * 0.95, cx + w * 0.95, () => {
      box(cx - w * 0.95, w * 0.5, h * 0.3);
      box(cx + w * 0.45, w * 0.5, h * 0.3);
      const tiers: [number, number][] = [
        [w, 0.5],
        [w * 0.68, 0.66],
        [w * 0.44, 0.78],
        [w * 0.24, 0.87],
      ];
      tiers.forEach(([tw, th], i) => box(cx - tw / 2, tw, h * th, i < 3));
      body += `M${f(cx - 3)} ${f(H - h * 0.87)}L${cx} ${f(H - h)}L${f(cx + 3)} ${f(H - h * 0.87)}Z`;
      light(cx, H - h - 2);
    });
  const cityCluster = (x0: number, x1: number) =>
    mark(x0, x1, () => {
      let x = x0;
      while (x < x1 - 30) {
        const w = rb(30, 52);
        const h = H * rb(0.6, 0.97);
        const top = H - h;
        const slant = r() < 0.5 ? rb(12, 34) : 0;
        body += slant ? `M${f(x)} ${H}V${f(top + slant)}L${f(x + w)} ${f(top)}V${H}Z` : `M${f(x)} ${H}V${f(top)}H${f(x + w)}V${H}Z`;
        grid(x, top + slant, w, h - slant, glassG);
        if (!slant) {
          body += `M${f(x + w / 2 - 0.8)} ${f(top)}v-26h1.6v26z`;
          light(x + w / 2, top - 26);
        } else light(x + w - 3, top + 2);
        x += w + rb(3, 9);
      }
    });

  const novo = kind === 'novo';
  if (novo && layer === 0) tvTower(W * 0.71, H * 0.94);
  if (novo && layer === 1) {
    chimney(W * 0.19, H * 0.9);
    chimney(W * 0.235, H * 0.72);
  }
  if (novo && layer === 2) church(W * 0.6);
  if (!novo && layer === 0) {
    tvTower(W * 0.1, H * 0.99, true);
    stalin(W * 0.82, H * 0.72, 46);
  }
  if (!novo && layer === 1) {
    stalin(W * 0.26, H * 0.88, 70);
    cityCluster(W * 0.55, W * 0.8);
  }

  // Ordinary buildings.
  const [wmin, wmax, hmin, hmax, towerP] =
    layer === 0 ? [40, 110, 0.16, 0.42, 0.2] : layer === 1 ? [70, 160, 0.2, 0.42, 0.22] : novo ? [120, 240, 0.2, 0.36, 0.14] : [80, 180, 0.24, 0.46, 0.25];
  let x = -14;
  while (x < W + 14) {
    const res = reserved.find(([a, b]) => x + 12 > a && x < b);
    if (res) {
      x = res[1] + rb(2, 8);
      continue;
    }
    const tower = r() < towerP;
    let w = tower ? rb(30, 56) * (layer === 2 ? 1.2 : 1) : rb(wmin, wmax);
    const next = reserved.filter(([a]) => a > x).sort((p, q) => p[0] - q[0])[0];
    if (next && x + w > next[0] - 2) w = next[0] - 2 - x;
    if (w < 18) {
      x = (next?.[1] ?? x + 20) + 2;
      continue;
    }
    const h = H * (tower ? rb(0.46, 0.7) : rb(hmin, hmax));
    const top = box(x, w, h);
    roof(x, w, top);
    if (tower && h > H * 0.55) light(x + w / 2, top - 1);
    x += w + (r() < 0.3 ? rb(4, 16) : rb(0, 3));
  }
  marks.forEach((m) => m());
  return { W, H, body, stripes, gold, wins, lights };
}

const winPath = (wins: Win[], pick: (w: Win) => boolean) => {
  let d = '';
  for (const w of wins) if (pick(w)) d += `M${w.x} ${w.y}h${w.w}v${w.h}h-${w.w}z`;
  return d;
};

/** One skyline layer as SVG, bottom-aligned and cropped to fill its box. */
export const CityLayer = memo(function CityLayer({
  city,
  fill,
  lit,
  glass = 0,
  gold = 0,
  stripe = 0,
  flicker = 0,
  glow = false,
  className,
  style,
}: {
  city: City;
  fill: string;
  lit: number;
  glass?: number;
  gold?: number;
  stripe?: number;
  flicker?: number;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const warm = useMemo(() => winPath(city.wins, (w) => w.t < lit && w.warm), [city, lit]);
  const cool = useMemo(() => winPath(city.wins, (w) => w.t < lit && !w.warm), [city, lit]);
  const dark = useMemo(() => (glass > 0 ? winPath(city.wins, (w) => w.t >= lit) : ''), [city, lit, glass > 0]);
  const flick = useMemo(() => (flicker ? city.wins.filter((w) => w.t >= lit && w.t < lit + 0.12).slice(0, flicker) : []), [city, lit, flicker]);
  const lr = city.H / 260;
  return (
    <svg viewBox={`0 0 ${city.W} ${city.H}`} preserveAspectRatio="xMidYMax slice" className={className} style={style}>
      <path d={city.body} fill={fill} />
      {gold > 0 && <path d={city.gold} fill="#D9A93F" opacity={gold} />}
      {stripe > 0 && <path d={city.stripes} fill="#C0392B" opacity={stripe} />}
      {dark && <path d={dark} fill="#D6E6FF" opacity={glass} />}
      <path d={warm} fill="#FFC978" style={glow ? { filter: 'drop-shadow(0 0 3px rgba(255,190,100,.7))' } : undefined} />
      <path d={cool} fill="#A6D4FF" opacity={0.85} />
      {flick.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill={w.warm ? '#FFC978' : '#A6D4FF'} className="win-flicker" style={{ animationDelay: `${(i * 0.73) % 9}s`, animationDuration: `${6 + (i % 6)}s` }} />
      ))}
      {city.lights.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={lr} fill="#FF4B3E" className="av-light" style={{ animationDelay: `${l.d}s` }} />
      ))}
    </svg>
  );
});
