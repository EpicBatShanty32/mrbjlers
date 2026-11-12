import { memo, useId, type ReactNode } from 'react';
import type { PhoneAppId } from '../../../game/types';
import { APP_OF } from './state';

export const APP_NAMES: Record<PhoneAppId, string> = {
  sber: 'СберБанк', tbank: 'Т-Банк', alfa: 'Альфа', telegram: 'Telegram', avito: 'Барахолка',
  wallet: 'Tonkeeper', auth: 'SMS · 2FA', settings: 'Настройки', music: 'Музыка',
};

// Telegram paper plane (simple-icons geometry, 24-unit space).
const PLANE =
  'M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';

const GEAR = (() => {
  const n = 14, w = (Math.PI * 2) / n;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * w;
    for (const [da, r] of [[-0.5, 31], [-0.2, 38], [0.2, 38], [0.5, 31]] as const)
      pts.push(`${(50 + r * Math.cos(a + da * w)).toFixed(2)} ${(50 + r * Math.sin(a + da * w)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

const grad = (u: string, a: string, b: string, diag = false) => (
  <defs>
    <linearGradient id={u} x1="0" y1="0" x2={diag ? 1 : 0} y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  </defs>
);
const bg = (u: string) => <rect width="100" height="100" fill={`url(#${u})`} />;
const letter = (u: string, a: string, b: string, text: string, size = 46, color = '#fff') => (
  <>
    {grad(u, a, b, true)}
    {bg(u)}
    <text x="50" y="50" dy=".36em" textAnchor="middle" fontSize={size} fontWeight="800" fill={color} fontFamily="-apple-system, system-ui, Arial, sans-serif">{text}</text>
  </>
);

const ART: Record<string, (u: string) => ReactNode> = {
  sber: (u) => (
    <>
      {grad(u, '#2FD872', '#06873A', true)}
      {bg(u)}
      <circle cx="50" cy="50" r="25" fill="none" stroke="#fff" strokeWidth="7.5" strokeDasharray="128 29" strokeLinecap="round" transform="rotate(-38 50 50)" />
      <path d="M36.5 49.5 47.5 60.5 75 31.5" fill="none" stroke="#fff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  tbank: (u) => (
    <>
      {grad(u, '#FFE658', '#FFD21C')}
      {bg(u)}
      <path d="M25 22h50v29c0 15-11 24-25 30-14-6-25-15-25-30Z" fill="#1E1E1E" />
      <path d="M37 35h26v8h-9v25h-8V43h-9Z" fill="#FFDD2D" />
    </>
  ),
  alfa: (u) => (
    <>
      {grad(u, '#F6493B', '#D3170D', true)}
      {bg(u)}
      <path fillRule="evenodd" fill="#fff" d="M50 18c-5 0-7.2 3.2-8.6 7.4L29 63h10.4l2.8-8.6h15.6l2.8 8.6H71L58.6 25.4C57.2 21.2 55 18 50 18Zm-5 29 5-15.6L55 47Z" />
      <rect x="29" y="70" width="42" height="8" rx="1" fill="#fff" />
    </>
  ),
  telegram: (u) => (
    <>
      {grad(u, '#40C4FF', '#168AD3')}
      {bg(u)}
      <path d={PLANE} fill="#fff" transform="translate(47 51) scale(4.3) translate(-11.6 -12.2)" />
    </>
  ),
  avito: () => (
    <>
      <rect width="100" height="100" fill="#fff" />
      <circle cx="36" cy="36" r="12.5" fill="#00AAFF" />
      <circle cx="65" cy="35" r="9" fill="#FF6163" />
      <circle cx="35" cy="65.5" r="8" fill="#A169F7" />
      <circle cx="62" cy="62" r="17" fill="#97CF26" />
    </>
  ),
  wallet: (u) => (
    <>
      {grad(u, '#5CC6FF', '#1670D4', true)}
      {bg(u)}
      <path d="M24 30h52L50 77Z" fill="#fff" />
      <path d="M50 31v44" stroke="#2A8BE6" strokeWidth="4.5" />
      <path d="M24 30h52" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  auth: (u) => (
    <>
      {grad(u, '#6CF383', '#0BBA2B')}
      {bg(u)}
      <path fill="#fff" d="M50 23c19 0 32 11.5 32 26S69 75 50 75c-4 0-8-.5-11.5-1.6C34 77 28 79 21 79c4-4 6.2-8 6.6-12.3C21.6 62 18 55.8 18 49c0-14.5 13-26 32-26Z" />
      <circle cx="37" cy="49" r="4.6" fill="#12BF33" />
      <circle cx="50" cy="49" r="4.6" fill="#12BF33" />
      <circle cx="63" cy="49" r="4.6" fill="#12BF33" />
    </>
  ),
  settings: (u) => (
    <>
      {grad(u, '#B5B5BA', '#6B6B70')}
      {bg(u)}
      <path d={GEAR} fill="#3A3A3D" />
      <circle cx="50" cy="50" r="24" fill="#9C9CA1" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#4A4A4E" strokeWidth="2.5" strokeDasharray="4 3.2" />
      <circle cx="50" cy="50" r="11" fill="#3A3A3D" />
      <circle cx="50" cy="50" r="5.5" fill="#B9B9BE" />
    </>
  ),
  music: (u) => (
    <>
      {grad(u, '#FF6E8A', '#F2203B', true)}
      {bg(u)}
      <path d="M41 30.5 71 24v9.5l-30 6.5Z" fill="#fff" />
      <rect x="41" y="30.5" width="5" height="38" fill="#fff" />
      <rect x="66" y="24" width="5" height="38" fill="#fff" />
      <ellipse cx="38" cy="68.5" rx="8.6" ry="7" transform="rotate(-18 38 68.5)" fill="#fff" />
      <ellipse cx="63" cy="62" rx="8.6" ry="7" transform="rotate(-18 63 62)" fill="#fff" />
    </>
  ),
  bybit: () => (
    <>
      <rect width="100" height="100" fill="#15161B" />
      <text x="50" y="50" dy=".35em" textAnchor="middle" fontSize="21" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        BYB<tspan fill="#F7A600">I</tspan>T
      </text>
    </>
  ),
  rapira: (u) => letter(u, '#8C6BFF', '#4A2BD0', 'R'),
  gov: (u) => letter(u, '#3D7BFF', '#0D47C9', 'Г', 44),
  tax: (u) => letter(u, '#2E5BBA', '#183A80', 'ФНС', 25),
  system: (u) => (
    <>
      {grad(u, '#9A9AA0', '#5E5E63')}
      {bg(u)}
      <path fill="#fff" d="M50 22c-11 0-19 8.5-19 19.5V55l-6 8v3h50v-3l-6-8V41.5C69 30.5 61 22 50 22Zm-7 48a7 7 0 0 0 14 0Z" />
    </>
  ),
};

/** Square icon artwork (fills its box; slices when not square). */
export const IconArt = memo(function IconArt({ id }: { id: string }) {
  const u = 'ic' + useId().replace(/[^\w-]/g, '');
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" className="block">
      {(ART[id] ?? ART.system)(u)}
    </svg>
  );
});

/** Icon for a notification source: the app itself, or exchange/government sender for system ones. */
export function notifIconId(app: string, title: string): string {
  const a = APP_OF[app];
  if (a) return a;
  if (/^bybit/i.test(title)) return 'bybit';
  if (/^rapira/i.test(title)) return 'rapira';
  if (/ФНС|налог/i.test(title)) return 'tax';
  if (/Госуслуг/i.test(title)) return 'gov';
  return 'system';
}

export function notifAppName(app: string, title: string): string {
  const a = APP_OF[app];
  if (app === 'sms') return 'Сообщения';
  if (a) return APP_NAMES[a];
  return title.split(/[\s·:]/)[0] || 'Система';
}

/** iOS app icon: squircle, Liquid Glass rim, optional badge. `launch` marks it as the zoom origin for app opening. */
export function AppIcon({ id, size, badge = 0, launch = false, radius = '23%' }: { id: string; size: number | string; badge?: number; launch?: boolean; radius?: string }) {
  return (
    <div data-icon={launch ? id : undefined} className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="relative h-full w-full overflow-hidden shadow-[0_3px_10px_-3px_rgba(0,0,0,.45)]" style={{ borderRadius: radius }}>
        <IconArt id={id} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            background: 'linear-gradient(155deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,0) 36%, rgba(255,255,255,0) 72%, rgba(255,255,255,.1) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,.55), inset 0 -1px 1px rgba(0,0,0,.14), inset 0 0 0 .5px rgba(255,255,255,.28)',
          }}
        />
      </div>
      {badge > 0 && (
        <span className="absolute -top-[10%] -right-[12%] flex h-[40%] min-w-[40%] items-center justify-center rounded-full bg-[#FF3B30] px-[10%] text-[max(10px,3.2cqw)] leading-none font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,.35)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  );
}
