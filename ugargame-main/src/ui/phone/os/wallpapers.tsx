import { memo, useId, type CSSProperties, type ReactNode } from 'react';

/** Procedural wallpapers (CSS gradients + SVG in a 390×844 space, cover-scaled). No image assets. */
export const WALLPAPERS: { id: string; name: string }[] = [
  { id: 'aurora', name: 'Северное сияние' },
  { id: 'liquid', name: 'Liquid Glass' },
  { id: 'novozarovsk_rain', name: 'Новозаровск, дождь' },
  { id: 'night_city', name: 'Ночной город' },
  { id: 'dunes', name: 'Дюны' },
  { id: 'ocean', name: 'Океан' },
  { id: 'sunset', name: 'Закат' },
  { id: 'graphite', name: 'Графит' },
  { id: 'cosmic', name: 'Космос' },
];

const VW = 390, VH = 844;
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stars = (seed: number, n: number, maxY: number) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * VW, y: r() * maxY, r: 0.3 + r() * 1.1, o: 0.25 + r() * 0.75 }));
};
const S_AURORA = stars(3, 70, 560), S_CITY = stars(5, 45, 430), S_COSMIC = stars(9, 150, VH);

const CITY = (() => {
  const r = rng(21);
  const back: number[][] = [], front: number[][] = [], wins: number[][] = [];
  for (let x = -10; x < VW; ) {
    const w = 22 + r() * 34, h = 240 + r() * 250;
    back.push([x, VH - h, w, h]);
    x += w + 2;
  }
  for (let x = -6; x < VW; ) {
    const w = 28 + r() * 40, h = 130 + r() * 220;
    front.push([x, VH - h, w, h]);
    for (let wy = VH - h + 12; wy < VH - 10; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 8) if (r() < 0.2) wins.push([wx, wy, r() < 0.2 ? 1 : 0]);
    x += w + 3;
  }
  return { back, front, wins };
})();

const wave = (y0: number, amp: number, len: number, ph: number) => {
  let d = `M0 ${VH} L0 ${y0}`;
  for (let x = 0; x <= VW; x += 10) d += ` L${x} ${(y0 + Math.sin((x / len) * 6.283 + ph) * amp + Math.sin(x / (len * 0.37) + ph * 2) * amp * 0.25).toFixed(1)}`;
  return `${d} L${VW} ${VH} Z`;
};
const ridge = (seed: number, y0: number, rough: number, step: number) => {
  const r = rng(seed);
  let d = `M0 ${VH} L0 ${y0}`;
  for (let x = 0; x <= VW + step; x += step) d += ` L${x} ${(y0 - r() * rough - Math.sin(x / 70 + seed) * rough * 0.5).toFixed(1)}`;
  return `${d} L${VW} ${VH} Z`;
};

const RAIN = (() => {
  const r = rng(13);
  const cols = ['#ffb347', '#ff6b5a', '#ffd38a', '#5fd3c6', '#f6f1d1', '#ff9f43'];
  return {
    bokeh: Array.from({ length: 26 }, () => ({ x: r() * 100, y: 42 + r() * 56, s: 4 + r() * 13, c: cols[Math.floor(r() * cols.length)], o: 0.2 + r() * 0.5 })),
    drops: Array.from({ length: 48 }, () => ({ x: r() * VW, y: r() * VH, rx: 1.3 + r() * 3.2, ry: 1.8 + r() * 4.4 })),
    streaks: Array.from({ length: 16 }, () => ({ x: r() * 100, d: 0.55 + r() * 0.8, del: -r() * 2, o: 0.12 + r() * 0.28 })),
  };
})();

const full: CSSProperties = { position: 'absolute', inset: 0 };
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
    {children}
  </svg>
);
const Stars = ({ list }: { list: typeof S_AURORA }) => (
  <g fill="#fff">
    {list.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
    ))}
  </g>
);
const lin = (id: string, stops: [number, string, number?][], x2 = 0, y2 = 1) => (
  <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
    {stops.map(([o, c, a], i) => (
      <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
    ))}
  </linearGradient>
);

const WP: Record<string, (u: string) => ReactNode> = {
  aurora: (u) => (
    <>
      <div style={{ ...full, background: 'radial-gradient(90% 45% at 20% 22%, rgba(45,212,191,.45), transparent 62%), radial-gradient(80% 45% at 85% 30%, rgba(168,85,247,.42), transparent 62%), radial-gradient(120% 55% at 50% 108%, rgba(16,185,129,.3), transparent 62%), linear-gradient(180deg,#030612 0%,#0a1230 55%,#06101d 100%)' }} />
      <Svg>
        <defs>
          {lin(u + 'a', [[0, '#5eead4', 0], [0.45, '#34d399', 0.75], [1, '#a78bfa', 0]])}
          {lin(u + 'b', [[0, '#c084fc', 0], [0.5, '#818cf8', 0.6], [1, '#22d3ee', 0]])}
          <filter id={u + 'f'} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
        <Stars list={S_AURORA} />
        <g filter={`url(#${u}f)`}>
          <path d="M-30 300C60 200 130 290 200 210S340 140 430 210L430 360C330 300 260 380 190 330S50 380-30 440Z" fill={`url(#${u}a)`} />
          <path d="M-30 430C80 360 160 440 250 360S380 330 430 360L430 470C330 430 280 500 200 470S70 520-30 560Z" fill={`url(#${u}b)`} />
        </g>
        <path d="M0 844V700C80 670 160 690 230 660S350 640 390 650V844Z" fill="#02040a" opacity=".85" />
      </Svg>
    </>
  ),
  liquid: (u) => (
    <>
      <div style={{ ...full, background: 'linear-gradient(165deg,#021444 0%,#0a3cb0 36%,#2f86ff 60%,#8fd0ff 76%,#0a2668 100%)' }} />
      <Svg>
        <defs>
          {lin(u + 'a', [[0, '#ffffff', 0.5], [1, '#1d4ed8', 0]])}
          <radialGradient id={u + 'r'} cx=".5" cy=".5" r=".5">
            <stop offset=".6" stopColor="#fff" stopOpacity="0" />
            <stop offset=".93" stopColor="#dbeafe" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff" stopOpacity=".7" />
          </radialGradient>
          {lin(u + 'b', [[0, '#a5b4fc', 0.75], [1, '#312e81', 0]], 1, 1)}
        </defs>
        <path d="M-40 520C80 380 210 650 440 420V900H-40Z" fill={`url(#${u}a)`} />
        <path d="M-40 640C120 520 260 760 440 600V900H-40Z" fill={`url(#${u}b)`} opacity=".8" />
        <circle cx="300" cy="230" r="150" fill={`url(#${u}r)`} />
        <circle cx="80" cy="640" r="125" fill={`url(#${u}r)`} />
        <path d="M190 100a150 150 0 0 1 240 60" stroke="#fff" strokeOpacity=".55" strokeWidth="2" fill="none" />
      </Svg>
    </>
  ),
  dunes: (u) => (
    <>
      <div style={{ ...full, background: 'linear-gradient(180deg,#2a1748 0%,#8c3c6e 34%,#ec8c62 58%,#f7c48d 70%,#f7c48d 100%)' }} />
      <Svg>
        <defs>
          <radialGradient id={u + 's'}>
            <stop offset="0" stopColor="#fff3d6" />
            <stop offset=".35" stopColor="#ffd9a0" stopOpacity=".9" />
            <stop offset="1" stopColor="#ffb070" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="272" cy="372" r="120" fill={`url(#${u}s)`} />
        <circle cx="272" cy="372" r="34" fill="#fff1d2" />
        <path d="M0 520C90 470 180 500 260 468S360 440 390 455V844H0Z" fill="#c76a4c" />
        <path d="M0 592C80 540 160 602 250 560S350 520 390 540V844H0Z" fill="#a04e3d" />
        <path d="M120 580C180 560 220 575 250 560" stroke="#f3a27a" strokeOpacity=".55" strokeWidth="2" fill="none" />
        <path d="M0 682C110 612 190 692 290 642S370 630 390 640V844H0Z" fill="#76332f" />
        <path d="M0 762C90 722 210 782 300 742S380 736 390 740V844H0Z" fill="#451c24" />
      </Svg>
    </>
  ),
  night_city: (u) => (
    <>
      <div style={{ ...full, background: 'radial-gradient(90% 30% at 50% 100%, rgba(255,120,80,.35), transparent 70%), linear-gradient(180deg,#04050d 0%,#121838 45%,#3a1c4b 76%,#5d2546 100%)' }} />
      <Svg>
        <defs>
          <radialGradient id={u + 'm'}>
            <stop offset=".3" stopColor="#fff8e7" stopOpacity=".5" />
            <stop offset="1" stopColor="#fff8e7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <Stars list={S_CITY} />
        <circle cx="300" cy="150" r="70" fill={`url(#${u}m)`} />
        <circle cx="300" cy="150" r="24" fill="#f6f0dc" />
        <g fill="#161631">{CITY.back.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
        <g fill="#07070e">{CITY.front.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}</g>
        <g>
          {CITY.wins.map(([x, y, c], i) => (
            <rect key={i} x={x} y={y} width="3" height="4.5" fill={c ? '#9fd8ff' : '#ffcf73'} opacity=".85" />
          ))}
        </g>
      </Svg>
    </>
  ),
  ocean: (u) => (
    <>
      <div style={{ ...full, background: 'radial-gradient(70% 25% at 50% 0%, rgba(160,230,255,.45), transparent 70%), linear-gradient(180deg,#05324c 0%,#06597a 38%,#0a7da1 56%,#043650 100%)' }} />
      <Svg>
        <defs>{lin(u + 'w', [[0, '#7dd3fc', 0.35], [1, '#022c43', 0.9]])}</defs>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={wave(330 + i * 82, 12 + i * 4, 150 + i * 26, i * 1.7)} fill={`url(#${u}w)`} stroke="#e0f7ff" strokeOpacity={0.35 - i * 0.045} strokeWidth="1.3" />
        ))}
      </Svg>
    </>
  ),
  graphite: (u) => (
    <>
      <div style={{ ...full, background: 'radial-gradient(120% 70% at 25% 12%, #4b4e56 0%, #26282e 42%, #0e0f12 100%)' }} />
      <Svg>
        <defs>
          {lin(u + 'a', [[0, '#c7ccd6', 0.55], [1, '#2a2d33', 0]], 1, 1)}
          {lin(u + 'b', [[0, '#8b919c', 0.35], [1, '#16181c', 0]], 1, 0)}
        </defs>
        <path d="M-50 600C100 420 260 760 450 520V650C270 860 110 540-50 730Z" fill={`url(#${u}a)`} />
        <path d="M-50 330C130 230 240 420 450 270V340C250 500 120 300-50 420Z" fill={`url(#${u}b)`} />
      </Svg>
    </>
  ),
  sunset: (u) => (
    <>
      <div style={{ ...full, background: 'linear-gradient(180deg,#1b1846 0%,#6d35d6 22%,#d6337a 44%,#f7782c 60%,#fbbf3c 70%,#fbbf3c 100%)' }} />
      <Svg>
        <defs>
          <radialGradient id={u + 's'}>
            <stop offset=".25" stopColor="#fff2b8" />
            <stop offset=".5" stopColor="#ffd36b" stopOpacity=".6" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="195" cy="545" r="160" fill={`url(#${u}s)`} />
        <path d={ridge(4, 560, 70, 34)} fill="#7a2d8f" opacity=".75" />
        <path d={ridge(8, 625, 60, 28)} fill="#4a1a6e" />
        <path d={ridge(15, 700, 50, 22)} fill="#220c38" />
      </Svg>
    </>
  ),
  novozarovsk_rain: () => (
    <>
      <div style={{ ...full, background: 'radial-gradient(100% 40% at 50% 85%, rgba(255,150,70,.22), transparent 70%), linear-gradient(180deg,#0a111d 0%,#111c2d 48%,#0b1018 100%)' }} />
      {RAIN.bokeh.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.s}%`, aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', opacity: b.o, background: `radial-gradient(circle, ${b.c} 0%, ${b.c}aa 40%, transparent 70%)` }} />
      ))}
      <Svg>
        {RAIN.drops.map((d, i) => (
          <g key={i}>
            <ellipse cx={d.x} cy={d.y} rx={d.rx} ry={d.ry} fill="#0a1422" fillOpacity=".35" stroke="#dbe8ff" strokeOpacity=".35" strokeWidth=".6" />
            <circle cx={d.x - d.rx * 0.35} cy={d.y - d.ry * 0.4} r={Math.max(0.4, d.rx * 0.28)} fill="#fff" opacity=".55" />
          </g>
        ))}
      </Svg>
      {RAIN.streaks.map((s, i) => (
        <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${s.x}%`, width: 1, background: `linear-gradient(180deg, transparent 0%, rgba(220,232,255,${s.o}) 6%, transparent 13%)`, animation: `os-rain ${s.d}s linear ${s.del}s infinite` }} />
      ))}
    </>
  ),
  cosmic: () => (
    <>
      <div style={{ ...full, background: 'radial-gradient(80% 45% at 72% 28%, rgba(255,122,48,.6), transparent 62%), radial-gradient(70% 40% at 18% 62%, rgba(255,70,10,.28), transparent 62%), radial-gradient(60% 35% at 50% 45%, rgba(120,40,160,.28), transparent 70%), #05030a' }} />
      <Svg>
        <Stars list={S_COSMIC} />
        <circle cx="195" cy="1150" r="420" fill="#0a0507" stroke="#ff8a3c" strokeWidth="2.5" strokeOpacity=".9" />
        <circle cx="195" cy="1150" r="428" fill="none" stroke="#ff8a3c" strokeWidth="14" strokeOpacity=".18" />
      </Svg>
    </>
  ),
};

export const Wallpaper = memo(function Wallpaper({ id, className }: { id: string; className?: string }) {
  const u = 'wp' + useId().replace(/[^\w-]/g, '');
  return <div className={'absolute inset-0 overflow-hidden ' + (className ?? '')}>{(WP[id] ?? WP.aurora)(u)}</div>;
});
