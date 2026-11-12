import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../game/store';
import { audio } from '../../audio';
import { FruitLogo, VLogo } from './shared';

type Stage = 'post' | 'logo' | 'welcome';

const POST_OLD = [
  'VORONOV BIOS v2.14.1, ACPI BIOS Revision 0412',
  '(C) 2013–2016 Voronov Megatrends, Inc.',
  '',
  'Ноутбук VRN-1540 · Celeron N2840 @ 2.16 ГГц',
  'Проверка памяти: 8192 МБ ............ OK',
  'Диск 0: HDD 500 ГБ, 5400 об/мин ....... OK',
  'Батарея: износ 41% ................ ВНИМАНИЕ',
  'Вентилятор: шумит, но крутится',
  '',
  'Нажмите DEL для входа в SETUP, F12 — меню загрузки',
];

/** VoronovOS / macOS start-up inside the monitor. Click or any key skips. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const [tier] = useState(() => useGame.getState().hero.pcTier);
  const mac = tier === 3;
  const [stage, setStage] = useState<Stage>(mac ? 'logo' : 'post');
  useEffect(() => {
    const plan: [Stage | 'done', number][] = mac
      ? [['done', 2900]]
      : tier === 0
        ? [['logo', 1900], ['welcome', 3200], ['done', 4000]]
        : [['logo', 800], ['welcome', 2000], ['done', 2900]];
    if (mac) audio.sfx('boot_chime');
    else audio.sfx('boot_bios');
    if (tier === 0) audio.sfx('hdd');
    const timers = plan.map(([s, ms]) =>
      setTimeout(() => {
        if (s === 'done') return onDone();
        setStage(s);
        if (s === 'logo') audio.sfx('hdd');
        if (s === 'welcome') audio.sfx('boot_chime');
      }, ms),
    );
    const key = () => onDone();
    window.addEventListener('keydown', key);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <motion.div className="absolute inset-0 z-[2000] cursor-pointer overflow-hidden bg-black text-white" onPointerDown={onDone} exit={{ opacity: 0, transition: { duration: 0.55 } }}>
      {mac ? (
        <div className="flex h-full flex-col items-center justify-center gap-10">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <FruitLogo size={78} className="text-white" />
          </motion.span>
          <div className="h-[5px] w-[200px] overflow-hidden rounded-full bg-white/20">
            <motion.div className="h-full rounded-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.6, ease: [0.35, 0, 0.25, 1] }} />
          </div>
        </div>
      ) : stage === 'post' ? (
        tier === 0 ? (
          <div className="h-full p-6 font-mono text-[13px] leading-[1.6] text-[#C8C8C8]">
            <div className="absolute top-6 right-7 border-2 border-[#C8C8C8]/70 px-3 py-1 text-[22px] font-black tracking-[0.2em] text-[#C8C8C8]/80">VRN</div>
            {POST_OLD.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.14, duration: 0.01 }} className={l.includes('ВНИМАНИЕ') ? 'text-amber-300' : undefined}>
                {l || '\u00A0'}
              </motion.div>
            ))}
            <span className="animate-blink">_</span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="bg-gradient-to-b from-white to-[#8B95A7] bg-clip-text text-[46px] font-black tracking-[0.35em] text-transparent">VORONOV</div>
            <div className="mt-2 text-[11px] tracking-[0.4em] text-white/40">{tier === 2 ? 'PRO WORKSTATION · RYZEN 9' : 'DESKTOP · RYZEN 5'}</div>
            <div className="absolute bottom-6 text-[11px] text-white/35">Нажмите F2 или DEL, чтобы войти в UEFI</div>
          </div>
        )
      ) : stage === 'logo' ? (
        <div className="flex h-full flex-col items-center justify-center gap-14">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-3">
            <VLogo size={84} />
            <div className="text-[13px] font-semibold tracking-[0.45em] text-white/70">VORONOV·OS</div>
          </motion.div>
          <div className="boot-dots">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center bg-[radial-gradient(120%_90%_at_70%_110%,#1d4ed8_0%,#0b1d4a_40%,#030712_80%)]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col items-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-4xl font-bold text-black shadow-[0_10px_40px_-10px_rgba(251,191,36,.6)]">А</span>
            <div className="mt-5 text-[22px] font-semibold">Добро пожаловать, Артём</div>
            <div className="boot-dots mt-8 scale-75">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} />
              ))}
            </div>
          </motion.div>
        </div>
      )}
      <div className="pointer-events-none absolute right-4 bottom-3 text-[10px] text-white/25">клик или любая клавиша — пропустить</div>
    </motion.div>
  );
}
