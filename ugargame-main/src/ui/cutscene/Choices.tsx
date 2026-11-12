import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { audio } from '../../audio';
import { useGame } from '../../game/store';
import { CHARACTERS } from '../../game/data/static';
import type { CharacterId } from '../../game/types';
import { cn } from '../common/kit';

// ── consequence toasts (module store: they outlive the cutscene view) ──
interface Toast { id: number; text: string; name: string; delta: number }
let toasts: Toast[] = [];
let uid = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const watch = (f: () => void) => (subs.add(f), () => void subs.delete(f));

/** Run a choice and announce every trust change it caused. */
export function chooseWithDiff(i: number) {
  const before = Object.fromEntries(Object.values(useGame.getState().characters).map((c) => [c.id, c.trust]));
  useGame.getState().cutsceneChoose(i);
  const after = useGame.getState().characters;
  const fresh: Toast[] = [];
  for (const id of Object.keys(after) as CharacterId[]) {
    if (id === 'artem') continue;
    const delta = Math.round(after[id].trust - (before[id] ?? after[id].trust));
    if (delta) fresh.push({ id: ++uid, name: CHARACTERS[id].short, delta, text: `${CHARACTERS[id].short} это запомнит` });
  }
  if (!fresh.length) return;
  toasts = [...toasts, ...fresh].slice(-5);
  emit();
  if (fresh.some((t) => t.delta > 0)) audio.sfx('trust_up');
  if (fresh.some((t) => t.delta < 0)) window.setTimeout(() => audio.sfx('trust_down'), fresh.some((t) => t.delta > 0) ? 380 : 0);
  for (const t of fresh)
    window.setTimeout(() => {
      toasts = toasts.filter((x) => x.id !== t.id);
      emit();
    }, 4600);
}

export function Toasts() {
  const list = useSyncExternalStore(watch, () => toasts, () => toasts);
  return (
    <div className="pointer-events-none fixed top-[calc(8.5vh+14px)] left-1/2 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {list.map((t) => {
          const up = t.delta > 0;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.4 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={cn('flex items-center gap-3 rounded-full border py-2 pr-5 pl-3 text-[15px] shadow-2xl backdrop-blur-xl', up ? 'border-emerald-400/40 bg-emerald-950/70 text-emerald-100' : 'border-rose-400/40 bg-rose-950/70 text-rose-100')}
              style={{ boxShadow: `0 8px 36px ${up ? 'rgba(16,185,129,.28)' : 'rgba(244,63,94,.3)'}` }}
            >
              <span className={cn('flex size-7 items-center justify-center rounded-full', up ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300')}>
                {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              </span>
              <span className="font-semibold">{t.text}</span>
              <span className="text-white/35">·</span>
              <span>
                доверие <b className={cn('num text-[16px]', up ? 'text-emerald-300' : 'text-rose-300')}>{up ? '+' : '−'}{Math.abs(t.delta)}</b>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── decision cards ──
export function ChoiceCards({ choices, onPick, onFlash }: { choices: { text: string; hint?: string }[]; onPick: (i: number) => void; onFlash?: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    audio.sfx('choice_select');
    onFlash?.();
    window.setTimeout(() => onPick(i), 520);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (e.repeat || !(i >= 0 && i < choices.length)) return;
      e.preventDefault();
      pick(i);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <motion.div className="flex w-[min(820px,92vw)] flex-col gap-3" initial="hide" animate="show" exit="hide" variants={{ show: { transition: { staggerChildren: 0.11 } }, hide: {} }}>
      {choices.map((c, i) => {
        const chosen = picked === i;
        return (
          <motion.button
            key={i}
            data-choice={i}
            variants={{ hide: { opacity: 0, y: 26, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } }}
            animate={picked === null ? undefined : chosen ? { scale: 1.035, opacity: 1 } : { opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            whileHover={picked === null ? { x: 6 } : undefined}
            onMouseEnter={() => picked === null && audio.sfx('choice_hover')}
            onClick={(e) => {
              e.stopPropagation();
              pick(i);
            }}
            className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/15 bg-black/60 py-3.5 pr-5 pl-3.5 text-left shadow-2xl backdrop-blur-xl transition-colors hover:border-amber-200/70 hover:bg-black/75 focus-visible:outline-none"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-amber-300/0 transition-colors group-hover:bg-amber-300" />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/12 to-amber-200/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-[17px] font-bold text-white shadow-inner transition-colors group-hover:border-amber-200 group-hover:bg-amber-300 group-hover:text-black">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="cs-sub block text-[clamp(15px,1.25vw,19px)] leading-snug font-medium text-white">{c.text}</span>
              {c.hint && <span className="mt-1 block text-[13px] leading-snug text-amber-200/70">{c.hint}</span>}
            </span>
            {chosen && <motion.span className="pointer-events-none absolute inset-0 bg-amber-200" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
