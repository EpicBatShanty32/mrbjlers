import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Monitor as MonitorIcon } from 'lucide-react';
import { useGame } from './game/store';
import { useSettings } from './game/settings';
import TitleScreen from './ui/TitleScreen';
import Desktop from './ui/shell/Desktop';
import Taskbar from './ui/shell/Taskbar';
import QuestBar from './ui/shell/QuestBar';
import Phone from './ui/shell/Phone';
import { ChapterCard, Cutscene, EndingScreen } from './ui/cutscene/Cutscene';
import { useGameLoop, useSoundEffects } from './ui/common/hooks';
import { useAudioDirector } from './audio';
import { cn } from './ui/common/kit';
import SettingsModal from './ui/settings/SettingsModal';
import Boot from './ui/os/Boot';
import { DesktopWallpaper } from './ui/os/Wallpaper';
import MenuBar from './ui/os/mac/MenuBar';
import Dock from './ui/os/mac/Dock';
import { Hello, Spotlight } from './ui/os/mac/Spotlight';

export default function App() {
  useAudioDirector();
  const hydrated = useGame((s) => s.hydrated);
  const menu = useGame((s) => s.menu || !s.started);
  const reduce = useSettings((s) => s.reduceMotion);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1100 || window.innerHeight < 600);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 1100 || window.innerHeight < 600);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  if (!hydrated) return <div className="h-full bg-[#07090E]" />;
  if (narrow && !forced)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#07090E] p-8 text-center text-white">
        <MonitorIcon size={42} className="text-emerald-300" />
        <div className="text-xl font-bold">P2P: С НУЛЯ</div>
        <div className="max-w-sm text-sm text-white/60">Игра — это рабочий стол из компьютера и телефона. Откройте её на экране от 1280×720 или разверните окно браузера.</div>
        <button onClick={() => setForced(true)} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white/80">
          Всё равно открыть
        </button>
      </div>
    );
  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      <div className={cn('h-full w-full', reduce && 'reduce-motion')}>
        {menu ? <TitleScreen /> : <Game />}
        <SettingsModal />
      </div>
    </MotionConfig>
  );
}

function Game() {
  useGameLoop();
  useSoundEffects();
  const tier = useGame((s) => s.hero.pcTier);
  const mac = tier === 3;
  // Boot only when entering the game outside of a story scene.
  const [boot, setBoot] = useState(() => useSettings.getState().bootIntro && !useGame.getState().cutscene);
  return (
    <div className="flex h-full w-full gap-3 bg-[#07090E] p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <Monitor tier={tier}>
          <DesktopWallpaper />
          {mac && <MenuBar />}
          <div className="relative min-h-0 flex-1">
            <Desktop />
          </div>
          <QuestBar />
          {mac ? <Dock /> : <Taskbar />}
          {mac && <Spotlight />}
          {mac && !boot && <Hello />}
          <AnimatePresence>{boot && <Boot key="boot" onDone={() => setBoot(false)} />}</AnimatePresence>
        </Monitor>
      </div>
      <div className="h-full shrink-0">
        <Phone />
      </div>
      <Cutscene />
      <ChapterCard />
      <EndingScreen />
    </div>
  );
}

/** The physical screen: worn laptop → monitor → RGB workstation → aluminium Studio Display. */
function Monitor({ tier, children }: { tier: number; children: ReactNode }) {
  const screen = (r: string) => <div className={cn('relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-black', r)}>{children}</div>;
  if (tier === 3)
    return (
      <div className="relative flex min-h-0 flex-1 flex-col rounded-[20px] bg-gradient-to-b from-[#E6E8EB] via-[#BCC0C6] to-[#8E949C] p-[2.5px] shadow-[0_26px_70px_-22px_rgba(0,0,0,.95)]">
        <div className="relative flex min-h-0 flex-1 flex-col rounded-[17.5px] bg-black p-[11px]">{screen('rounded-[7px]')}</div>
      </div>
    );
  if (tier === 2)
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="rgb-glow pointer-events-none absolute -inset-2 rounded-[22px] bg-[conic-gradient(from_0deg,#22d3ee,#a855f7,#f43f5e,#f59e0b,#22c55e,#22d3ee)] opacity-30 blur-2xl" />
        <div className="relative flex min-h-0 flex-1 flex-col rounded-[12px] bg-[#0C0E13] p-[5px] pb-[13px] shadow-[0_20px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/[.06]">
          {screen('rounded-[6px]')}
          <div className="pointer-events-none absolute bottom-[2px] left-1/2 -translate-x-1/2 text-[7px] tracking-[0.4em] text-white/25">VORONOV PRO</div>
        </div>
      </div>
    );
  if (tier === 1)
    return (
      <div className="relative flex min-h-0 flex-1 flex-col rounded-[14px] bg-gradient-to-b from-[#20242d] to-[#101319] p-[9px] pb-[16px] shadow-[0_20px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/5">
        {screen('rounded-[6px]')}
        <div className="pointer-events-none absolute bottom-[3px] left-1/2 -translate-x-1/2 text-[8px] tracking-[0.35em] text-white/25">VORONOV</div>
      </div>
    );
  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-[18px] bg-gradient-to-b from-[#2B2E35] to-[#16181D] p-[13px] pb-[24px] shadow-[0_20px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/[.06]">
      <div className="pointer-events-none absolute top-[4px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#090a0d] ring-1 ring-white/10" />
      {screen('rounded-[4px]')}
      <div className="pointer-events-none absolute bottom-[6px] left-1/2 -translate-x-1/2 text-[8px] tracking-[0.35em] text-white/25">VORONOV</div>
      <div className="pointer-events-none absolute right-8 bottom-[6px] rounded-[2px] bg-gradient-to-br from-sky-600 to-sky-900 px-1 text-[6px] leading-[10px] text-white/60">VRN inside</div>
    </div>
  );
}
