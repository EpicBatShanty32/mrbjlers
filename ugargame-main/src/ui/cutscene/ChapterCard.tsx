import { useEffect } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import './cutscene.css';
import { audio } from '../../audio';
import { useGame } from '../../game/store';
import { useSettings } from '../../game/settings';
import { chapterDef } from '../../game/story/chapters';
import { Bokeh, PostFX } from './fx';

const EASE = [0.16, 1, 0.3, 1] as const;
const TOTAL = 8;

export function ChapterCard() {
  const n = useGame((s) => (s.cutscene ? null : s.ui.chapterCard));
  const goalsJson = useGame((s) => (s.ui.chapterCard ? JSON.stringify(chapterDef(s.ui.chapterCard).goals.map((g) => (typeof g.text === 'function' ? g.text(s) : g.text))) : '[]'));
  const rm = useSettings((s) => s.reduceMotion);
  const grain = useSettings((s) => s.filmGrain);
  useEffect(() => {
    if (n) audio.sfx('chapter');
  }, [n]);
  useEffect(() => {
    if (!n) return;
    const k = (e: KeyboardEvent) => {
      if (e.repeat || !(e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
      useGame.getState().dismissChapterCard();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [n]);
  if (!n) return null;
  const def = chapterDef(n);
  const goals = JSON.parse(goalsJson) as string[];
  const goalsAt = 2.1;
  return (
    <MotionConfig reducedMotion={rm ? 'always' : 'never'}>
      <motion.div className="fixed inset-0 z-[900] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} style={{ background: 'radial-gradient(120% 90% at 50% 0%, #1a2238 0%, #0a0d16 55%, #040509 100%)' }}>
        <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(40% 55% at 50% 38%, rgba(255,190,110,.16), transparent)' }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 7, repeat: Infinity }} />
        <Bokeh n={22} seed={n * 7} colors={['rgba(255,205,140,.55)', 'rgba(150,185,255,.5)']} r={[6, 26]} o={[0.08, 0.28]} />

        <motion.div
          className="pointer-events-none absolute inset-x-0 top-1/2 text-center font-black select-none"
          style={{ translate: '0 -54%', fontSize: 'clamp(260px, 44vw, 700px)', lineHeight: 1, WebkitTextStroke: '2px rgba(255,214,150,.28)', color: 'transparent', backgroundImage: 'linear-gradient(180deg, rgba(255,214,150,.20), transparent 78%)', backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
          initial={{ opacity: 0, scale: 1.18, filter: 'blur(14px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 2.2, ease: EASE }}
        >
          {String(n).padStart(2, '0')}
        </motion.div>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <motion.div className="text-[14px] font-semibold text-amber-200/90 uppercase" initial={{ opacity: 0, letterSpacing: '1.4em' }} animate={{ opacity: 1, letterSpacing: '0.6em' }} transition={{ duration: 1.5, delay: 0.4, ease: EASE }}>
            Глава {n} из {TOTAL}
          </motion.div>
          <div className="mt-5 flex w-[min(640px,80vw)] items-center gap-4">
            <motion.i className="h-px flex-1 origin-right bg-gradient-to-l from-amber-200/70 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 0.8, ease: EASE }} />
            <motion.i className="size-1.5 rotate-45 bg-amber-200" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 14 }} />
            <motion.i className="h-px flex-1 origin-left bg-gradient-to-r from-amber-200/70 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 0.8, ease: EASE }} />
          </div>
          <motion.h1 className="mt-6 text-[clamp(34px,5.2vw,78px)] leading-[1.05] font-light tracking-[0.1em] text-white uppercase" style={{ textShadow: '0 6px 50px rgba(255,190,110,.4)' }} initial={{ opacity: 0, y: 18, filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.3, delay: 1.0, ease: EASE }}>
            {def.title}
          </motion.h1>
          <motion.p className="mt-3 font-serif text-[clamp(16px,1.6vw,24px)] text-white/60 italic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.6, ease: EASE }}>
            {def.subtitle}
          </motion.p>

          <div className="mt-9 w-[min(640px,88vw)] space-y-2.5 text-left">
            <motion.div className="mb-1 text-[11px] font-semibold tracking-[0.4em] text-white/35 uppercase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: goalsAt - 0.1 }}>
              Цели главы
            </motion.div>
            {goals.map((g, i) => (
              <motion.div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-[16px] text-white/90 backdrop-blur-md" initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, delay: goalsAt + i * 0.4, ease: EASE }}>
                <span className="mt-[3px] text-[12px] text-amber-300">◆</span>
                {g}
              </motion.div>
            ))}
          </div>

          <motion.button
            onClick={() => useGame.getState().dismissChapterCard()}
            className="mt-9 rounded-full border border-amber-200/60 bg-amber-200/90 px-12 py-3 text-[15px] font-bold tracking-[0.2em] text-black uppercase shadow-[0_0_40px_rgba(255,200,120,.35)] transition hover:bg-amber-100 hover:shadow-[0_0_60px_rgba(255,200,120,.55)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: goalsAt + goals.length * 0.4 + 0.2, duration: 0.7 }}
          >
            Начать
          </motion.button>
        </div>
        <PostFX grain={grain} />
      </motion.div>
    </MotionConfig>
  );
}
