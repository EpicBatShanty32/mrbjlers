import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Lightbulb, Target, Zap } from 'lucide-react';
import { useGame } from '../../game/store';
import { chapterDef, hintFor } from '../../game/story/chapters';
import { fmtRub } from '../../game/util';
import { Bar, cn } from '../common/kit';
import { useSkin } from '../os/shared';

type GoalView = { id: string; text: string; done: boolean; p?: [number, number]; optional?: boolean };

/** Chapter goals + contextual hint, docked above the taskbar/Dock so it never covers windows. */
export default function QuestBar() {
  const chapter = useGame((s) => s.chapter);
  const open = useGame((s) => s.ui.questOpen);
  // Serialized so the selector result is stable between ticks.
  const goalsJson = useGame((s) =>
    JSON.stringify(chapterDef(s.chapter).goals.map((g) => ({ id: g.id, text: typeof g.text === 'function' ? g.text(s) : g.text, done: g.done(s), p: g.progress?.(s), optional: g.optional }))),
  );
  const goals = useMemo(() => JSON.parse(goalsJson) as GoalView[], [goalsJson]);
  const hint = useGame((s) => (s.ui.hints ? hintFor(s) : null));
  const tired = useGame((s) => s.hero.energy < 22);
  const ending = useGame((s) => !!s.ending);
  const mac = useSkin() === 'mac';
  const def = chapterDef(chapter);
  const required = goals.filter((g) => !g.optional);
  const doneCount = required.filter((g) => g.done).length;
  const next = goals.find((g) => !g.done && !g.optional);
  const sleepHow = mac ? 'Spotlight (Ctrl+Пробел) → «Лечь спать»' : '«Пуск» → «Лечь спать»';
  const pct = required.length ? doneCount / required.length : 1;

  return (
    <div className={cn('relative z-[250] shrink-0', mac ? 'mx-2 mb-1 rounded-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,.7)] ring-1 ring-white/10' : 'border-t border-white/[.07]')}>
      <div className={cn('pointer-events-none absolute inset-0 -z-10 backdrop-blur-2xl', mac ? 'rounded-xl bg-[#1E1E24]/55' : 'bg-[#0E131D]/75')} />
      <button onClick={() => useGame.getState().toggleQuest()} className="flex min-h-[34px] w-full items-center gap-3 px-3 py-1.5 text-left">
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center" title={`${doneCount}/${required.length}`}>
          <svg viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="10" fill="none" stroke="#F0B90B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${pct * 62.8} 62.8`} className="transition-[stroke-dasharray] duration-700" />
          </svg>
          <span className="text-[9px] font-bold text-amber-200">{chapter}</span>
        </span>
        <span className="shrink-0 leading-tight">
          <span className="block text-[9px] font-bold tracking-[0.2em] text-amber-300/80 uppercase">Глава {chapter}</span>
          <span className="block text-xs font-semibold text-white">{def.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[.06] px-2 py-0.5 text-[11px] text-white/55">
          <Target size={12} />
          {ending ? 'финал пройден' : `${doneCount}/${required.length}`}
        </span>
        <span className="min-w-0 flex-1 text-[11.5px] leading-snug">
          {hint ? (
            <span className="flex items-start gap-1.5 text-sky-100/90">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-sky-300" />
              <span className="line-clamp-2">{hint}</span>
            </span>
          ) : next ? (
            <span className="block truncate text-white/65">Цель: {next.text}</span>
          ) : null}
        </span>
        {tired && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-200" title={`Поешьте (банк → платежи) или лягте спать: ${sleepHow}`}>
            <Zap size={11} /> устал
          </span>
        )}
        <span className="shrink-0 text-white/40">{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            style={{ transformOrigin: 'bottom right' }}
            className={cn('absolute right-2 bottom-full mb-2 w-[390px] max-w-[70%] p-3.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,.85)] ring-1 ring-white/10 backdrop-blur-2xl', mac ? 'rounded-2xl bg-[#26262C]/85' : 'rounded-xl bg-[#161B26]/92')}
          >
            <div className="text-[10px] font-bold tracking-[0.2em] text-amber-300/80 uppercase">Глава {chapter} · цели</div>
            <div className="mt-0.5 mb-3 text-[12px] text-white/50">{def.subtitle}</div>
            <div className="space-y-2.5">
              {goals.map((g) => (
                <div key={g.id} className="text-xs">
                  <div className={cn('flex items-start gap-2', g.done ? 'text-emerald-300/80 line-through decoration-emerald-500/40' : 'text-white/85')}>
                    {g.done ? <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-400" /> : <Circle size={14} className="mt-px shrink-0 text-white/30" />}
                    <span>
                      {g.text}
                      {g.optional && <span className="ml-1 text-white/35">(необязательно)</span>}
                    </span>
                  </div>
                  {g.p && !g.done && (
                    <div className="mt-1 ml-6">
                      <Bar value={g.p[0] / g.p[1]} color="#F0B90B" />
                      <div className="mt-0.5 text-[10px] text-white/40 num">{g.p[1] > 100 ? `${fmtRub(g.p[0])} / ${fmtRub(g.p[1])}` : `${g.p[0]} / ${g.p[1]}`}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {tired && <div className="mt-3 rounded-lg bg-rose-500/10 p-2 text-[11px] text-rose-200/90">Артём устал: внимательность падает. Поешьте (банк → «Платежи») или лягте спать: {sleepHow}.</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
