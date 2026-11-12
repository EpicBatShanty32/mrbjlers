import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { audio } from '../../audio';

/** «Глава 1. Новозаровск» → { tag: 'Глава 1', main: 'Новозаровск' }; «Концовка: «X»» → { tag: 'Концовка', main: 'X' }. */
export function splitTitle(title: string) {
  const ch = /^(Глава \d+)\.\s*(.+)$/.exec(title);
  if (ch) return { tag: ch[1], main: ch[2] };
  const end = /^Концовка:\s*[«"]?(.+?)[»"]?$/.exec(title);
  if (end) return { tag: 'Концовка', main: end[1] };
  return { tag: 'P2P: С НУЛЯ', main: title };
}

const HOLD_MS = 4600;

/** Establishing shot: spaced title reveal, drawn rules, typed place line. */
export function TitleCard({ title, place, onDone }: { title: string; place?: string; onDone: () => void }) {
  const { tag, main } = splitTitle(title);
  const placeRef = useRef<HTMLDivElement>(null);
  const words = main.split(' ');

  useEffect(() => {
    audio.sfx('title_hit');
    const timers: number[] = [window.setTimeout(() => audio.sfx('cine_whoosh'), 1500), window.setTimeout(onDone, HOLD_MS)];
    let raf = 0;
    if (place && placeRef.current) {
      const el = placeRef.current;
      const start = performance.now() + 1700;
      const step = (now: number) => {
        const n = Math.max(0, Math.floor(((now - start) / 1000) * 34));
        el.textContent = place.slice(0, n);
        if (n < place.length) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.9 } }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 70% at 50% 50%, rgba(0,0,0,.72), rgba(0,0,0,.9))' }} />
      <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
      <div className="relative flex w-full max-w-[1100px] flex-col items-center px-8 text-center">
        <motion.div
          className="text-[13px] font-semibold text-amber-200/90 uppercase"
          initial={{ opacity: 0, letterSpacing: '1.4em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, letterSpacing: '0.55em', filter: 'blur(0px)' }}
          transition={{ duration: 1.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {tag}
        </motion.div>
        <div className="mt-5 flex w-full items-center justify-center gap-5">
          <motion.i className="h-px flex-1 origin-right bg-gradient-to-l from-amber-200/70 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} />
          <motion.i className="size-1.5 rotate-45 bg-amber-200" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 14 }} />
          <motion.i className="h-px flex-1 origin-left bg-gradient-to-r from-amber-200/70 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <h1 className="mt-6 flex flex-wrap justify-center gap-x-[0.35em] text-[clamp(30px,4.6vw,66px)] leading-[1.1] font-light tracking-[0.14em] text-white uppercase" style={{ textShadow: '0 4px 40px rgba(255,200,120,.35)' }}>
          {words.map((w, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 14, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.1, delay: 0.7 + i * 0.16, ease: [0.16, 1, 0.3, 1] }}>
              {w}
            </motion.span>
          ))}
        </h1>
        <motion.i className="mt-7 h-px w-40 origin-center bg-amber-200/50" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 1.3 }} />
        <div className="mt-5 h-6 text-[15px] tracking-[0.18em] text-white/65 uppercase">
          <span ref={placeRef} />
          <span className="cs-caret ml-0.5 text-amber-200/80">▏</span>
        </div>
      </div>
    </motion.div>
  );
}
