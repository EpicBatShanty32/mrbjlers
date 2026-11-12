import type { CSSProperties, ReactNode } from 'react';
import { audio } from '../../audio';
import { cn } from '../common/kit';

/** 0..1 range slider with a filled track (styled by `.ui-range` in index.css). */
export function Slider({ value, onChange, disabled, accent, className }: { value: number; onChange: (v: number) => void; disabled?: boolean; accent?: string; className?: string }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      disabled={disabled}
      onChange={(e) => onChange(+e.target.value / 100)}
      className={cn('ui-range', className)}
      style={{ '--v': `${Math.round(value * 100)}%`, ...(accent ? { '--accent': accent } : {}) } as CSSProperties}
    />
  );
}

/** iOS-style switch. */
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => {
        audio.sfx('ui_toggle');
        onChange(!on);
      }}
      className={cn('relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40', on ? 'bg-[#30D158]' : 'bg-white/15')}
    >
      <span className={cn('absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.35)] transition-transform duration-200', on && 'translate-x-4')} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-black/30 p-0.5 ring-1 ring-white/10">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => {
            audio.sfx('ui_click');
            onChange(v);
          }}
          className={cn('flex-1 rounded-md px-3 py-1 text-[12px] whitespace-nowrap transition-colors', value === v ? 'bg-white/90 font-semibold text-black shadow' : 'text-white/65 hover:text-white')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Row({ icon, label, sub, children }: { icon?: ReactNode; label: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 px-3.5 py-2">
      {icon && <span className="shrink-0 text-white/60">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-white/90">{label}</div>
        {sub && <div className="text-[11px] leading-snug text-white/45">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
