import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useGame } from '../../../game/store';
import type { PcAppId } from '../../../game/types';
import { audio } from '../../../audio';
import { openSettings } from '../../settings/store';
import { AppIcon, MAC_NAME, type IconId } from '../apps';
import { iconRef } from '../shared';

const APPS: PcAppId[] = ['files', 'browser', 'calc', 'notes'];

/** macOS Dock with hover magnification (motion values only — no React state per frame). */
export default function Dock() {
  const mouseX = useMotionValue(Infinity);
  const shop = useGame((s) => s.chapter >= 2);
  const extra: IconId[] = shop ? ['settings', 'shop'] : ['settings'];
  return (
    <div className="relative z-[350] flex h-[68px] shrink-0 items-end justify-center pb-[7px]">
      <div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex h-[58px] items-end gap-[5px] rounded-[19px] bg-white/[.14] px-[7px] pb-[5px] ring-1 ring-white/20 backdrop-blur-2xl backdrop-saturate-150"
        style={{ boxShadow: 'inset 0 .5px 0 rgba(255,255,255,.35), 0 12px 40px -10px rgba(0,0,0,.75)' }}
      >
        {APPS.map((id) => (
          <DockIcon key={id} id={id} mouseX={mouseX} />
        ))}
        <div className="mx-[3px] mb-[3px] h-[42px] w-px self-end bg-white/25" />
        {extra.map((id) => (
          <DockIcon key={id} id={id} mouseX={mouseX} />
        ))}
      </div>
    </div>
  );
}

function DockIcon({ id, mouseX }: { id: IconId; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const app = id !== 'settings' && id !== 'shop' ? (id as PcAppId) : null;
  const running = useGame((s) => (app ? s.ui.windows[app].open : false));
  const [jump, setJump] = useState(0);
  const dist = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect();
    return b ? x - b.left - b.width / 2 : Infinity;
  });
  const size = useSpring(
    useTransform(dist, [-150, 0, 150], [46, 72, 46]),
    { mass: 0.1, stiffness: 190, damping: 15 },
  );
  const label = app ? MAC_NAME[app] : id === 'settings' ? 'Системные настройки' : 'Магазин имущества';
  const click = () => {
    const g = useGame.getState();
    audio.sfx('ui_click');
    if (id === 'settings') return openSettings();
    if (id === 'shop') {
      g.setBrowserTab('shop');
      if (!g.ui.windows.browser.open) setJump((n) => n + 1);
      return g.openWindow('browser');
    }
    if (!g.ui.windows[app!].open) {
      setJump((n) => n + 1);
      g.openWindow(app!);
    } else g.focusWindow(app!);
  };
  return (
    <motion.button
      ref={(el: HTMLButtonElement | null) => {
        ref.current = el;
        return app && el ? iconRef(app)(el) : undefined;
      }}
      onClick={click}
      style={{ width: size, height: size }}
      className="group relative flex shrink-0 items-end justify-center outline-none"
    >
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-[#2A2A30]/90 px-2.5 py-1 text-[12px] whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-black/40 backdrop-blur-xl transition-opacity duration-150 group-hover:opacity-100">{label}</span>
      <motion.span key={jump} animate={jump ? { y: [0, -18, 0, -8, 0] } : undefined} transition={{ duration: 0.9, ease: 'easeOut' }} className="block h-full w-full">
        <AppIcon id={id} skin="mac" size={46} className="h-full w-full" />
      </motion.span>
      {running && <span className="absolute -bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/85" />}
    </motion.button>
  );
}
