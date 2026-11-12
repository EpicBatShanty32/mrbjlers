import { useId, type ReactNode } from 'react';
import { Settings, ShoppingBag } from 'lucide-react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import type { Skin } from './shared';

export const APP_IDS: PcAppId[] = ['browser', 'files', 'calc', 'notes'];

export interface AppMeta {
  title: string;
  short: string;
}

/**
 * Window/taskbar titles. Marat KMI is only met in chapter 4: until he shares his rules
 * (flags.sheetUnlocked) the notebook is just Artyom's plan — no spoiler in any title.
 */
export function appMeta(id: PcAppId, rulesUnlocked: boolean): AppMeta {
  switch (id) {
    case 'browser':
      return { title: 'Браузер — P2P и биржи', short: 'Браузер' };
    case 'files':
      return { title: 'Папка: Чеки и Ордера (115-ФЗ)', short: 'Чеки и Ордера' };
    case 'calc':
      return { title: 'Калькулятор спреда', short: 'Калькулятор' };
    case 'notes':
      return rulesUnlocked ? { title: 'Блокнот — Правила Марата KMI.txt', short: 'Правила.txt' } : { title: 'Блокнот — План.txt', short: 'План.txt' };
  }
}

export const useRulesUnlocked = () => useGame((s) => !!s.flags.sheetUnlocked);

export function useAppMeta() {
  const unlocked = useRulesUnlocked();
  return (id: PcAppId) => appMeta(id, unlocked);
}

/** Dock/menu-bar app names on the Mac. */
export const MAC_NAME: Record<PcAppId, string> = { browser: 'Браузер', files: 'Finder', calc: 'Калькулятор', notes: 'Заметки' };

export type IconId = PcAppId | 'settings' | 'shop';

/** Procedural app icons: Fluent-style glyph art on VoronovOS, squircle tiles on macOS. */
export function AppIcon({ id, skin, size = 40, className }: { id: IconId; skin: Skin; size?: number; className?: string }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={{ overflow: 'visible' }}>
      {skin === 'mac' ? macArt(id, u) : winArt(id, u)}
    </svg>
  );
}

const lg = (id: string, a: string, b: string, vertical = true) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2="1">
    <stop offset="0" stopColor={a} />
    <stop offset="1" stopColor={b} />
  </linearGradient>
);

function winArt(id: IconId, u: string): ReactNode {
  const shadow = { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' };
  switch (id) {
    case 'browser':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#5FD3FF', '#1666D6')}</defs>
          <circle cx="32" cy="32" r="26" fill={`url(#${u}a)`} />
          <g fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2.6">
            <ellipse cx="32" cy="32" rx="11" ry="26" />
            <path d="M6 32h52M10 19h44M10 45h44" />
          </g>
          <ellipse cx="25" cy="17" rx="13" ry="6" fill="#fff" opacity=".18" />
        </g>
      );
    case 'files':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#FFE08A', '#F5B21E')}</defs>
          <path d="M6 16a5 5 0 0 1 5-5h13l5 5h24a5 5 0 0 1 5 5v3H6z" fill="#DE9A12" />
          <path d="M6 22h52v26a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill={`url(#${u}a)`} />
          <path d="M6 24h52" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" />
        </g>
      );
    case 'calc':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#3EE0A1', '#05845C')}</defs>
          <rect x="11" y="5" width="42" height="54" rx="8" fill={`url(#${u}a)`} />
          <rect x="17" y="11" width="30" height="11" rx="3" fill="#ECFFF7" />
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={17 + c * 11} y={27 + r * 9.5} width="8" height="7" rx="2" fill={r === 2 && c === 2 ? '#FFC94D' : '#ffffff'} opacity={r === 2 && c === 2 ? 1 : 0.85} />))}
        </g>
      );
    case 'notes':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#4F8DFF', '#2563EB')}</defs>
          <rect x="12" y="6" width="40" height="52" rx="6" fill="#F8FAFC" />
          <path d="M12 12a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v6H12z" fill={`url(#${u}a)`} />
          <path d="M19 28h26M19 35h26M19 42h18" stroke="#94A3B8" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      );
    case 'settings':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#A3B1C6', '#4B5A70')}</defs>
          <circle cx="32" cy="32" r="26" fill={`url(#${u}a)`} />
          <Settings x={14} y={14} size={36} color="#fff" strokeWidth={2.2} />
        </g>
      );
    case 'shop':
      return (
        <g style={shadow}>
          <defs>{lg(`${u}a`, '#D29BFF', '#7C2BD9')}</defs>
          <rect x="7" y="7" width="50" height="50" rx="13" fill={`url(#${u}a)`} />
          <ShoppingBag x={16} y={15} size={32} color="#fff" strokeWidth={2.2} />
        </g>
      );
  }
}

function macArt(id: IconId, u: string): ReactNode {
  const tile = (a: string, b: string, inner: ReactNode) => (
    <g style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.4))' }}>
      <defs>
        {lg(`${u}t`, a, b)}
        {lg(`${u}h`, 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)')}
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="13.5" fill={`url(#${u}t)`} />
      {inner}
      <rect x="3" y="3" width="58" height="29" rx="13.5" fill={`url(#${u}h)`} opacity=".55" />
      <rect x="3.25" y="3.25" width="57.5" height="57.5" rx="13.3" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth=".5" />
    </g>
  );
  switch (id) {
    case 'browser':
      return tile(
        '#F4F7FB',
        '#C9D3DF',
        <g>
          <defs>{lg(`${u}c`, '#3FB2FF', '#1260E8')}</defs>
          <circle cx="32" cy="32" r="22" fill={`url(#${u}c)`} />
          {Array.from({ length: 24 }, (_, i) => (
            <path key={i} d="M32 12v3" stroke="#fff" strokeOpacity=".7" strokeWidth="1" transform={`rotate(${i * 15} 32 32)`} />
          ))}
          <g transform="rotate(42 32 32)">
            <path d="M32 15l4 17h-8z" fill="#FF3B30" />
            <path d="M32 49l4-17h-8z" fill="#fff" />
          </g>
        </g>,
      );
    case 'files':
      return tile(
        '#6CC6FF',
        '#1A73E8',
        <g>
          <path d="M14 22a4 4 0 0 1 4-4h9l4 4h15a4 4 0 0 1 4 4v2H14z" fill="#BFE6FF" />
          <path d="M14 27h36v15a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="#fff" />
        </g>,
      );
    case 'calc':
      return tile(
        '#4A4A50',
        '#1C1C1F',
        <g>
          <rect x="15" y="13" width="34" height="9" rx="2.5" fill="#8E8E93" opacity=".55" />
          {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={18.5 + c * 9} cy={30 + r * 9} r="3.4" fill={c === 3 ? '#FF9F0A' : r === 0 ? '#A5A5AA' : '#5E5E63'} />))}
        </g>,
      );
    case 'notes':
      return tile(
        '#FFFFFF',
        '#EDEDED',
        <g>
          <defs>{lg(`${u}y`, '#FFE16B', '#F5C400')}</defs>
          <path d="M3 16.5A13.5 13.5 0 0 1 16.5 3h31A13.5 13.5 0 0 1 61 16.5V20H3z" fill={`url(#${u}y)`} />
          <path d="M12 30h40M12 38h40M12 46h28" stroke="#D1D1D6" strokeWidth="1.6" />
          <path d="M12 23h40" stroke="#C7A100" strokeWidth="1" strokeDasharray="1.5 2.5" />
        </g>,
      );
    case 'settings':
      return tile('#C7CBD1', '#71767E', <Settings x={13} y={13} size={38} color="#2C2F35" strokeWidth={1.8} />);
    case 'shop':
      return tile('#5AC8FA', '#0A64E0', <ShoppingBag x={16} y={15} size={32} color="#fff" strokeWidth={2.1} />);
  }
}
