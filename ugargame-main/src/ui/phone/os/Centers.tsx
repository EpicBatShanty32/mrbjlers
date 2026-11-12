import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Antenna, BatteryLow, Bluetooth, Calculator, Camera, Flashlight, Lock, Moon, Pause, Plane, Play, ScreenShare, SkipBack, SkipForward, Sun, Volume2, Wifi, X } from 'lucide-react';
import { audio } from '../../../audio';
import { useGame } from '../../../game/store';
import { useSettings } from '../../../game/settings';
import type { PhoneNotification } from '../../../game/types';
import { clockStr } from '../../../game/util';
import { cn } from '../../common/kit';
import { Cover } from './cover';
import { AppIcon, notifAppName, notifIconId } from './icons';
import { useNowPlaying } from './Island';
import { VSlider } from './kit';
import { DEVICES, agoStr, calendar, openNotif, useOS, useTier, type OsState } from './state';

const setOS = (p: Partial<OsState>) => useOS.getState().set(p);
const stop = (f: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  f();
};

/** Invisible pull-down zones over the status bar: left/centre → Notification Center, right → Control Center. */
export function TopZones() {
  const locked = useGame((s) => s.ui.phoneLocked);
  const sb = DEVICES[useTier()].sb;
  const y0 = useRef(0);
  const fired = useRef(false);
  const open = (which: 'cc' | 'nc') => {
    fired.current = true;
    audio.sfx('ui_open');
    setOS({ cc: which === 'cc', nc: which === 'nc', island: '' });
  };
  const zone = (which: 'cc' | 'nc') => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      y0.current = e.clientY;
      fired.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fired.current && e.currentTarget.hasPointerCapture(e.pointerId) && e.clientY - y0.current > 12) open(which);
    },
    onClick: () => !fired.current && open(which),
  });
  return (
    <>
      {!locked && <div {...zone('nc')} className="absolute top-0 left-0 z-[44] cursor-pointer" style={{ height: sb, width: '62%' }} title="Центр уведомлений" />}
      <div {...zone('cc')} className="absolute top-0 right-0 z-[44] cursor-pointer" style={{ height: sb, width: '38%' }} title="Пункт управления" />
    </>
  );
}

function Circ({ on, color, onClick, children, title }: { on: boolean; color: string; onClick: () => void; children: ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={stop(() => {
        audio.sfx('ui_toggle');
        onClick();
      })}
      className="flex h-[14cqw] w-[14cqw] items-center justify-center rounded-full text-white transition-[background,transform] active:scale-90"
      style={{ background: on ? color : 'rgba(255,255,255,.16)' }}
    >
      {children}
    </button>
  );
}

function Sq({ on = false, tint = '#000', onClick, children, title }: { on?: boolean; tint?: string; onClick?: () => void; children: ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={stop(() => {
        audio.sfx('ui_toggle');
        onClick?.();
      })}
      className={cn('flex items-center justify-center rounded-full transition-[background,transform] active:scale-90', on ? 'bg-white' : 'lg-btn text-white')}
      style={{ color: on ? tint : undefined }}
    >
      {children}
    </button>
  );
}

export function ControlCenter() {
  const open = useOS((s) => s.cc);
  return <AnimatePresence>{open && <CC key="cc" />}</AnimatePresence>;
}

function CC() {
  const dev = DEVICES[useTier()];
  const o = useOS();
  const bright = useSettings((s) => s.phoneBrightness);
  const vol = useSettings((s) => s.master);
  const dnd = useSettings((s) => s.dnd);
  const { info, playing, snap } = useNowPlaying();
  const toggle = (k: 'air' | 'cell' | 'wifi' | 'bt' | 'torch' | 'rotLock' | 'lowPower') => () => setOS({ [k]: !o[k] });
  const playPause = () => (!snap.track ? audio.player.play(audio.tracks()[0].id) : playing ? audio.player.pause() : audio.player.resume());
  return (
    <motion.div className="ios absolute inset-0 z-[70] text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOS({ cc: false })}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.34)', backdropFilter: 'blur(26px) saturate(150%)', WebkitBackdropFilter: 'blur(26px) saturate(150%)' }} />
      <motion.div
        className="relative grid grid-cols-4 gap-[3.4cqw] px-[6.5cqw]"
        style={{ paddingTop: dev.sb + 24, gridAutoRows: '19.3cqw', gridAutoFlow: 'row dense', transformOrigin: '88% 0%' }}
        initial={{ scale: 1.1, y: -24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 1.06, y: -18, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-btn col-span-2 row-span-2 grid grid-cols-2 place-items-center rounded-[7.5cqw] p-[2.4cqw]">
          <Circ title="Авиарежим" on={o.air} color="#FF9F0A" onClick={toggle('air')}><Plane size={21} fill="currentColor" strokeWidth={0} /></Circ>
          <Circ title="Сотовые данные" on={o.cell && !o.air} color="#30D158" onClick={toggle('cell')}><Antenna size={21} /></Circ>
          <Circ title="Wi-Fi" on={o.wifi} color="#0A84FF" onClick={toggle('wifi')}><Wifi size={21} strokeWidth={2.4} /></Circ>
          <Circ title="Bluetooth" on={o.bt} color="#0A84FF" onClick={toggle('bt')}><Bluetooth size={21} strokeWidth={2.4} /></Circ>
        </div>
        <div className="lg-btn col-span-2 row-span-2 flex flex-col rounded-[7.5cqw] p-[3.4cqw]">
          <div className="flex items-start gap-[2.4cqw]">
            {info ? <Cover id={info.id} size="11.5cqw" radius="22%" /> : <div className="h-[11.5cqw] w-[11.5cqw] rounded-[2.6cqw] bg-white/15" />}
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[3.4cqw] leading-tight font-semibold">{info?.title ?? 'Не исполняется'}</div>
              <div className="truncate text-[3.1cqw] text-white/60">{info ? (snap.manual ? info.artist : 'Адаптивный саундтрек') : 'Музыка'}</div>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-around">
            <button type="button" onClick={stop(() => audio.player.prev())}><SkipBack size={20} fill="#fff" /></button>
            <button type="button" onClick={stop(playPause)}>{playing ? <Pause size={28} fill="#fff" /> : <Play size={28} fill="#fff" />}</button>
            <button type="button" onClick={stop(() => audio.player.next())}><SkipForward size={20} fill="#fff" /></button>
          </div>
        </div>
        <button
          type="button"
          onClick={stop(() => {
            audio.sfx('ui_toggle');
            useSettings.getState().set({ dnd: !dnd });
          })}
          className={cn('col-span-2 flex items-center gap-[2.4cqw] rounded-full px-[2.6cqw] text-left transition-colors', dnd ? 'bg-white text-black' : 'lg-btn')}
        >
          <span className={cn('flex h-[10.5cqw] w-[10.5cqw] shrink-0 items-center justify-center rounded-full', dnd ? 'bg-[#5E5CE6] text-white' : 'bg-white/15')}>
            <Moon size={18} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="min-w-0">
            <span className="block text-[3.2cqw] leading-tight font-semibold">{dnd ? 'Не беспокоить' : 'Фокусирование'}</span>
            <span className="block text-[3cqw] opacity-60">{dnd ? 'Вкл.' : 'Выкл.'}</span>
          </span>
        </button>
        <Sq title="Блокировка ориентации" on={o.rotLock} tint="#FF453A" onClick={toggle('rotLock')}><Lock size={21} /></Sq>
        <Sq title="Повтор экрана"><ScreenShare size={21} /></Sq>
        <div className="row-span-2"><VSlider value={bright} min={0.35} max={1} onChange={(v) => useSettings.getState().set({ phoneBrightness: v })} icon={<Sun size={22} />} /></div>
        <div className="row-span-2"><VSlider value={vol} onChange={(v) => useSettings.getState().set({ master: v, muted: false })} icon={<Volume2 size={22} fill="currentColor" />} /></div>
        <Sq title="Фонарик" on={o.torch} onClick={toggle('torch')}><Flashlight size={21} fill={o.torch ? '#000' : 'none'} /></Sq>
        <Sq title="Энергосбережение" on={o.lowPower} tint="#c99a00" onClick={toggle('lowPower')}><BatteryLow size={22} /></Sq>
        <Sq title="Калькулятор (на компьютере)" onClick={() => useGame.getState().openWindow('calc')}><Calculator size={21} /></Sq>
        <Sq title="Камера" onClick={() => audio.sfx('shutter')}><Camera size={21} /></Sq>
      </motion.div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const open = useOS((s) => s.nc);
  return <AnimatePresence>{open && <NC key="nc" />}</AnimatePresence>;
}

function NC() {
  const dev = DEVICES[useTier()];
  const now = useGame((s) => Math.floor(s.now));
  const json = useGame((s) => JSON.stringify(s.notifications.slice(0, 40)));
  const list = useMemo(() => JSON.parse(json) as PhoneNotification[], [json]);
  const [confirm, setConfirm] = useState(false);
  const cal = calendar(now);
  return (
    <motion.div className="ios absolute inset-0 z-[70] overflow-hidden text-white" initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }} onClick={() => setOS({ nc: false })}>
      <div className="absolute inset-0" style={{ background: 'rgba(8,10,22,.5)', backdropFilter: 'blur(30px) saturate(160%)', WebkitBackdropFilter: 'blur(30px) saturate(160%)' }} />
      <div className="relative flex h-full flex-col" style={{ paddingTop: dev.sb }}>
        <div className="text-center">
          <div className="text-[4.4cqw] font-semibold text-white/85">{cal.wd}, {cal.day} {cal.month}</div>
          <div className="ios-round os-clock num text-[21cqw] leading-none font-semibold tracking-[-0.035em]">{clockStr(now)}</div>
        </div>
        <div className="mt-[4cqw] flex items-center justify-between px-[4.5cqw]">
          <span className="text-[5.2cqw] font-bold">Уведомления</span>
          {list.length > 0 && (
            <button
              type="button"
              onClick={stop(() => {
                if (!confirm) return setConfirm(true);
                useGame.getState().act((d) => void (d.notifications = []));
                setConfirm(false);
              })}
              className="lg-btn flex h-[7.6cqw] min-w-[7.6cqw] items-center justify-center rounded-full px-[2cqw] text-[3.4cqw] font-semibold"
              title="Очистить"
            >
              {confirm ? 'Очистить' : <X size={15} strokeWidth={2.6} />}
            </button>
          )}
        </div>
        <div className="no-scrollbar mt-[2.4cqw] flex-1 space-y-[2cqw] overflow-y-auto px-[3cqw] pb-[12cqw]">
          {list.length === 0 ? (
            <div className="pt-[22cqw] text-center text-[3.8cqw] text-white/50">Нет старых уведомлений</div>
          ) : (
            list.map((n) => (
              <button key={n.id} type="button" onClick={stop(() => openNotif(n))} className="lg-dark flex w-full gap-[2.6cqw] rounded-[22px] p-[3cqw] text-left" style={{ opacity: n.read ? 0.8 : 1 }}>
                <AppIcon id={notifIconId(n.app, n.title)} size="9.4cqw" radius="24%" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[3.7cqw] font-semibold">{n.title}</span>
                    <span className="shrink-0 text-[3cqw] text-white/50">{agoStr(now, n.at)}</span>
                  </div>
                  <div className="line-clamp-2 text-[3.55cqw] leading-snug text-white/85">{n.body}</div>
                  <div className="mt-0.5 text-[2.9cqw] text-white/40">{notifAppName(n.app, n.title)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
