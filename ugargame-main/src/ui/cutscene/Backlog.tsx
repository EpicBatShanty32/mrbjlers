import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { CHARACTERS } from '../../game/data/static';
import type { CharacterId } from '../../game/types';
import type { Speaker } from '../../game/story/cutscenes';
import { thoughtColor } from './Subtitles';

export interface LogEntry { who: Speaker; text: string; chosen?: string }

/** «Журнал»: everything said so far in this scene. */
export function Backlog({ entries, onClose }: { entries: LogEntry[]; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), []);
  return (
    <motion.div className="absolute inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => (e.stopPropagation(), onClose())}>
      <motion.aside
        className="flex h-full w-[min(560px,94vw)] flex-col border-l border-white/10 bg-[#0b0e15]/95 shadow-2xl"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-[13px] font-semibold tracking-[0.35em] text-amber-200/90 uppercase">Журнал</div>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {entries.map((e, i) => {
            const ch = e.who === 'narrator' || e.who === 'thought' ? null : CHARACTERS[e.who as CharacterId];
            const color = e.who === 'thought' ? thoughtColor : ch?.color;
            return (
              <div key={i}>
                <div className="mb-0.5 text-[12px] font-bold tracking-wider uppercase" style={{ color: color ?? 'rgba(255,255,255,.4)' }}>
                  {e.who === 'narrator' ? 'Рассказчик' : e.who === 'thought' ? 'Артём · мысли' : ch?.short}
                </div>
                <div className={e.who === 'narrator' || e.who === 'thought' ? 'text-[15px] leading-relaxed text-white/70 italic' : 'text-[15px] leading-relaxed text-white/90'}>{e.text}</div>
                {e.chosen && (
                  <div className="mt-2 rounded-lg border border-amber-200/25 bg-amber-200/8 px-3 py-2 text-[14px] text-amber-100">
                    <span className="mr-2 text-[11px] font-bold tracking-widest text-amber-300 uppercase">Выбор</span>
                    {e.chosen}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={end} />
        </div>
      </motion.aside>
    </motion.div>
  );
}
