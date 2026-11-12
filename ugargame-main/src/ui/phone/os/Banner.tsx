import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../../game/store';
import { getSettings } from '../../../game/settings';
import type { PhoneNotification } from '../../../game/types';
import { AppIcon, notifAppName, notifIconId } from './icons';
import { APP_OF, DEVICES, islandFlash, openNotif, useOS, useTier } from './state';

/** Incoming notification: Liquid Glass banner dropping out of the Dynamic Island (or the island itself when locked). */
export function Banner() {
  const tier = useTier();
  const json = useGame((s) => JSON.stringify(s.notifications[0] ?? null));
  const n = useMemo(() => JSON.parse(json) as PhoneNotification | null, [json]);
  const [shown, setShown] = useState<PhoneNotification | null>(null);
  const seen = useRef<string | null>(n?.id ?? null);
  const hover = useRef(false);
  useEffect(() => {
    if (!n || n.id === seen.current) return;
    seen.current = n.id;
    const s = useGame.getState();
    const o = useOS.getState();
    if (o.aod) o.set({ aod: false });
    if (getSettings().dnd) return; // Focus: recorded in Notification Center, no banner
    if (s.ui.phoneLocked) {
      if (DEVICES[s.hero.phoneTier].island) islandFlash(n);
      return;
    }
    const target = APP_OF[n.app];
    if (target && s.ui.phoneApp === target && (target !== 'telegram' || s.ui.tgChat === n.link)) return;
    if (o.nc) return;
    setShown(n);
  }, [n]);
  useEffect(() => {
    if (!shown) return;
    const t = setInterval(() => !hover.current && setShown(null), 4200);
    return () => clearInterval(t);
  }, [shown]);

  const island = DEVICES[tier].island;
  const top = island ? 52 : 32;
  const from = island ? { opacity: 0, y: -(top - 14), scaleX: 0.34, scaleY: 0.3 } : { opacity: 0, y: -110, scaleX: 1, scaleY: 1 };
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.id}
          role="button"
          className="ios lg-dark absolute inset-x-[2.4cqw] z-[60] flex cursor-pointer gap-[2.8cqw] rounded-[24px] p-[3cqw] text-left text-white"
          style={{ top, transformOrigin: '50% 0%' }}
          initial={from}
          animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
          exit={from}
          transition={{ type: 'spring', stiffness: 430, damping: 31 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.7, bottom: 0.12 }}
          onDragEnd={(_, i) => i.offset.y < -24 && setShown(null)}
          onMouseEnter={() => (hover.current = true)}
          onMouseLeave={() => (hover.current = false)}
          onClick={() => {
            openNotif(shown);
            setShown(null);
          }}
        >
          <AppIcon id={notifIconId(shown.app, shown.title)} size="10.4cqw" radius="24%" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[3.8cqw] font-semibold">{shown.title}</span>
              <span className="shrink-0 text-[3cqw] text-white/50">сейчас</span>
            </div>
            <div className="line-clamp-2 text-[3.6cqw] leading-snug text-white/85">{shown.body}</div>
            <div className="mt-[0.6cqw] text-[2.9cqw] text-white/40">{notifAppName(shown.app, shown.title)}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
