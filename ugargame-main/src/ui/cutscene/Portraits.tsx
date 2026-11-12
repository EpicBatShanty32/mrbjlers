import { AnimatePresence, motion } from 'framer-motion';
import { CHARACTERS } from '../../game/data/static';
import type { CharacterId } from '../../game/types';

/** Two-shot staging: speaker in focus, previous speaker dimmed on the opposite side. */
export function Staging({ cur, prev, emotion, talking }: { cur: CharacterId | null; prev: CharacterId | null; emotion?: string; talking: boolean }) {
  const slots = [cur && { id: cur, focus: true }, prev && { id: prev, focus: false }].filter(Boolean) as { id: CharacterId; focus: boolean }[];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[12vh] bottom-[8.5vh]">
      <AnimatePresence>
        {slots.map(({ id, focus }) => {
          const left = cur === 'artem' ? focus : !focus;
          return (
            <motion.div key={id} className="absolute bottom-0 flex h-full w-[28vw] items-end justify-center" style={left ? { left: '4vw' } : { right: '4vw' }} initial={{ opacity: 0 }} animate={{ opacity: focus ? 1 : 0.4 }} exit={{ opacity: 0 }}>
              <div className="text-9xl" data-talking={focus && talking} data-emotion={emotion}>{CHARACTERS[id].emoji}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
