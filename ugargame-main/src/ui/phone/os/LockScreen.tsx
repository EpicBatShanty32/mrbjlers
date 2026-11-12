import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Cloud, CloudRain, Flashlight, Lock, LockOpen, Moon, Smartphone, Zap } from 'lucide-react';
import { audio } from '../../../audio';
import { useGame } from '../../../game/store';
import { useSettings } from '../../../game/settings';
import type { PhoneNotification } from '../../../game/types';
import { clockStr, fmtRub, fmtUsdt } from '../../../game/util';
import { cn } from '../../common/kit';
import { AppIcon, notifIconId } from './icons';
import { UsdtDot } from './Island';
import { FaceGlyph } from './kit';
import { Wallpaper } from './wallpapers';
import { DEVICES, ORDER_COLOR, ORDER_LABEL, agoStr, calendar, faceScan, openNotif, unlock, useBattery, useLiveOrder, useOS, useTier, weatherOf } from './state';

export function LockScreen() {
  const tier = useTier();
  const dev = DEVICES[tier];
  const now = useGame((s) => Math.floor(s.now));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const dnd = useSettings((s) => s.dnd);
  const face = useOS((s) => s.face);
  const aod = useOS((s) => s.aod);
  const torch = useOS((s) => s.torch);
  const wallpaper = useSettings((s) => s.phoneWallpaper);
  const dragged = useRef(false);
  const [shot, setShot] = useState(0);
  const cal = calendar(now);
  const wx = weatherOf(moscow);
  const authed = face === 'ok' || face === 'ready';
  const fade = { opacity: aod ? 0 : 1, transition: 'opacity .8s' };
  return (
    <motion.div
      className="ios absolute inset-0 z-30 touch-none text-white select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ y: '-100%', transition: { type: 'spring', stiffness: 250, damping: 34 } }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.85, bottom: 0.04 }}
      onDragStart={() => {
        dragged.current = true;
        faceScan();
      }}
      onDragEnd={(_, i) => {
        if (i.offset.y < -110 || i.velocity.y < -550) unlock();
        setTimeout(() => (dragged.current = false), 40);
      }}
      onPointerDown={() => faceScan()}
      onClick={() => !dragged.current && unlock()}
    >
      <Wallpaper id={wallpaper} />
      <motion.div className="pointer-events-none absolute inset-0 bg-black" initial={false} animate={{ opacity: aod ? 0.74 : 0.08 }} transition={{ duration: 1.1 }} />
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: tier ? dev.sb + 2 : 32 }}>
        <div className="flex h-[24px] items-center justify-center" style={fade}>
          {tier === 0 && face === 'scan' ? <FaceGlyph size={24} state="scan" /> : authed ? <LockOpen size={17} strokeWidth={2.4} /> : <Lock size={17} strokeWidth={2.4} />}
        </div>
        <div className="mt-[1.5cqw] flex items-center gap-[2cqw] text-[4.6cqw] font-semibold text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,.3)' }}>
          <span>{cal.wd}, {cal.day} {cal.month}</span>
          <span className="flex items-center gap-1 text-white/80">{wx.rain ? <CloudRain size={15} /> : <Cloud size={15} />}+{wx.t}°</span>
        </div>
        <div className="ios-round os-clock num -mt-[1cqw] text-[25.5cqw] leading-[1.02] font-semibold tracking-[-0.035em]" style={{ opacity: aod ? 0.82 : 1 }}>
          {clockStr(now)}
        </div>
        {dnd && (
          <div className="lg-btn mt-[0.5cqw] flex items-center gap-1.5 rounded-full px-3 py-1 text-[3.3cqw] font-semibold">
            <Moon size={12} fill="#BF5AF2" strokeWidth={0} /> Не беспокоить
          </div>
        )}
        <Widgets />
      </div>

      <div className="no-scrollbar absolute inset-x-[3cqw] flex flex-col gap-[2.2cqw] overflow-y-auto pb-1" style={{ top: '49%', bottom: '25cqw', opacity: aod ? 0.5 : 1, transition: 'opacity .8s' }}>
        <div className="mt-auto" />
        <LiveActivity />
        <Notifications now={now} />
      </div>

      <div className="absolute inset-x-[10cqw] bottom-[9.5cqw] flex justify-between" style={{ ...fade, pointerEvents: aod ? 'none' : undefined }}>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            audio.sfx('ui_toggle');
            useOS.getState().set({ torch: !torch });
          }}
          className={cn('flex h-[13.5cqw] w-[13.5cqw] items-center justify-center rounded-full transition-transform active:scale-110', torch ? 'bg-white text-black' : 'lg-btn text-white')}
          title="Фонарик"
        >
          <Flashlight size={21} fill={torch ? '#000' : 'none'} />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            audio.sfx('shutter');
            setShot(Date.now());
          }}
          className="lg-btn flex h-[13.5cqw] w-[13.5cqw] items-center justify-center rounded-full text-white transition-transform active:scale-110"
          title="Камера"
        >
          <Camera size={21} />
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-[4.6cqw] text-center text-[3.5cqw] font-medium" style={fade}>
        <span className={authed ? 'text-white/90' : 'os-shimmer'}>{authed ? 'Смахните вверх, чтобы открыть' : 'Смахните вверх, чтобы разблокировать'}</span>
      </div>
      <AnimatePresence>
        {shot > 0 && (
          <motion.div key={shot} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} onAnimationComplete={() => setShot(0)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Ring({ v, children }: { v: number; children: ReactNode }) {
  return (
    <div className="lg-btn relative flex h-[15cqw] w-[15cqw] items-center justify-center rounded-full">
      {v >= 0 && (
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16.4" stroke="rgba(255,255,255,.22)" strokeWidth="2.8" />
          <circle cx="20" cy="20" r="16.4" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeDasharray={`${v * 103} 200`} />
        </svg>
      )}
      <div className="relative flex flex-col items-center gap-[0.6cqw] leading-none">{children}</div>
    </div>
  );
}

function Widgets() {
  const battery = useBattery();
  const energy = useGame((s) => Math.round(s.hero.energy));
  const rate = useGame((s) => s.market.base.toFixed(1).replace('.', ','));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const aod = useOS((s) => s.aod);
  const wx = weatherOf(moscow);
  return (
    <div className="mt-[2.4cqw] flex gap-[3.2cqw]" style={{ opacity: aod ? 0.6 : 1, transition: 'opacity .8s' }}>
      <Ring v={battery / 100}>
        <Smartphone size={12} />
        <span className="num text-[3.3cqw] font-semibold">{battery}</span>
      </Ring>
      <Ring v={energy / 100}>
        <Zap size={12} fill="currentColor" />
        <span className="num text-[3.3cqw] font-semibold">{energy}</span>
      </Ring>
      <Ring v={-1}>
        {wx.rain ? <CloudRain size={13} /> : <Cloud size={13} />}
        <span className="text-[4.2cqw] font-semibold">{wx.t}°</span>
      </Ring>
      <Ring v={-1}>
        <span className="text-[2.9cqw] font-bold text-white/75">USDT</span>
        <span className="num text-[3.6cqw] font-semibold">{rate}</span>
      </Ring>
    </div>
  );
}

function LiveActivity() {
  const o = useLiveOrder();
  if (!o) return null;
  const c = ORDER_COLOR[o.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg-dark shrink-0 rounded-[24px] p-[3.6cqw]">
      <div className="flex items-center gap-[2.6cqw]">
        <UsdtDot size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[3.2cqw] text-white/60">{o.ex === 'rapira' ? 'Rapira' : 'Bybit'} P2P · {o.side === 'buy' ? 'Покупка' : 'Продажа'} · {fmtRub(o.rub)}</div>
          <div className="truncate text-[4.2cqw] font-semibold">{fmtUsdt(o.usdt)}</div>
        </div>
        <div className="text-right">
          <div className="num text-[5.4cqw] leading-none font-semibold" style={{ color: c }}>{o.t}</div>
          <div className="mt-0.5 text-[2.9cqw]" style={{ color: c }}>{ORDER_LABEL[o.status]}</div>
        </div>
      </div>
      {o.frac >= 0 && (
        <div className="mt-[2.6cqw] h-[4px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full" style={{ width: `${o.frac * 100}%`, background: c }} />
        </div>
      )}
    </motion.div>
  );
}

function Notifications({ now }: { now: number }) {
  const json = useGame((s) => JSON.stringify(s.notifications.filter((n) => !n.read).slice(0, 30)));
  const groups = useMemo(() => {
    const m = new Map<string, PhoneNotification[]>();
    for (const n of JSON.parse(json) as PhoneNotification[]) {
      const k = n.app === 'system' ? notifIconId(n.app, n.title) : n.app;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(n);
    }
    return [...m.entries()];
  }, [json]);
  const [open, setOpen] = useState<string | null>(null);
  const shown = groups.slice(0, 4);
  const more = groups.slice(4).reduce((a, [, l]) => a + l.length, 0);
  const tap = (n: PhoneNotification) => unlock(() => openNotif(n));
  return (
    <>
      <AnimatePresence initial={false}>
        {shown.map(([k, items]) => {
          const expanded = open === k && items.length > 1;
          const list = expanded ? items.slice(0, 6) : items.slice(0, 1);
          return (
            <motion.div key={k} layout initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="relative shrink-0" style={{ marginBottom: !expanded && items.length > 1 ? (items.length > 2 ? '3.2cqw' : '1.8cqw') : 0 }}>
              {expanded && (
                <div className="mb-[1.6cqw] flex items-center justify-between px-1 text-[3.6cqw] font-semibold text-white/90">
                  <span>{items.length} уведомл.</span>
                  <button type="button" onClick={(e) => (e.stopPropagation(), setOpen(null))} className="lg-btn rounded-full px-2.5 py-0.5 text-[3.1cqw]">Свернуть</button>
                </div>
              )}
              <div className="flex flex-col gap-[1.6cqw]">
                {list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!expanded && items.length > 1) setOpen(k);
                      else tap(n);
                    }}
                    className="lg-dark relative z-10 flex w-full gap-[2.6cqw] rounded-[22px] p-[3cqw] text-left"
                  >
                    <AppIcon id={notifIconId(n.app, n.title)} size="9.4cqw" radius="24%" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[3.7cqw] font-semibold">{n.title}</span>
                        <span className="shrink-0 text-[3cqw] text-white/55">{agoStr(now, n.at)}</span>
                      </div>
                      <div className="line-clamp-2 text-[3.55cqw] leading-snug text-white/85">{n.body}</div>
                      {!expanded && items.length > 1 && <div className="mt-0.5 text-[3cqw] text-white/50">Ещё {items.length - 1}</div>}
                    </div>
                  </button>
                ))}
              </div>
              {!expanded && items.length > 1 && <div className="lg-dark absolute inset-x-[3.5cqw] -bottom-[1.8cqw] h-8 rounded-b-[18px] opacity-80" />}
              {!expanded && items.length > 2 && <div className="lg-dark absolute inset-x-[7cqw] -bottom-[3.2cqw] -z-10 h-8 rounded-b-[16px] opacity-50" />}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {more > 0 && <div className="lg-btn mx-auto shrink-0 rounded-full px-3 py-1 text-[3.2cqw] font-semibold">Ещё {more} уведомл.</div>}
    </>
  );
}
