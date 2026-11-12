import { Fragment, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { CHARACTERS } from '../../game/data/static';
import { TRACKS } from '../../audio';

const Head = ({ children }: { children: string }) => (
  <div className="mt-20 mb-8 flex items-center justify-center gap-4 text-[12px] font-semibold tracking-[0.5em] text-amber-200/80 uppercase">
    <i className="h-px w-12 bg-amber-200/40" />
    {children}
    <i className="h-px w-12 bg-amber-200/40" />
  </div>
);

const Row = ({ role, name }: { role: string; name: string }) => (
  <>
    <div className="text-right text-[15px] text-white/45">{role}</div>
    <div className="size-1 rotate-45 self-center bg-amber-200/50" />
    <div className="text-left text-[19px] font-medium tracking-wide text-white">{name}</div>
  </>
);

const OST = TRACKS.filter((t) => t.id.startsWith('cs_') || t.id === 'credits' || t.id === 'menu');

/** Rolling credits; `onEnd` fires when the roll has left the screen. */
export function Credits({ onEnd }: { onEnd: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onEnd();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onEnd]);
  return (
    <motion.div className="absolute inset-0 z-10 overflow-hidden bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
      <div className="cs-roll absolute inset-x-0 top-0 mx-auto w-[min(780px,92vw)] pb-40 text-center" style={{ '--rl': '58s' } as React.CSSProperties} onAnimationEnd={onEnd}>
        <div className="text-[clamp(40px,6vw,88px)] leading-none font-light tracking-[0.22em] text-white uppercase" style={{ textShadow: '0 6px 60px rgba(255,200,120,.4)' }}>P2P</div>
        <div className="mt-3 text-[clamp(14px,1.6vw,22px)] tracking-[0.7em] text-amber-200/90 uppercase">С нуля</div>
        <div className="mx-auto mt-6 max-w-md font-serif text-[17px] text-white/50 italic">История о том, как с 3 700 рублей на карте дойти до своего дела</div>

        <Head>В ролях</Head>
        <div className="mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-5">
          {Object.values(CHARACTERS).map((c) => (
            <Fragment key={c.id}>
              <Row role={c.role} name={c.name} />
            </Fragment>
          ))}
        </div>

        <Head>Саундтрек</Head>
        <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-left">
          {OST.map((t) => (
            <Fragment key={t.id}>
              <div className="text-[17px] text-white">«{t.title}»</div>
              <div className="text-right text-[14px] text-white/40">{t.mood}</div>
            </Fragment>
          ))}
        </div>

        <Head>Особая благодарность</Head>
        <div className="mx-auto max-w-md space-y-3 font-serif text-[18px] text-white/70 italic">
          <p>Всем, кто начинал с нуля</p>
          <p>и не терял голову</p>
          <p>Банкам — за терпение</p>
          <p>Дождю — за настроение</p>
        </div>
        <div className="mt-24 text-[13px] tracking-[0.5em] text-white/30 uppercase">Новозаровск · Москва</div>
      </div>
      <button onClick={onEnd} className="absolute right-8 bottom-7 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-medium tracking-wide text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white">
        <SkipForward size={14} /> Пропустить
      </button>
    </motion.div>
  );
}
