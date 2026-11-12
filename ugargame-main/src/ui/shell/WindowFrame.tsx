import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Copy, Minus, Plus, Square, X } from 'lucide-react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import { cn } from '../common/kit';
import { iconDelta } from '../os/shared';

const MIN_W: Record<PcAppId, number> = { browser: 760, files: 520, calc: 280, notes: 340 };
const MIN_H: Record<PcAppId, number> = { browser: 460, files: 340, calc: 380, notes: 280 };

/** Where the window flies from/to (its taskbar or Dock icon) and how it animates. */
type Fly = { d: { x: number; y: number } | null; mac: boolean; lag: boolean };
// The old laptop renders animations in visible steps.
const stepEase = (t: number) => Math.round(t * 5) / 5;

const variants: Variants = {
  hidden: (c: Fly) => (c.d ? { opacity: 0, x: c.d.x, y: c.d.y, scale: 0.08 } : { opacity: 0, scale: c.mac ? 0.9 : 0.95, y: c.mac ? 0 : 14 }),
  shown: (c: Fly) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: c.lag ? { duration: 0.45, ease: stepEase } : c.mac ? { type: 'spring', stiffness: 420, damping: 32 } : { duration: 0.22, ease: [0.1, 0.9, 0.2, 1] },
  }),
  gone: (c: Fly) =>
    c.d
      ? { opacity: 0, x: c.d.x, y: c.d.y, scale: 0.08, transition: { duration: c.lag ? 0.5 : 0.3, ease: c.lag ? stepEase : [0.5, 0, 0.9, 0.5] } }
      : { opacity: 0, scale: c.mac ? 0.9 : 0.96, y: c.mac ? 0 : 10, transition: { duration: 0.16, ease: 'easeIn' } },
};

export function WindowFrame({ id, title, icon, bounds, children }: { id: PcAppId; title: string; icon: ReactNode; bounds: { w: number; h: number }; children: ReactNode }) {
  const w = useGame((s) => s.ui.windows[id]);
  const top = useGame((s) => s.ui.zTop);
  const tier = useGame((s) => s.hero.pcTier);
  const lagging = useGame((s) => s.hero.pcTier === 0 && Object.values(s.ui.windows).filter((x) => x.open && !x.minimized).length > 3);
  const lag = tier === 0;
  const mac = tier === 3;
  const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number; mode: 'move' | 'resize' } | null>(null);
  const lastMove = useRef(0);
  const wasMin = useRef(w.minimized);
  const prevMax = useRef(w.maximized);
  const [zooming, setZooming] = useState(false);
  useEffect(() => {
    wasMin.current = w.minimized;
  });
  useEffect(() => {
    if (prevMax.current === w.maximized) return;
    prevMax.current = w.maximized;
    setZooming(true);
    const t = setTimeout(() => setZooming(false), 320);
    return () => clearTimeout(t);
  }, [w.maximized]);

  const visible = w.open && !w.minimized;
  const B = { w: Math.max(bounds.w, 400), h: Math.max(bounds.h, 300) };
  const minW = Math.min(MIN_W[id], B.w);
  const minH = Math.min(MIN_H[id], B.h);
  const x = Math.min(Math.max(0, w.x), Math.max(0, B.w - minW));
  const y = Math.min(Math.max(0, w.y), Math.max(0, B.h - minH));
  const ww = Math.min(Math.max(w.w, minW), B.w - x);
  const hh = Math.min(Math.max(w.h, minH), B.h - y);
  const rect = w.maximized ? { x: 0, y: 0, w: B.w, h: B.h } : drag ?? { x, y, w: ww, h: hh };
  // Minimising flies to the icon; restoring flies back out of it.
  const fly: Fly = { d: (!visible && w.minimized) || (visible && wasMin.current) ? iconDelta(id, rect) : null, mac, lag: lagging };

  const onDown = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (w.maximized && mode === 'move') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: rect.x, y: rect.y, w: rect.w, h: rect.h, mode };
    useGame.getState().focusWindow(id);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    // The starter PC struggles: throttle dragging when it lags.
    const now = performance.now();
    if (lag && now - lastMove.current < 70) return;
    lastMove.current = now;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (s.mode === 'move') setDrag({ x: Math.min(Math.max(-s.w + 120, s.x + dx), B.w - 80), y: Math.min(Math.max(0, s.y + dy), B.h - 36), w: s.w, h: s.h });
    else setDrag({ x: s.x, y: s.y, w: Math.min(Math.max(MIN_W[id], s.w + dx), B.w - s.x), h: Math.min(Math.max(MIN_H[id], s.h + dy), B.h - s.y) });
  };
  const onUp = () => {
    if (drag) {
      const g = useGame.getState();
      if (start.current?.mode === 'move') g.moveWindow(id, drag.x, drag.y);
      else g.resizeWindow(id, drag.w, drag.h);
    }
    start.current = null;
    setDrag(null);
  };

  const focused = w.z === top;
  const g = useGame.getState;
  const bar = { onPointerDown: onDown('move'), onPointerMove: onMove, onPointerUp: onUp, onDoubleClick: () => g().toggleMaximize(id) };
  const shadow = mac
    ? focused
      ? '0 0 0 .5px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06), 0 34px 80px -12px rgba(0,0,0,.8), 0 12px 28px -10px rgba(0,0,0,.6)'
      : '0 0 0 .5px rgba(0,0,0,.8), 0 16px 40px -14px rgba(0,0,0,.6)'
    : focused
      ? '0 0 0 1px rgba(255,255,255,.13), 0 30px 70px -14px rgba(0,0,0,.85), 0 10px 24px -8px rgba(0,0,0,.6)'
      : '0 0 0 1px rgba(255,255,255,.07), 0 14px 34px -14px rgba(0,0,0,.6)';

  return (
    <AnimatePresence custom={fly}>
      {visible && (
        <motion.div
          key="win"
          data-window={id}
          custom={fly}
          variants={variants}
          initial="hidden"
          animate="shown"
          exit="gone"
          className={cn(
            'absolute flex flex-col overflow-hidden',
            w.maximized ? 'rounded-none' : mac ? 'rounded-[12px]' : 'rounded-[9px]',
            zooming && 'transition-[left,top,width,height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
          )}
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 10 + w.z, boxShadow: shadow } as CSSProperties}
          onPointerDown={() => !focused && g().focusWindow(id)}
        >
          {mac ? (
            <div {...bar} className={cn('relative flex h-[30px] shrink-0 cursor-default items-center backdrop-blur-xl', focused ? 'bg-[#2C2D33]/90 text-white/85' : 'bg-[#232428]/95 text-white/40')} style={{ boxShadow: 'inset 0 .5px 0 rgba(255,255,255,.14), inset 0 -1px 0 rgba(0,0,0,.45)' }}>
              <div className="group/tl flex items-center gap-2 pl-3" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <Light c="#FF5F57" on={focused} title="Закрыть" onClick={() => g().closeWindow(id)} glyph={<X size={8} strokeWidth={3} />} />
                <Light c="#FEBC2E" on={focused} title="Свернуть в Dock" onClick={() => g().minimizeWindow(id)} glyph={<Minus size={8} strokeWidth={3} />} />
                <Light c="#28C840" on={focused} title={w.maximized ? 'Вернуть размер' : 'Развернуть'} onClick={() => g().toggleMaximize(id)} glyph={<Plus size={8} strokeWidth={3} />} />
              </div>
              <div className="pointer-events-none absolute inset-x-24 flex items-center justify-center gap-1.5 truncate text-[12.5px] font-semibold">
                <span className={cn('shrink-0', !focused && 'opacity-50')}>{icon}</span>
                <span className="truncate">{title}</span>
              </div>
            </div>
          ) : (
            <div {...bar} className={cn('flex h-8 shrink-0 cursor-default items-center gap-2 pl-2.5 text-xs transition-colors', focused ? 'bg-[#1E2431] text-white/90' : 'bg-[#181C26] text-white/45')}>
              <span className={cn('shrink-0', !focused && 'opacity-60 grayscale')}>{icon}</span>
              <span className="truncate font-medium">{title}</span>
              <div className="ml-auto flex h-full items-stretch" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <Cap title="Свернуть" onClick={() => g().minimizeWindow(id)}>
                  <Minus size={14} strokeWidth={1.5} />
                </Cap>
                <Cap title={w.maximized ? 'Свернуть в окно' : 'Развернуть'} onClick={() => g().toggleMaximize(id)}>
                  {w.maximized ? <Copy size={11} strokeWidth={1.6} className="-scale-x-100" /> : <Square size={11} strokeWidth={1.6} />}
                </Cap>
                <Cap title="Закрыть" close onClick={() => g().closeWindow(id)}>
                  <X size={15} strokeWidth={1.5} />
                </Cap>
              </div>
            </div>
          )}
          <div className="win-body relative min-h-0 flex-1 bg-[#0f131b]">{children}</div>
          {!w.maximized && (
            <div className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize" onPointerDown={onDown('resize')} onPointerMove={onMove} onPointerUp={onUp}>
              {!mac && (
                <svg viewBox="0 0 10 10" className="h-full w-full text-white/25">
                  <path d="M9 3 L3 9 M9 6 L6 9" stroke="currentColor" strokeWidth="1" />
                </svg>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Cap({ title, close, onClick, children }: { title: string; close?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} className={cn('flex w-[42px] items-center justify-center text-white/75 transition-colors', close ? 'hover:bg-[#C42B1C] hover:text-white' : 'hover:bg-white/10 hover:text-white')}>
      {children}
    </button>
  );
}

function Light({ c, on, title, onClick, glyph }: { c: string; on: boolean; title: string; onClick: () => void; glyph: ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{ '--c': c } as CSSProperties}
      className={cn('flex h-3 w-3 items-center justify-center rounded-full text-black/60 shadow-[inset_0_0_0_.5px_rgba(0,0,0,.3)] group-hover/tl:bg-[var(--c)]', on ? 'bg-[var(--c)]' : 'bg-[#4B4C52]')}
    >
      <span className="opacity-0 transition-opacity group-hover/tl:opacity-100">{glyph}</span>
    </button>
  );
}
