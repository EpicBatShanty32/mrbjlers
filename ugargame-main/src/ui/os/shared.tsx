import { useEffect, useRef, type RefObject } from 'react';
import { useGame } from '../../game/store';
import type { GameState, PcAppId } from '../../game/types';

export type Skin = 'win' | 'mac';

/** pcTier 3 (the MacBook) switches the computer to the macOS-like shell. */
export const useSkin = (): Skin => useGame((s) => (s.hero.pcTier === 3 ? 'mac' : 'win'));

/** DOM anchors for minimise/restore animations: the desktop and every taskbar/Dock icon. */
export const osRefs = { desk: null as HTMLElement | null, icons: new Map<PcAppId, HTMLElement>() };

export const iconRef = (id: PcAppId) => (el: HTMLElement | null) => {
  if (!el) return;
  osRefs.icons.set(id, el);
  return () => {
    if (osRefs.icons.get(id) === el) osRefs.icons.delete(id);
  };
};

/** Offset from a window's centre to its taskbar/Dock icon, in desktop coordinates. */
export function iconDelta(id: PcAppId, r: { x: number; y: number; w: number; h: number }) {
  const icon = osRefs.icons.get(id);
  const desk = osRefs.desk;
  if (!icon?.isConnected || !desk) return null;
  const a = icon.getBoundingClientRect();
  const b = desk.getBoundingClientRect();
  return { x: a.left + a.width / 2 - b.left - (r.x + r.w / 2), y: a.top + a.height / 2 - b.top - (r.y + r.h / 2) };
}

/** Topmost visible window (the "active app"). */
export function topWindow(s: GameState): PcAppId | null {
  let best: PcAppId | null = null;
  let z = -1;
  for (const id of Object.keys(s.ui.windows) as PcAppId[]) {
    const w = s.ui.windows[id];
    if (w.open && !w.minimized && w.z > z) {
      z = w.z;
      best = id;
    }
  }
  return best;
}

/** Close a popover on outside pointer-down or Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  const cb = useRef(close);
  cb.current = close;
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && cb.current();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && cb.current();
    window.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    };
  }, [open, ref]);
}

/** VoronovOS mark: a "V" chevron on an emerald→sky tile. */
export function VLogo({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="vlogo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#vlogo-g)" />
      <path d="M6.5 7.2 12 17.4l5.5-10.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A generic fruit with a leaf — the "Mac" mark (deliberately not a real logo). */
export function FruitLogo({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 7.6c1.5-1.1 4.1-1.3 5.6.5 1.7 1.9 1.4 5.6-.3 8.6-1.1 2-2.5 3.8-3.9 3.8-.9 0-1.1-.5-1.4-.5s-.6.5-1.5.5c-1.5 0-2.9-1.9-4-3.9-1.7-3-1.9-6.6-.1-8.5 1.5-1.8 4.1-1.6 5.6-.5z" />
      <path d="M12.4 6.6c.1-2 1.4-3.6 3.4-4.1-.1 2-1.4 3.6-3.4 4.1z" />
    </svg>
  );
}
