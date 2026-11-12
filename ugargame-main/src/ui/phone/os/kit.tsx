import { useId, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { audio } from '../../../audio';
import { clamp } from '../../../game/util';

/** iOS switch. */
export function Toggle({ on, onChange, tint = '#34C759' }: { on: boolean; onChange: (v: boolean) => void; tint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        audio.sfx('ui_toggle');
        onChange(!on);
      }}
      className="relative h-[28px] w-[47px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: on ? tint : 'rgba(120,120,128,.36)' }}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.28)]"
        animate={{ x: on ? 19 : 0 }}
        transition={{ type: 'spring', stiffness: 650, damping: 36 }}
      />
    </button>
  );
}

function usePointerValue(axis: 'x' | 'y', onValue: (t: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const upd = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onValue(axis === 'x' ? clamp((e.clientX - r.left) / r.width, 0, 1) : clamp(1 - (e.clientY - r.top) / r.height, 0, 1));
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      upd(e);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) upd(e);
    },
  };
}

/** Horizontal iOS slider. */
export function Slider({ value, onChange, min = 0, max = 1, left, right, tint = '#0A84FF' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; left?: ReactNode; right?: ReactNode; tint?: string }) {
  const t = clamp((value - min) / (max - min), 0, 1);
  const h = usePointerValue('x', (k) => onChange(min + k * (max - min)));
  return (
    <div className="flex items-center gap-3">
      {left}
      <div {...h} className="relative h-7 flex-1 cursor-pointer touch-none">
        <div className="absolute top-1/2 h-[5px] w-full -translate-y-1/2 rounded-full bg-white/18" />
        <div className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full" style={{ width: `${t * 100}%`, background: tint }} />
        <div className="absolute top-1/2 h-[25px] w-[25px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.35)]" style={{ left: `${t * 100}%` }} />
      </div>
      {right}
    </div>
  );
}

/** Control Center vertical slider (brightness / volume). */
export function VSlider({ value, onChange, min = 0, max = 1, icon }: { value: number; onChange: (v: number) => void; min?: number; max?: number; icon: ReactNode }) {
  const t = clamp((value - min) / (max - min), 0, 1);
  const h = usePointerValue('y', (k) => onChange(min + k * (max - min)));
  return (
    <div {...h} className="lg-btn relative h-full w-full cursor-pointer touch-none overflow-hidden rounded-[6.4cqw]">
      <div className="absolute inset-x-0 bottom-0 bg-white/95" style={{ height: `${t * 100}%` }} />
      <div className="absolute inset-x-0 bottom-[4.5cqw] flex justify-center transition-colors" style={{ color: t > 0.14 ? '#5c5c62' : '#fff' }}>
        {icon}
      </div>
    </div>
  );
}

// ───────── status bar glyphs ─────────
export function SignalGlyph({ bars = 4 }: { bars?: number }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
      {[3.6, 5.8, 8.2, 11].map((h, i) => (
        <rect key={i} x={i * 4.7} y={12 - h} width="3.3" height={h} rx="1" opacity={i < bars ? 1 : 0.3} />
      ))}
    </svg>
  );
}

export function WifiGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <path d="M1.4 4.4a9.4 9.4 0 0 1 13.2 0" />
      <path d="M4 7.1a5.6 5.6 0 0 1 8 0" />
      <circle cx="8" cy="10.1" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** iOS 17+ battery: level fill + knocked-out percentage. */
export function BatteryGlyph({ level, power = false, text = true }: { level: number; power?: boolean; text?: boolean }) {
  const u = 'bt' + useId().replace(/[^\w-]/g, '');
  const W = 25, H = 12;
  const fill = power ? '#FFD60A' : level <= 20 ? '#FF3B30' : 'currentColor';
  return (
    <svg width={W + 3} height={H} viewBox={`0 0 ${W + 3} ${H}`}>
      <defs>
        <clipPath id={u + 'c'}>
          <rect width={W} height={H} rx="3.8" />
        </clipPath>
        <mask id={u + 'm'}>
          <rect width={W + 3} height={H} fill="#fff" />
          {text && (
            <text x={W / 2} y={H / 2} dy=".36em" textAnchor="middle" fontSize="9.6" fontWeight="700" fill="#000" fontFamily="-apple-system, system-ui, sans-serif">
              {level}
            </text>
          )}
        </mask>
      </defs>
      <g mask={`url(#${u}m)`}>
        <rect width={W} height={H} rx="3.8" fill="currentColor" opacity=".36" />
        <rect width={(W * level) / 100} height={H} fill={fill} clipPath={`url(#${u}c)`} />
      </g>
      <path d={`M${W + 1.2} 4.2a1.6 1.6 0 0 1 1.6 1.6v.4a1.6 1.6 0 0 1-1.6 1.6Z`} fill="currentColor" opacity=".4" />
    </svg>
  );
}

/** Face ID glyph: scanning pulse → green check. */
export function FaceGlyph({ size, state }: { size: number; state: 'scan' | 'ok' | 'idle' }) {
  const ok = state === 'ok';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={ok ? '#34C759' : '#fff'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <g className={state === 'scan' ? 'os-face' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M6 20v-8a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8" />
      </g>
      {ok ? (
        <motion.path d="M21 33l8 8 15-17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28 }} />
      ) : (
        <g opacity={state === 'scan' ? 1 : 0.9}>
          <path d="M22 24v4M42 24v4M32 24v11h-3" />
          <path d="M23 43c5 4 13 4 18 0" />
        </g>
      )}
    </svg>
  );
}

/** Rounded glyph tile used in Settings rows. */
export function Tile({ bg, children, size = 29 }: { bg: string; children: ReactNode; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[8px] text-white" style={{ background: bg, width: size, height: size }}>
      {children}
    </span>
  );
}
