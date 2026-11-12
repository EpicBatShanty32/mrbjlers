import { useMemo, type CSSProperties, type ReactElement } from 'react';
import { rng } from '../fx';

export type Stops = [number, string][];

export function Grad({ id, stops, x2 = 0, y2 = 1 }: { id: string; stops: Stops; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
    </linearGradient>
  );
}

export function Sky({ id, stops }: { id: string; stops: Stops }) {
  return (
    <>
      <defs><Grad id={id} stops={stops} /></defs>
      <rect width="1600" height="900" fill={`url(#${id})`} />
    </>
  );
}

/** Shared blur filters, render once per <svg>. */
export const Blurs = () => (
  <defs>
    {[2, 4, 7, 12, 22].map((s) => (
      <filter key={s} id={`b${s}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={s} /></filter>
    ))}
  </defs>
);

export const WARM = ['#ffcf87', '#ffbb66', '#ffe0a6', '#ffc27a', '#a8c6ff'];

interface SkylineProps {
  seed: number; base: number; h: [number, number]; w: [number, number]; fill: string;
  x0?: number; x1?: number; win?: string[]; litP?: number; cell?: [number, number, number, number]; beacon?: boolean;
}
/** Procedural row of towers with lit windows (static SVG). */
export function Skyline({ seed, base, h, w, fill, x0 = -60, x1 = 1660, win, litP = 0.22, cell = [6, 8, 12, 15], beacon }: SkylineProps) {
  const els = useMemo(() => {
    const R = rng(seed);
    const out: ReactElement[] = [];
    const [cw, ch, sx, sy] = cell;
    for (let x = x0; x < x1; ) {
      const bw = w[0] + R() * (w[1] - w[0]), bh = h[0] + R() * (h[1] - h[0]), top = base - bh;
      out.push(<rect key={`b${x}`} x={x} y={top} width={bw} height={bh + 4} fill={fill} />);
      if (R() < 0.3) out.push(<rect key={`c${x}`} x={x + bw * 0.3} y={top - 14} width={bw * 0.4} height={16} fill={fill} />);
      if (win)
        for (let wy = top + 8; wy < base - 10; wy += sy)
          for (let wx = x + 5; wx < x + bw - cw - 3; wx += sx)
            if (R() < litP) out.push(<rect key={`w${wx | 0}_${wy | 0}`} x={wx} y={wy} width={cw} height={ch} fill={win[(R() * win.length) | 0]} opacity={0.35 + R() * 0.65} />);
      if (beacon && bh > (h[0] + h[1]) * 0.55)
        out.push(<circle key={`a${x}`} cx={x + bw / 2} cy={top - 18} r={3.2} fill="#ff4040" className="cs-blink" style={{ animationDelay: `${(R() * 2.4).toFixed(2)}s` }} />);
      x += bw + R() * 6;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return <g>{els}</g>;
}

interface PanelProps {
  x: number; y: number; w: number; cols: number; seed: number;
  floors?: number; fh?: number; fill?: string; lit?: string[]; litP?: number; balconies?: number[]; door?: number; flicker?: number; detail?: boolean;
}
/** Soviet five-storey panel block («хрущёвка»): seams, windows with фортточки, glazed loggias. */
export function PanelBlock({ x, y, w, cols, seed, floors = 5, fh = 92, fill = '#181d28', lit = WARM, litP = 0.32, balconies = [], door = -1, flicker = 0, detail = true }: PanelProps) {
  const H = floors * fh + 22;
  const p = useMemo(() => {
    const R = rng(seed), cw = w / cols;
    const dark: ReactElement[] = [], on: ReactElement[] = [], glow: ReactElement[] = [];
    let seams = '';
    for (let f = 1; f < floors; f++) seams += `M${x} ${y + 22 + f * fh}h${w}`;
    for (let c = 1; c < cols; c++) seams += `M${x + c * cw} ${y + 22}v${H - 22}`;
    for (let f = 0; f < floors; f++)
      for (let c = 0; c < cols; c++) {
        if (f === floors - 1 && c === door) continue;
        const fy = y + 22 + f * fh, wx = x + c * cw + cw * 0.24, wy = fy + fh * 0.2, ww = cw * 0.52, wh = fh * 0.56;
        if (balconies.includes(c) && f < floors - 1)
          dark.push(<rect key={`b${f}_${c}`} x={x + c * cw + cw * 0.07} y={fy + fh * 0.1} width={cw * 0.86} height={fh * 0.86} fill="#121722" stroke="rgba(255,255,255,.08)" strokeWidth={1.5} />);
        if (R() >= litP) {
          dark.push(<rect key={`d${f}_${c}`} x={wx} y={wy} width={ww} height={wh} fill="#090c13" stroke="rgba(160,180,220,.07)" />);
          continue;
        }
        const col = lit[(R() * lit.length) | 0], fl = R() < flicker;
        const st = fl ? ({ '--fd': `${(4 + R() * 7).toFixed(1)}s`, animationDelay: `${(-R() * 6).toFixed(1)}s` } as CSSProperties) : undefined;
        on.push(
          <g key={`l${f}_${c}`} className={fl ? 'cs-flicker' : undefined} style={st}>
            <rect x={wx} y={wy} width={ww} height={wh} fill={col} opacity={0.7 + R() * 0.3} />
            {detail && <rect x={wx} y={wy} width={ww * (0.15 + R() * 0.35)} height={wh} fill="#000" opacity={0.35} />}
            {detail && <path d={`M${wx + ww * 0.62} ${wy}v${wh}M${wx} ${wy + wh * 0.36}h${ww}`} stroke="#0b0d12" strokeWidth={2.4} />}
          </g>,
        );
        glow.push(<rect key={`g${f}_${c}`} x={wx - 10} y={wy - 10} width={ww + 20} height={wh + 20} fill={col} />);
      }
    return { dark, on, glow, seams };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return (
    <g>
      <rect x={x} y={y} width={w} height={H} fill={fill} />
      <rect x={x - 6} y={y} width={w + 12} height={16} fill="#0c0f16" />
      <path d={p.seams} stroke="rgba(255,255,255,.05)" strokeWidth={2} />
      <g opacity={0.5} filter="url(#b7)">{p.glow}</g>
      {p.dark}
      {p.on}
    </g>
  );
}

const TOWERS = [
  'M0 0V-280Q35-312 70-280V0Z',
  'M85 0C80-110 100-220 88-330H141C153-220 133-110 141 0Z',
  'M150 0V-360L176-382L202-360V0Z',
  'M206 0V-480L239-522L272-480V0Z',
  'M282 0V-400H292V-430H302V-455H322V-430H332V-400H342V0Z',
  'M354 0V-410L383-442L412-410V0Z',
  'M418 0V-322L462-346V0Z',
  'M472 0V-380L499-440L526-380V0Z',
  'M534 0V-352H582V0Z',
];
const TOPS: [number, number][] = [[239, -585], [312, -458], [383, -446], [499, -444]];

export type CityMode = 'day' | 'night' | 'dawn' | 'cold';
const CITY: Record<CityMode, { a: string; b: string; win: string; wo: number; bronze: string }> = {
  day: { a: '#a9c2da', b: '#6d87a3', win: '#e9f3ff', wo: 0.18, bronze: '#b39a7c' },
  night: { a: '#141b2e', b: '#070a14', win: '#ffd9a0', wo: 0.55, bronze: '#2a2018' },
  dawn: { a: '#5b3d5c', b: '#1d1530', win: '#ffc070', wo: 0.45, bronze: '#6b4430' },
  cold: { a: '#132238', b: '#060b16', win: '#9fd4ff', wo: 0.5, bronze: '#18222e' },
};

/** Stylised Moscow-City cluster (Федерация, Меркурий, Эволюция, ОКО…). Local origin = bottom-left. */
export function CityTowers({ x, base, s = 1, mode, id }: { x: number; base: number; s?: number; mode: CityMode; id: string }) {
  const c = CITY[mode];
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`}>
      <defs>
        <Grad id={`${id}g`} stops={[[0, c.a], [1, c.b]]} />
        <pattern id={`${id}w`} width="24" height="30" patternUnits="userSpaceOnUse">
          {[0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => <rect key={`${i}${j}`} x={i * 8 + 1} y={j * 10 + 2} width="5" height="6" fill={c.win} opacity={((i * 7 + j * 5) % 9) / 9} />))}
        </pattern>
      </defs>
      {TOWERS.map((d, i) => <path key={i} d={d} fill={i === 4 ? c.bronze : `url(#${id}g)`} />)}
      <g opacity={c.wo}>{TOWERS.map((d, i) => <path key={i} d={d} fill={`url(#${id}w)`} />)}</g>
      <path d="M239-522V-585" stroke={c.a} strokeWidth={2} />
      {mode === 'day' && <path d="M20-270V0M110-320V0M170-350V0M226-470V0M250-500V0M370-400V0M492-390V0" stroke="#fff" strokeOpacity={0.22} strokeWidth={5} />}
      {(mode === 'night' || mode === 'cold') &&
        TOPS.map(([tx, ty], i) => <circle key={i} cx={tx} cy={ty} r={4} fill="#ff3b3b" className="cs-blink" style={{ animationDelay: `${i * 0.6}s` }} />)}
    </g>
  );
}
