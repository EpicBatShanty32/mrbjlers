import { useEffect, useRef, type RefObject } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, usePresence, useTransform } from 'framer-motion';
import { getSettings, useSettings } from '../../../game/settings';
import type { PhoneAppId } from '../../../game/types';
import BankApp from '../BankApp';
import TelegramApp from '../TelegramApp';
import AvitoApp from '../AvitoApp';
import WalletApp from '../WalletApp';
import AuthApp from '../AuthApp';
import SettingsApp from './SettingsApp';
import MusicApp from './MusicApp';
import { IconArt } from './icons';
import { CHROME, DEVICES, homeScale, useTier } from './state';

interface Rect { x: number; y: number; w: number; h: number; W: number; H: number }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the app's home-screen icon rests (screen coords, home scale undone). */
function iconRect(screen: HTMLElement | null, app: PhoneAppId): Rect {
  const W = screen?.clientWidth || 375, H = screen?.clientHeight || 780;
  const fallback = { x: W / 2 - 30, y: H * 0.45, w: 60, h: 60, W, H };
  const el = screen?.querySelector(`[data-icon="${app}"]`);
  if (!screen || !el) return fallback;
  const s = screen.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = homeScale.get() || 1, cx = s.left + s.width / 2, cy = s.top + s.height / 2;
  const x = cx + (r.left - cx) / k - s.left, y = cy + (r.top - cy) / k - s.top, w = r.width / k;
  return x + w < 0 || x > W ? fallback : { x, y, w, h: r.height / k, W, H };
}

function AppContent({ app }: { app: PhoneAppId }) {
  switch (app) {
    case 'sber': case 'tbank': case 'alfa': return <BankApp bank={app} />;
    case 'telegram': return <TelegramApp />;
    case 'avito': return <AvitoApp />;
    case 'wallet': return <WalletApp />;
    case 'auth': return <AuthApp />;
    case 'settings': return <SettingsApp />;
    case 'music': return <MusicApp />;
  }
}

/** Apps zoom out of their icon with an iOS spring and shrink back into it on close. */
export function AppLayer({ app, screen }: { app: PhoneAppId | null; screen: RefObject<HTMLDivElement | null> }) {
  const first = useRef(true);
  useEffect(() => {
    const c = animate(homeScale, app ? 0.9 : 1, getSettings().reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 });
    first.current = false;
    return () => c.stop();
  }, [app]);
  return <AnimatePresence>{app && <AppWindow key={app} app={app} screen={screen} instant={first.current} />}</AnimatePresence>;
}

function AppWindow({ app, screen, instant }: { app: PhoneAppId; screen: RefObject<HTMLDivElement | null>; instant: boolean }) {
  const [present, safeToRemove] = usePresence();
  const reduce = useSettings((s) => s.reduceMotion);
  const dev = DEVICES[useTier()];
  const chrome = CHROME[app];
  const rect = useRef<Rect>(iconRect(screen.current, app));
  const p = useMotionValue(instant ? 1 : 0);
  useEffect(() => {
    if (present) {
      const c = animate(p, 1, reduce ? { duration: 0.18 } : { type: 'spring', stiffness: 210, damping: 26, mass: 0.95, restDelta: 0.001 });
      return () => c.stop();
    }
    rect.current = iconRect(screen.current, app);
    const c = animate(p, 0, reduce ? { duration: 0.16 } : { type: 'spring', stiffness: 290, damping: 31, restDelta: 0.002 });
    c.then(() => safeToRemove?.());
    return () => c.stop();
  }, [present]); // eslint-disable-line react-hooks/exhaustive-deps

  const clip = useTransform(p, (v) => {
    const r = rect.current, k = 1 - v;
    const rad = lerp(r.w * 0.23, dev.screenR, Math.min(1, Math.max(0, v)));
    return `inset(${r.y * k}px ${(r.W - r.x - r.w) * k}px ${(r.H - r.y - r.h) * k}px ${r.x * k}px round ${rad}px)`;
  });
  const scale = useTransform(p, (v) => lerp(rect.current.w / rect.current.W, 1, v));
  const origin = useTransform(p, () => `${rect.current.x + rect.current.w / 2}px ${rect.current.y + rect.current.h / 2}px`);
  const ox = useTransform(p, (v) => rect.current.x * (1 - v));
  const oy = useTransform(p, (v) => rect.current.y * (1 - v));
  const ow = useTransform(p, (v) => lerp(rect.current.w, rect.current.W, v));
  const oh = useTransform(p, (v) => lerp(rect.current.h, rect.current.H, v));
  const iconOpacity = useTransform(p, [0, 0.38], [1, 0]);

  return (
    <motion.div className="absolute inset-0 z-20 overflow-hidden" style={{ ...(reduce ? { opacity: p } : { clipPath: clip }), pointerEvents: present ? 'auto' : 'none' }}>
      <motion.div className="absolute inset-0 flex flex-col bg-black" style={reduce ? undefined : { scale, transformOrigin: origin }}>
        <div className="shrink-0" style={{ height: dev.sb, background: chrome.top }} />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AppContent app={app} />
        </div>
        <div className="shrink-0" style={{ height: 22, background: chrome.bottom }} />
      </motion.div>
      {!reduce && (
        <motion.div className="pointer-events-none absolute" style={{ left: ox, top: oy, width: ow, height: oh, opacity: iconOpacity }}>
          <IconArt id={app} />
        </motion.div>
      )}
    </motion.div>
  );
}
