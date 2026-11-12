import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardList, Cpu, Eye, Flame, Gauge, Pause, Play, Zap } from 'lucide-react';
import { needsFocus, useGame } from '../../game/store';
import type { Speed } from '../../game/types';
import { attention } from '../../game/engine/core';
import { cn } from '../common/kit';
import type { Skin } from './shared';

/** Simulated load per PC tier: the old laptop chokes on more than 3 windows. */
export function pcLoad(tier: number, open: number) {
  if (tier === 0) return { cpu: open > 3 ? 99 : 18 + open * 21, ram: Math.min(7.8, 3.4 + open * 1.1), ramMax: 8 };
  if (tier === 1) return { cpu: 9 + open * 7, ram: 6 + open * 1.2, ramMax: 32 };
  if (tier === 2) return { cpu: 5 + open * 3, ram: 9 + open, ramMax: 64 };
  return { cpu: 2 + open * 2, ram: 12 + open * 1.5, ramMax: 128 };
}

export const useOpenCount = () => useGame((s) => Object.values(s.ui.windows).filter((w) => w.open && !w.minimized).length);

export function CpuMeter({ compact }: { compact?: boolean }) {
  const tier = useGame((s) => s.hero.pcTier);
  const open = useOpenCount();
  const { cpu, ram, ramMax } = pcLoad(tier, open);
  const hot = cpu >= 95;
  return (
    <div
      title={tier === 0 ? 'Старый ноутбук: больше 3 окон — тормоза. Апгрейд — в «Магазине имущества».' : 'Нагрузка ПК'}
      className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] num transition-colors', hot ? 'bg-rose-500/20 text-rose-200' : 'text-white/60')}
    >
      <Cpu size={13} className={hot ? 'animate-pulse' : ''} />
      <span>ЦП {cpu}%</span>
      {!compact && (
        <>
          <span className="text-white/25">·</span>
          <span>
            ОЗУ {ram.toFixed(1)}/{ramMax} ГБ
          </span>
        </>
      )}
      {hot && <span className="font-semibold">· тормозит</span>}
    </div>
  );
}

export function ClipboardChip({ skin }: { skin: Skin }) {
  const clip = useGame((s) => s.clipboard);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!clip) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [clip?.at, clip?.value]);
  const title = clip ? `${clip.label}: ${clip.value}` : 'Буфер обмена пуст';
  if (skin === 'mac')
    return (
      <div title={title} className={cn('relative flex h-[22px] items-center gap-1 rounded-[5px] px-1.5 transition', flash ? 'bg-amber-300/30 text-amber-50' : 'text-white/85')}>
        <ClipboardList size={14} />
        {clip && <span className="max-w-[110px] truncate text-[11.5px] @max-5xl:hidden">{clip.label}</span>}
      </div>
    );
  return (
    <div title={title} className={cn('flex h-8 min-w-0 max-w-[190px] items-center gap-1.5 rounded-md px-2 text-[10.5px] transition', flash ? 'bg-amber-400/25 text-amber-100' : 'text-white/60 hover:bg-white/[.06]')}>
      <ClipboardList size={14} className="shrink-0" />
      <span className="truncate @max-4xl:hidden">{clip ? `Скопировано: ${clip.label}` : 'Буфер пуст'}</span>
    </div>
  );
}

export function Vitals({ skin }: { skin: Skin }) {
  const energy = useGame((s) => Math.round(s.hero.energy));
  const stress = useGame((s) => Math.round(s.hero.stress));
  const att = useGame((s) => attention(s));
  const w = skin === 'mac' ? 'w-7' : 'w-9';
  const item = (icon: ReactNode, v: number, color: string, label: string, invert = false) => (
    <div title={`${label}: ${v}/100`} className="flex items-center gap-1">
      {icon}
      <div className={cn('h-[5px] overflow-hidden rounded-full bg-white/15', w)}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v}%`, background: invert ? (v > 70 ? '#F6465D' : v > 40 ? '#F0B90B' : '#0ECB81') : v < 25 ? '#F6465D' : color }} />
      </div>
    </div>
  );
  return (
    <div className={cn('flex shrink-0 items-center gap-2', skin === 'mac' ? 'px-1.5 text-white/85' : 'h-8 rounded-md px-2 text-white/60 hover:bg-white/[.06]')}>
      {item(<Zap size={12} className="text-amber-300" />, energy, '#F0B90B', 'Энергия')}
      {item(<Flame size={12} className="text-rose-300" />, stress, '#F6465D', 'Стресс', true)}
      {item(<Eye size={12} className="text-sky-300" />, att, '#38BDF8', 'Внимательность')}
    </div>
  );
}

export function SpeedControls({ skin }: { skin: Skin }) {
  const speed = useGame((s) => s.speed);
  const focus = useGame((s) => needsFocus(s));
  const job = useGame((s) => !!s.job.activeJob);
  const mac = skin === 'mac';
  const opts: [Speed, ReactNode, string][] = [
    [0, <Pause size={mac ? 11 : 12} />, 'Пауза'],
    [1, <Play size={mac ? 11 : 12} />, '1x'],
    [2, <span className="text-[10px] font-bold">2x</span>, '2x'],
    [5, <span className="text-[10px] font-bold">5x</span>, '5x'],
  ];
  return (
    <div className="flex shrink-0 items-center gap-1">
      {focus && speed !== 0 && (
        <span title="Пока идёт сделка, время течёт медленнее" className="flex items-center gap-1 rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-200">
          <Gauge size={11} /> сделка
        </span>
      )}
      {job && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">на смене</span>}
      <div className={cn('flex items-center', mac ? 'gap-px rounded-[6px] bg-white/10 p-px' : 'gap-0.5 rounded-lg bg-white/[.06] p-0.5 ring-1 ring-white/[.08]')}>
        {opts.map(([v, icon, title]) => (
          <button
            key={v}
            title={title}
            onClick={() => useGame.getState().setSpeed(v)}
            className={cn(
              'flex items-center justify-center transition-colors',
              mac ? 'h-[18px] w-[22px] rounded-[5px]' : 'h-7 w-7 rounded-md',
              speed === v ? (mac ? 'bg-white/90 text-black' : 'bg-sky-400/30 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,.35)]') : 'text-white/60 hover:bg-white/10',
            )}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChapterBadge({ skin }: { skin: Skin }) {
  const chapter = useGame((s) => s.chapter);
  return <span className={cn('shrink-0 font-bold text-amber-300', skin === 'mac' ? 'rounded-[5px] bg-amber-300/15 px-1.5 py-px text-[11px]' : 'rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px]')}>Гл. {chapter}</span>;
}
