import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Clapperboard, Play, Home } from 'lucide-react';
import './cutscene.css';
import { audio } from '../../audio';
import { useGame } from '../../game/store';
import { useSettings } from '../../game/settings';
import { CUTSCENES } from '../../game/story/cutscenes';
import { accountingQuality } from '../../game/story/chapters';
import { netWorth, profitSince } from '../../game/engine/core';
import { fmtRub } from '../../game/util';
import type { GameState } from '../../game/types';
import { PostFX } from './fx';
import { SceneBackdrop } from './Scenes';
import { Credits } from './Credits';

const EASE = [0.16, 1, 0.3, 1] as const;

const ENDING_TEXT: Record<string, string> = {
  end_architect: 'Высокая чистая прибыль, чистый учёт и доверие Марата, Карима и Паши.',
  end_wolf: 'Капитал есть, но команда распалась — доверие потеряно.',
  end_crisis: 'Плечо, лизинг и иллюзия оборота привели к кассовому разрыву.',
  end_newstart: 'Капитал потерян, но честь и люди остались. Опыт — бесценен.',
};

type Kind = 'rub' | 'pct' | 'int';
interface Stat { label: string; value: number; kind: Kind }

function statsJson(s: GameState) {
  const list: Stat[] = [
    { label: 'Чистый капитал', value: netWorth(s), kind: 'rub' },
    { label: 'Оборот за игру', value: s.stats.turnover, kind: 'rub' },
    { label: 'Прибыль до налога', value: profitSince(s, 0), kind: 'rub' },
    { label: 'Качество учёта', value: accountingQuality(s), kind: 'pct' },
    { label: 'Мошенников поймано', value: s.stats.scamsCaught, kind: 'int' },
    { label: 'Ошибок с мошенниками', value: s.stats.scamsMissed, kind: 'int' },
    { label: 'Доверие Марата', value: Math.round(s.characters.marat.trust), kind: 'int' },
    { label: 'Доверие Паши', value: Math.round(s.characters.pasha.trust), kind: 'int' },
  ];
  return JSON.stringify(list);
}

const fmt = (v: number, k: Kind) => (k === 'rub' ? fmtRub(v) : k === 'pct' ? `${Math.round(v)}%` : String(Math.round(v)));

/** Count-up written straight to the DOM (no per-frame React state). */
function CountUp({ to, kind, delay }: { to: number; kind: Kind; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rm = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rm) {
      el.textContent = fmt(to, kind);
      return;
    }
    const start = performance.now() + delay * 1000;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1700));
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)), kind);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, kind, delay, rm]);
  return <span ref={ref} className="num">{fmt(0, kind)}</span>;
}

export function EndingScreen() {
  const ending = useGame((s) => (s.cutscene || s.flags.endingSeen ? null : s.ending));
  const stats = useGame((s) => (ending ? statsJson(s) : '[]'));
  const rm = useSettings((s) => s.reduceMotion);
  const grain = useSettings((s) => s.filmGrain);
  const [phase, setPhase] = useState<'stats' | 'credits' | 'thanks'>('stats');
  const def = ending ? CUTSCENES[ending] : undefined;

  useEffect(() => {
    if (!ending) return;
    const release = audio.claimScene('ending');
    audio.sfx('cine_reveal');
    if (def?.music) audio.music(def.music);
    return release;
  }, [ending, def]);
  useEffect(() => {
    if (ending && phase === 'credits') {
      audio.music('credits');
      audio.ambience(null);
    }
  }, [ending, phase]);

  const roll = useCallback(() => setPhase('thanks'), []);
  if (!ending || !def) return null;
  const list = JSON.parse(stats) as Stat[];
  const title = def.title?.replace('Концовка: ', '').replace(/[«»]/g, '') ?? '';
  const [head, ...tail] = title.split(': ');
  const btn = 'flex items-center gap-2 rounded-full border px-7 py-3 text-[14px] font-semibold tracking-wide transition';

  return (
    <MotionConfig reducedMotion={rm ? 'always' : 'never'}>
      <motion.div className="fixed inset-0 z-[950] overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
        <SceneBackdrop bg={def.bg} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 80% at 50% 45%, rgba(0,0,0,.55), rgba(0,0,0,.88))' }} />
        <PostFX grain={grain} />

        <AnimatePresence mode="wait">
          {phase === 'stats' && (
            <motion.div key="stats" className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" exit={{ opacity: 0, transition: { duration: 0.6 } }}>
              <motion.div className="text-[13px] font-semibold text-amber-200/90 uppercase" initial={{ opacity: 0, letterSpacing: '1.3em' }} animate={{ opacity: 1, letterSpacing: '0.6em' }} transition={{ duration: 1.5, delay: 0.3, ease: EASE }}>
                Финал
              </motion.div>
              <motion.h1 className="mt-5 text-[clamp(30px,4.4vw,64px)] leading-[1.1] font-light tracking-[0.1em] text-white uppercase" style={{ textShadow: '0 6px 50px rgba(255,200,120,.35)' }} initial={{ opacity: 0, y: 16, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.3, delay: 0.7, ease: EASE }}>
                {head}
              </motion.h1>
              {tail.length > 0 && (
                <motion.div className="mt-2 font-serif text-[clamp(16px,1.7vw,26px)] text-amber-100/80 italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }}>
                  {tail.join(': ')}
                </motion.div>
              )}
              <motion.p className="mt-4 max-w-xl text-[16px] text-white/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}>
                {ENDING_TEXT[ending]}
              </motion.p>
              <div className="mt-9 grid w-[min(900px,92vw)] grid-cols-2 gap-3 sm:grid-cols-4">
                {list.map((st, i) => (
                  <motion.div key={st.label} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-left backdrop-blur-md" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 + i * 0.16, duration: 0.7, ease: EASE }}>
                    <div className="text-[11px] tracking-[0.18em] text-white/45 uppercase">{st.label}</div>
                    <div className="mt-1.5 text-[clamp(20px,1.9vw,28px)] leading-none font-semibold text-white">
                      <CountUp to={st.value} kind={st.kind} delay={2.2 + i * 0.16} />
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div className="mt-10 flex flex-wrap justify-center gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 + list.length * 0.16 + 0.8, duration: 0.8 }}>
                <button onClick={() => setPhase('credits')} className={`${btn} border-amber-200/70 bg-amber-200/90 text-black shadow-[0_0_40px_rgba(255,200,120,.3)] hover:bg-amber-100`}>
                  <Clapperboard size={16} /> Титры
                </button>
                <Actions btn={btn} />
              </motion.div>
            </motion.div>
          )}
          {phase === 'thanks' && (
            <motion.div key="thanks" className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>
              <div className="text-[clamp(34px,5vw,72px)] font-light tracking-[0.16em] text-white uppercase" style={{ textShadow: '0 6px 60px rgba(255,200,120,.45)' }}>Спасибо за игру</div>
              <i className="mt-6 block h-px w-48 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Actions btn={btn} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>{phase === 'credits' && <Credits key="credits" onEnd={roll} />}</AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}

function Actions({ btn }: { btn: string }) {
  return (
    <>
      <button onClick={() => useGame.getState().act((d) => void (d.flags.endingSeen = true))} className={`${btn} border-white/20 bg-white/10 text-white hover:bg-white/20`}>
        <Play size={16} /> Продолжить играть
      </button>
      <button onClick={() => useGame.getState().quitToMenu()} className={`${btn} border-white/20 bg-white/10 text-white hover:bg-white/20`}>
        <Home size={16} /> В главное меню
      </button>
    </>
  );
}
