import { memo, useMemo, type ReactNode } from 'react';
import { useGame } from '../../game/store';
import { useSettings } from '../../game/settings';
import { minuteOfDay } from '../../game/util';
import { CityLayer, genCity, rng } from './skyline';

export interface WallInfo {
  id: string;
  name: string;
  group: 'both' | 'win' | 'mac';
}

/** Every wallpaper works on both shells; groups are just "collections" in the picker. */
export const WALLPAPERS: WallInfo[] = [
  { id: 'dynamic', name: 'Город: день и ночь', group: 'both' },
  { id: 'bloom', name: 'Цветение', group: 'win' },
  { id: 'ribbon', name: 'Лента', group: 'win' },
  { id: 'aurora', name: 'Северное сияние', group: 'win' },
  { id: 'candles', name: 'Свечи', group: 'win' },
  { id: 'neon', name: 'Неон', group: 'win' },
  { id: 'hills', name: 'Холмы', group: 'mac' },
  { id: 'wave', name: 'Волна', group: 'mac' },
  { id: 'coast', name: 'Побережье', group: 'mac' },
  { id: 'dusk', name: 'Сумерки', group: 'mac' },
  { id: 'dunes', name: 'Дюны', group: 'mac' },
];

const f = (n: number) => Math.round(n * 10) / 10;
const VB = '0 0 1600 1000';

/** The PC desktop background (setting `pcWallpaper`). */
export function DesktopWallpaper() {
  const id = useSettings((s) => s.pcWallpaper);
  const slot = useGame((s) => Math.floor(minuteOfDay(s.now) / 10));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  return <WallpaperView id={id} hour={slot / 6} moscow={moscow} className="pointer-events-none absolute inset-0" />;
}

export const WallpaperView = memo(function WallpaperView({ id, hour = 21, moscow = false, label = true, className }: { id: string; hour?: number; moscow?: boolean; label?: boolean; className?: string }) {
  const known = WALLPAPERS.some((w) => w.id === id) ? id : 'dynamic';
  return <div className={className ?? 'absolute inset-0'}>{known === 'dynamic' ? <Dynamic hour={hour} moscow={moscow} label={label} /> : <Static id={known} />}</div>;
});

// ───────── dynamic city wallpaper ─────────

const SKY: [number, string, string, string][] = [
  [0, '#04060D', '#0A1124', '#161E3C'],
  [4.8, '#04060D', '#0A1124', '#161E3C'],
  [6, '#151E40', '#4C3F79', '#E0895A'],
  [7.4, '#2A62A8', '#6F9FD0', '#F2C9A0'],
  [9, '#2C6CB2', '#68A5DB', '#C0E1F5'],
  [16.5, '#2C6CB2', '#68A5DB', '#C0E1F5'],
  [18.3, '#26316C', '#A3507A', '#F59E5B'],
  [19.6, '#111836', '#352A5C', '#7A4467'],
  [21, '#05070F', '#0C1328', '#1A2244'],
  [24, '#04060D', '#0A1124', '#161E3C'],
];
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
const skyAt = (h: number) => {
  const i = Math.max(0, SKY.findIndex(([k]) => k > h) - 1);
  const [k0, ...a] = SKY[i];
  const [k1, ...b] = SKY[i + 1] ?? SKY[i];
  const t = k1 === k0 ? 0 : (h - k0) / (k1 - k0);
  return a.map((c, j) => mix(c, b[j], t));
};
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const daylight = (h: number) => (h < 8 ? smooth((h - 5) / 3) : h < 17 ? 1 : smooth(1 - (h - 17) / 3));
const litAt = (h: number) => {
  const v = h < 1 ? 0.42 - h * 0.12 : h < 5 ? 0.3 - (h - 1) * 0.055 : h < 8 ? 0.12 : h < 16.5 ? 0.02 : h < 18 ? 0.02 + (h - 16.5) * 0.12 : h < 21 ? 0.2 + (h - 18) * 0.11 : 0.53 - (h - 21) * 0.037;
  return Math.round(v * 50) / 50;
};

const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 110 }, () => ({ x: f(r() * 1600), y: f(r() * 560), s: f(0.6 + r() * 1.5), o: 0.35 + r() * 0.65 }));
})();

function Dynamic({ hour, moscow, label }: { hour: number; moscow: boolean; label: boolean }) {
  const far = useMemo(() => genCity(moscow ? 23 : 11, moscow ? 'moscow' : 'novo', 0), [moscow]);
  const near = useMemo(() => genCity(moscow ? 31 : 17, moscow ? 'moscow' : 'novo', 1), [moscow]);
  const h = ((hour % 24) + 24) % 24;
  const [top, mid, hor] = skyAt(h);
  const dl = daylight(h);
  const lit = litAt(h);
  const sunP = (h - 5.8) / 13.6;
  const moonP = (((h - 19 + 24) % 24) / 11.5);
  const sun = sunP > 0 && sunP < 1 ? { x: 150 + sunP * 1300, y: 780 - Math.sin(sunP * Math.PI) * 580 } : null;
  const moon = moonP > 0 && moonP < 1 ? { x: 220 + moonP * 1160, y: 720 - Math.sin(moonP * Math.PI) * 500 } : null;
  const night = 1 - dl;
  return (
    <>
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="dyn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset=".55" stopColor={mid} />
            <stop offset="1" stopColor={hor} />
          </linearGradient>
          <radialGradient id="dyn-sun">
            <stop offset="0" stopColor="#FFF6D6" />
            <stop offset=".18" stopColor="#FFE29A" stopOpacity=".95" />
            <stop offset=".45" stopColor="#FFB45E" stopOpacity=".28" />
            <stop offset="1" stopColor="#FFB45E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dyn-halo">
            <stop offset="0" stopColor="#DCE4FF" stopOpacity=".3" />
            <stop offset="1" stopColor="#DCE4FF" stopOpacity="0" />
          </radialGradient>
          <mask id="dyn-moon">
            <rect width="1600" height="1000" fill="#fff" />
            {moon && <circle cx={moon.x + 11} cy={moon.y - 7} r="22" fill="#000" />}
          </mask>
          <filter id="dyn-blur">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <rect width="1600" height="1000" fill="url(#dyn-sky)" />
        {night > 0.05 && (
          <g opacity={night}>
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} className={i % 7 === 0 ? 'twinkle' : undefined} style={i % 7 === 0 ? { animationDelay: `${(i % 9) * 0.4}s` } : undefined} />
            ))}
          </g>
        )}
        {sun && <circle cx={f(sun.x)} cy={f(sun.y)} r="230" fill="url(#dyn-sun)" opacity={0.6 + 0.4 * dl} />}
        {moon && (
          <>
            <circle cx={f(moon.x)} cy={f(moon.y)} r="110" fill="url(#dyn-halo)" opacity={night} />
            <g mask="url(#dyn-moon)" opacity={0.95 * night}>
              <circle cx={f(moon.x)} cy={f(moon.y)} r="24" fill="#EEF2FF" />
            </g>
          </>
        )}
        <g filter="url(#dyn-blur)" opacity={0.35 + 0.25 * dl}>
          <ellipse cx="300" cy="300" rx="330" ry="48" fill={mix('#1B2340', '#FFFFFF', dl)} />
          <ellipse cx="1120" cy="210" rx="420" ry="56" fill={mix('#1B2340', '#F8FAFF', dl)} />
          <ellipse cx="820" cy="420" rx="260" ry="34" fill={mix('#232B4A', '#FFFFFF', dl)} />
        </g>
        <rect y="600" width="1600" height="400" fill={hor} opacity=".55" filter="url(#dyn-blur)" />
      </svg>
      <CityLayer city={far} fill={mix(mix('#0D1322', hor, 0.35), '#7D8CA8', dl * 0.75)} lit={lit * 0.8} glass={dl * 0.08} className="absolute inset-x-0 bottom-0 h-[46%] w-full" />
      <CityLayer
        city={near}
        fill={mix('#070A12', '#334059', dl * 0.85)}
        lit={lit}
        glass={dl * 0.14}
        stripe={0.25 + dl * 0.6}
        glow={night > 0.5}
        className="absolute inset-x-0 bottom-0 h-[33%] w-full"
      />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/45 to-transparent" />
      {label && <div className="absolute right-6 bottom-5 text-right text-[10px] font-semibold tracking-[0.45em] text-white/25">{moscow ? 'МОСКВА' : 'НОВОЗАРОВСК'}</div>}
    </>
  );
}

// ───────── static procedural wallpapers ─────────

function wave(base: number, amp: number, freq: number, phase: number, H = 1000) {
  const pts: [number, number][] = [];
  for (let x = -80; x <= 1680; x += 80) pts.push([x, base + amp * Math.sin((x / 1600) * Math.PI * 2 * freq + phase) + amp * 0.3 * Math.sin((x / 1600) * Math.PI * 5.3 * freq + phase * 1.7)]);
  let d = `M${pts[0][0]} ${H}L${pts[0][0]} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) d += `Q${pts[i][0]} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
  const l = pts[pts.length - 1];
  return `${d}L${l[0]} ${f(l[1])}L${l[0]} ${H}Z`;
}

type Layer = [base: number, amp: number, freq: number, phase: number, c1: string, c2: string];
function Waves({ k, bg, layers, stars = 0, glow, blur = 0 }: { k: string; bg: [string, string]; layers: Layer[]; stars?: number; glow?: [number, number, number, string]; blur?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${k}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
        {layers.map((l, i) => (
          <linearGradient key={i} id={`${k}-${i}`} x1="0" y1="0" x2=".3" y2="1">
            <stop offset="0" stopColor={l[4]} />
            <stop offset="1" stopColor={l[5]} />
          </linearGradient>
        ))}
        <filter id={`${k}-b`}>
          <feGaussianBlur stdDeviation={blur || 0.01} />
        </filter>
        {glow && (
          <radialGradient id={`${k}-g`}>
            <stop offset="0" stopColor={glow[3]} stopOpacity=".75" />
            <stop offset="1" stopColor={glow[3]} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect width="1600" height="1000" fill={`url(#${k}-bg)`} />
      {stars > 0 && STARS.slice(0, stars).map((s, i) => <circle key={i} cx={s.x} cy={s.y * 0.9} r={s.s * 0.8} fill="#fff" opacity={s.o * 0.7} />)}
      {glow && <circle cx={glow[0]} cy={glow[1]} r={glow[2]} fill={`url(#${k}-g)`} />}
      <g filter={blur ? `url(#${k}-b)` : undefined}>
        {layers.map((l, i) => (
          <path key={i} d={wave(l[0], l[1], l[2], l[3])} fill={`url(#${k}-${i})`} style={{ filter: 'drop-shadow(0 -6px 18px rgba(0,0,0,.25))' }} />
        ))}
      </g>
    </>
  );
}

const Static = memo(function Static({ id }: { id: string }) {
  let art: ReactNode = null;
  switch (id) {
    case 'bloom':
      art = (
        <>
          <defs>
            <radialGradient id="bl-bg" cx=".62" cy=".56" r=".85">
              <stop offset="0" stopColor="#1E4FD8" />
              <stop offset=".45" stopColor="#0B1D4A" />
              <stop offset="1" stopColor="#030712" />
            </radialGradient>
            <linearGradient id="bl-p" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E0F2FE" />
              <stop offset=".35" stopColor="#60A5FA" />
              <stop offset=".75" stopColor="#1D4ED8" />
              <stop offset="1" stopColor="#1E1B4B" />
            </linearGradient>
          </defs>
          <rect width="1600" height="1000" fill="url(#bl-bg)" />
          <g transform="translate(960 560)" style={{ mixBlendMode: 'screen' }}>
            {[-100, -72, -44, -16, 12, 40, 68].map((a, i) => (
              <ellipse key={a} cx="260" cy="0" rx="340" ry={110 + (i % 3) * 14} fill="url(#bl-p)" opacity={0.5} transform={`rotate(${a})`} />
            ))}
            <circle r="90" fill="#BFDBFE" opacity=".35" />
          </g>
        </>
      );
      break;
    case 'ribbon':
      art = (
        <>
          <defs>
            <linearGradient id="rb-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#14062A" />
              <stop offset="1" stopColor="#04060F" />
            </linearGradient>
            <linearGradient id="rb-s" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F472B6" />
              <stop offset=".5" stopColor="#A855F7" />
              <stop offset="1" stopColor="#38BDF8" />
            </linearGradient>
            <filter id="rb-f">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <rect width="1600" height="1000" fill="url(#rb-bg)" />
          {[
            [190, 0.55, 'url(#rb-f)'],
            [110, 0.85, undefined],
            [6, 0.6, undefined],
          ].map(([w, o, fl], i) => (
            <path key={i} d="M-120 780C300 520 620 990 920 650S1400 280 1760 430" fill="none" stroke={i === 2 ? '#fff' : 'url(#rb-s)'} strokeWidth={w as number} strokeLinecap="round" opacity={o as number} filter={fl as string | undefined} transform={i === 2 ? 'translate(0 -40)' : undefined} />
          ))}
        </>
      );
      break;
    case 'aurora':
      art = (
        <>
          <defs>
            <linearGradient id="au-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#020617" />
              <stop offset=".7" stopColor="#0A1B2E" />
              <stop offset="1" stopColor="#0B2A2A" />
            </linearGradient>
            <linearGradient id="au-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34D399" stopOpacity="0" />
              <stop offset=".5" stopColor="#34D399" stopOpacity=".75" />
              <stop offset="1" stopColor="#34D399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="au-v" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#A78BFA" stopOpacity="0" />
              <stop offset=".5" stopColor="#A78BFA" stopOpacity=".55" />
              <stop offset="1" stopColor="#A78BFA" stopOpacity="0" />
            </linearGradient>
            <filter id="au-f">
              <feGaussianBlur stdDeviation="26" />
            </filter>
          </defs>
          <rect width="1600" height="1000" fill="url(#au-bg)" />
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.8} fill="#fff" opacity={s.o * 0.6} />
          ))}
          <g filter="url(#au-f)">
            <path d="M-50 380C260 230 520 470 860 300S1380 180 1680 330V520C1380 380 1160 520 860 480S300 420 -50 560Z" fill="url(#au-g)" />
            <path d="M-50 240C300 160 600 330 900 210S1400 120 1680 200V330C1400 260 1150 380 880 330S300 300 -50 380Z" fill="url(#au-v)" />
          </g>
          <path d="M0 1000V760L180 640 300 700 470 560 640 690 820 600 1000 720 1180 590 1360 680 1600 610V1000Z" fill="#0B1424" />
          <path d="M0 1000V840L240 760 420 820 640 740 900 830 1120 760 1380 830 1600 780V1000Z" fill="#050A14" />
        </>
      );
      break;
    case 'candles': {
      const r = rng(42);
      let p = 560;
      const c = Array.from({ length: 44 }, (_, i) => {
        const o = p;
        p = Math.max(220, Math.min(820, p + (r() - 0.56) * 70));
        return { x: 40 + i * 36, o, c: p, hi: Math.min(o, p) - r() * 30, lo: Math.max(o, p) + r() * 30 };
      });
      const line = c.map((k, i) => `${i ? 'L' : 'M'}${k.x} ${f((k.o + k.c) / 2)}`).join('');
      art = (
        <>
          <defs>
            <radialGradient id="cd-bg" cx=".7" cy=".3" r="1">
              <stop offset="0" stopColor="#0B2B2B" />
              <stop offset="1" stopColor="#050B14" />
            </radialGradient>
            <linearGradient id="cd-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0ECB81" stopOpacity=".25" />
              <stop offset="1" stopColor="#0ECB81" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1600" height="1000" fill="url(#cd-bg)" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${110 * i + 60}H1600`} stroke="#fff" strokeOpacity=".04" />
          ))}
          <path d={`${line}L${c[c.length - 1].x} 1000L${c[0].x} 1000Z`} fill="url(#cd-a)" />
          {c.map((k, i) => (
            <g key={i} opacity=".55" fill={k.c < k.o ? '#0ECB81' : '#F6465D'} stroke={k.c < k.o ? '#0ECB81' : '#F6465D'}>
              <path d={`M${k.x} ${f(k.hi)}V${f(k.lo)}`} strokeWidth="2" />
              <rect x={k.x - 8} y={f(Math.min(k.o, k.c))} width="16" height={f(Math.max(4, Math.abs(k.o - k.c)))} rx="2" stroke="none" />
            </g>
          ))}
          <path d={line} fill="none" stroke="#38BDF8" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 8px #38BDF8)' }} />
        </>
      );
      break;
    }
    case 'neon':
      art = (
        <>
          <defs>
            <linearGradient id="ne-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B0221" />
              <stop offset=".62" stopColor="#3B0B5E" />
              <stop offset=".64" stopColor="#12022A" />
              <stop offset="1" stopColor="#05010F" />
            </linearGradient>
            <linearGradient id="ne-sun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FDE047" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
            <mask id="ne-m">
              <rect width="1600" height="1000" fill="#fff" />
              {Array.from({ length: 7 }, (_, i) => (
                <rect key={i} y={500 + i * 22} width="1600" height={3 + i * 2} fill="#000" />
              ))}
            </mask>
          </defs>
          <rect width="1600" height="1000" fill="url(#ne-bg)" />
          <circle cx="800" cy="520" r="210" fill="url(#ne-sun)" mask="url(#ne-m)" style={{ filter: 'drop-shadow(0 0 40px #EC4899)' }} />
          <path d="M0 640L210 520 330 580 470 470 600 560 700 520 800 600 930 500 1080 570 1220 470 1380 560 1600 500V640Z" fill="#1A0533" />
          <g stroke="#E879F9" strokeOpacity=".55" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px #E879F9)' }}>
            {Array.from({ length: 25 }, (_, i) => (
              <path key={i} d={`M${800 + (i - 12) * 18} 640L${800 + (i - 12) * 230} 1000`} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <path key={`h${i}`} d={`M0 ${f(640 + Math.pow(i + 1, 2) * 4.4)}H1600`} />
            ))}
          </g>
        </>
      );
      break;
    case 'hills':
      art = <Waves k="hl" bg={['#9CC4E4', '#F4DEC3']} glow={[1150, 380, 300, '#FFF4D6']} layers={[[540, 50, 0.9, 0.6, '#8DB89B', '#5E9474'], [630, 60, 0.7, 2.1, '#4C8A68', '#30694E'], [730, 48, 1.1, 4, '#2F6450', '#1E4637'], [840, 40, 0.8, 1.2, '#1B3D2E', '#10261D']]} />;
      break;
    case 'wave':
      art = <Waves k="wv" bg={['#0B1640', '#050A24']} blur={2} layers={[[380, 120, 0.55, 0.4, '#FF9A3C', '#FF3D7F'], [520, 130, 0.5, 2.2, '#FF3D7F', '#7B2FF7'], [660, 110, 0.6, 4.1, '#7B2FF7', '#2340FF'], [800, 80, 0.7, 1, '#1C2FD8', '#0A1460']]} />;
      break;
    case 'coast':
      art = <Waves k="cs" bg={['#152463', '#E58FB5']} layers={[[420, 90, 0.6, 3.4, '#FFB070', '#E8613A'], [540, 100, 0.55, 1.4, '#E8508A', '#A3236B'], [660, 90, 0.65, 5, '#7A3CF0', '#3B1FA0'], [790, 70, 0.6, 2.6, '#2F4FD6', '#162A86']]} />;
      break;
    case 'dusk':
      art = <Waves k="dk" bg={['#3B0D6B', '#120428']} blur={1} layers={[[430, 100, 0.5, 0.9, '#F0ABFC', '#C026D3'], [560, 110, 0.6, 3.3, '#C026D3', '#7E22CE'], [690, 90, 0.55, 5.4, '#7E22CE', '#4C1D95'], [820, 70, 0.7, 2.2, '#3B0F70', '#1E0840']]} />;
      break;
    case 'dunes':
      art = <Waves k="du" bg={['#070B1F', '#26306A']} stars={80} glow={[420, 260, 180, '#C7D2FE']} layers={[[640, 70, 0.6, 1.2, '#3A4682', '#1C2350'], [740, 60, 0.75, 3.6, '#2A3570', '#141A3E'], [850, 50, 0.9, 0.3, '#1B2352', '#0B0F28']]} />;
      break;
  }
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      {art}
    </svg>
  );
});
