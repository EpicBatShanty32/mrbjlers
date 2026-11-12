import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SceneBg } from '../../game/story/cutscenes';
import { Stage } from './fx';
import { RainStreet } from './scenes/street';

function Scene({ bg, cue }: { bg: SceneBg; cue?: string }) {
  switch (bg) {
    case 'rain_street':
      return <RainStreet cue={cue} />;
    default:
      return <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#0b1020,#05070c)' }} />;
  }
}

/** One scene under a slow Ken-Burns camera (parallax layers drift inside). */
export function SceneBackground({ bg, cue }: { bg: SceneBg; cue?: string }) {
  return (
    <Stage>
      <div className="cs-kb">
        <Scene bg={bg} cue={cue} />
      </div>
    </Stage>
  );
}

/** Background changes dissolve through blur + a warm light leak. */
export function SceneBackdrop({ bg, cue }: { bg: SceneBg; cue?: string }) {
  const last = useRef(bg);
  const changes = useRef(0);
  if (last.current !== bg) {
    last.current = bg;
    changes.current++;
  }
  return (
    <>
      <AnimatePresence initial={false}>
        <motion.div
          key={bg}
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'blur(16px) brightness(1.7)' }}
          animate={{ opacity: 1, filter: 'blur(0px) brightness(1)' }}
          exit={{ opacity: 0, filter: 'blur(12px) brightness(1.3)', transition: { duration: 0.9 } }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <SceneBackground bg={bg} cue={cue} />
        </motion.div>
      </AnimatePresence>
      {changes.current > 0 && (
        <motion.div
          key={changes.current}
          className="pointer-events-none absolute inset-0"
          style={{ mixBlendMode: 'screen', background: 'linear-gradient(100deg, transparent 20%, rgba(255,176,96,.6) 42%, rgba(255,96,150,.4) 58%, transparent 80%)' }}
          initial={{ opacity: 0, x: '-45%' }}
          animate={{ opacity: [0, 0.85, 0], x: '45%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      )}
    </>
  );
}
