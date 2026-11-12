import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { CHARACTERS } from '../../game/data/static';
import type { CharacterId } from '../../game/types';
import type { Speaker } from '../../game/story/cutscenes';
import type { Reveal } from './reveal';

/** Artem's blue, lifted so italic thoughts stay readable over bright footage. */
export const thoughtColor = '#8db9ff';

function Body({ text, reveal, className, color }: { text: string; reveal: Reveal; className: string; color?: string }) {
  return (
    <p className={className} style={color ? { color } : undefined}>
      <span ref={reveal.shown} />
      <span ref={reveal.rest} className="opacity-0">{text}</span>
    </p>
  );
}

function Prompt({ show, center }: { show: boolean; center?: boolean }) {
  return (
    <motion.div className={center ? 'mt-3 flex justify-center' : 'absolute right-5 bottom-3'} initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.3 }}>
      <span className="cs-nudge flex items-center gap-1 text-[11px] font-semibold tracking-[0.25em] text-white/55 uppercase">
        Далее <ChevronDown size={14} />
      </span>
    </motion.div>
  );
}

/** Cinematic subtitles: name plate + glass panel for characters, centred serif for narration/thoughts. */
export function Subtitles({ who, text, reveal, showPrompt, children }: { who: Speaker; text: string; reveal: Reveal; showPrompt: boolean; children?: ReactNode }) {
  const isThought = who === 'thought';
  if (who === 'narrator' || isThought) {
    return (
      <div className="relative w-[min(980px,90vw)] text-center">
        <div className="pointer-events-none absolute -inset-x-16 -inset-y-8 -z-10" style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,.62), transparent)' }} />
        {isThought && <div className="mb-2 text-[11px] font-semibold tracking-[0.4em] uppercase" style={{ color: thoughtColor }}>Артём · мысли</div>}
        {!isThought && <div className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />}
        <Body
          text={text}
          reveal={reveal}
          color={isThought ? thoughtColor : undefined}
          className={`cs-sub min-h-[3.1em] text-[clamp(18px,1.7vw,27px)] leading-[1.55] tracking-wide ${isThought ? 'italic' : 'font-serif text-white/95'}`}
        />
        
        <Prompt show={showPrompt} center />
        {children}
      </div>
    );
  }
  const ch = CHARACTERS[who as CharacterId];
  const color = ch.color;
  return (
    <div className="relative w-[min(920px,92vw)]">
      <motion.div
        key={who}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -top-4 left-6 z-10 flex items-center rounded-lg px-4 py-1.5 text-[15px] font-bold tracking-[0.12em] text-white uppercase"
        style={{ background: `linear-gradient(100deg, ${color}, ${color}b0)`, boxShadow: `0 6px 26px ${color}66, inset 0 1px 0 rgba(255,255,255,.3)`, textShadow: '0 1px 6px rgba(0,0,0,.55)' }}
      >
        {ch.short}
      </motion.div>
      <div
        className="relative overflow-hidden rounded-2xl border border-white/12 px-8 pt-8 pb-7 backdrop-blur-xl"
        style={{ background: 'linear-gradient(180deg, rgba(10,12,18,.6), rgba(4,5,9,.84))', boxShadow: '0 24px 70px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.12)' }}
      >
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
        <Body text={text} reveal={reveal} className="cs-sub min-h-[3.1em] text-[clamp(17px,1.5vw,23px)] leading-[1.5] text-white/95" />
        <Prompt show={showPrompt} />
      </div>
      {children}
    </div>
  );
}
