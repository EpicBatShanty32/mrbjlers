import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { audio, useAudioSnapshot } from '../../../audio';
import { useGame } from '../../../game/store';
import { useSettings } from '../../../game/settings';
import { fmtRub, fmtUsdt } from '../../../game/util';
import { Cover, coverTint } from './cover';
import { AppIcon, notifAppName, notifIconId } from './icons';
import { FaceGlyph } from './kit';
import { DEVICES, ORDER_COLOR, ORDER_LABEL, openNotif, openOrderOnPc, unlock, useLiveOrder, useOS, useTier, type LiveOrder } from './state';

/** CSS equaliser bars (cheap, no JS per frame). */
export function Eq({ color = '#fff', on = true, n = 4, h = 13 }: { color?: string; on?: boolean; n?: number; h?: number }) {
  return (
    <span className="flex items-end gap-[2px]" style={{ height: h }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={on ? 'os-eq' : ''}
          style={{ width: 2.6, height: '100%', borderRadius: 2, background: color, animationDelay: `${-i * 0.23}s`, animationDuration: `${0.7 + (i % 3) * 0.17}s`, transform: on ? undefined : 'scaleY(.3)', transformOrigin: '50% 100%' }}
        />
      ))}
    </span>
  );
}

export function UsdtDot({ size }: { size: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-[#26A17B] font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.56 }}>
      ₮
    </span>
  );
}

/** Track info + "playing" from the audio snapshot. */
export function useNowPlaying() {
  const snap = useAudioSnapshot();
  const info = snap.track ? audio.tracks().find((t) => t.id === snap.track) ?? null : null;
  return { snap, info, playing: !!snap.track && !snap.paused };
}

export function Island() {
  const tier = useTier();
  return DEVICES[tier].island ? <DynamicIsland tier={tier} /> : <Notch />;
}

function Notch() {
  return (
    <div className="pointer-events-none absolute top-0 left-1/2 z-[80] h-[28px] w-[52%] -translate-x-1/2 rounded-b-[20px] bg-black">
      <span className="absolute top-0 -left-[7px] h-[7px] w-[7px]" style={{ background: 'radial-gradient(circle at 0 100%, transparent 6.5px, #000 7px)' }} />
      <span className="absolute top-0 -right-[7px] h-[7px] w-[7px]" style={{ background: 'radial-gradient(circle at 100% 100%, transparent 6.5px, #000 7px)' }} />
      <span className="absolute top-[7px] left-1/2 h-[5px] w-[46px] -translate-x-1/2 rounded-full bg-[#1d1e22] shadow-[inset_0_1px_1px_rgba(0,0,0,.8)]" />
      <span className="absolute top-[4.5px] left-[calc(50%+36px)] h-[11px] w-[11px] rounded-full bg-[#0b0c11] shadow-[inset_0_0_0_1.5px_#1d2029]">
        <span className="absolute top-[3px] left-[3px] h-[3.5px] w-[3.5px] rounded-full bg-[#2b3d73]" />
      </span>
    </div>
  );
}

type Mode = 'idle' | 'face' | 'flash' | 'hud' | 'order' | 'music' | 'xorder' | 'xmusic';
// width (cqw), height (px), radius (px)
const SZ: Record<Mode, [string, number, number]> = {
  idle: ['32.5cqw', 35, 18], face: ['36cqw', 134, 46], flash: ['92cqw', 60, 30], hud: ['46cqw', 35, 18],
  order: ['46cqw', 35, 18], music: ['44cqw', 35, 18], xorder: ['94cqw', 172, 44], xmusic: ['94cqw', 172, 44],
};
const stop = (f: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  f();
};

function DynamicIsland({ tier }: { tier: number }) {
  const face = useOS((s) => s.face);
  const flash = useOS((s) => s.flash);
  const expanded = useOS((s) => s.island);
  const silentAt = useOS((s) => (s.hud?.kind === 'silent' ? s.hud.at : 0));
  const muted = useSettings((s) => s.muted);
  const locked = useGame((s) => s.ui.phoneLocked);
  const order = useLiveOrder();
  const { snap, info, playing } = useNowPlaying();
  const [peek, setPeek] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (!snap.track) return;
    setPeek(true);
    const t = setTimeout(() => setPeek(false), 4500);
    return () => clearTimeout(t);
  }, [snap.track]);

  const musicOn = !!info && playing && (snap.manual || peek);
  let mode: Mode = 'idle';
  if (face === 'scan' || face === 'ok') mode = 'face';
  else if (flash) mode = 'flash';
  else if (silentAt) mode = 'hud';
  else if (expanded === 'order' && order) mode = 'xorder';
  else if (expanded === 'music' && info) mode = 'xmusic';
  else if (order) mode = 'order';
  else if (musicOn) mode = 'music';
  useEffect(() => {
    if (expanded && mode !== 'xorder' && mode !== 'xmusic' && mode !== 'face' && mode !== 'flash') useOS.getState().set({ island: '' });
  }, [mode, expanded]);
  const split = tier === 2 && mode === 'order' && musicOn;
  useEffect(() => useOS.getState().set({ split }), [split]);

  const [w, h, r] = SZ[mode];
  const big = mode === 'face' || mode === 'flash' || mode === 'xorder' || mode === 'xmusic';
  const tint = info ? coverTint(info.id) : '#fff';
  const oc = order ? ORDER_COLOR[order.status] : '#fff';
  const click = () => {
    const o = useOS.getState();
    if (mode === 'flash' && flash) {
      o.set({ flash: null });
      const go = () => openNotif(flash);
      if (locked) unlock(go);
      else go();
    } else if (mode === 'order') o.set({ island: 'order' });
    else if (mode === 'music') o.set({ island: 'music' });
  };

  let body: React.ReactNode = <span className="absolute top-1/2 right-[13px] h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#0c0d13] shadow-[inset_0_0_0_1.5px_#1a1d27]"><span className="absolute top-[3px] left-[3px] h-[3.5px] w-[3.5px] rounded-full bg-[#27386a]" /></span>;
  if (mode === 'face') body = <div className="flex h-full items-center justify-center"><FaceGlyph size={62} state={face === 'ok' ? 'ok' : 'scan'} /></div>;
  else if (mode === 'flash' && flash)
    body = (
      <div className="flex h-full items-center gap-2.5 px-3">
        <AppIcon id={notifIconId(flash.app, flash.title)} size={36} radius="26%" />
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[11px] text-white/55">{notifAppName(flash.app, flash.title)}</div>
          <div className="truncate text-[13.5px] font-semibold">{flash.title}</div>
        </div>
        <span className="text-[11px] text-white/45">сейчас</span>
      </div>
    );
  else if (mode === 'hud')
    body = (
      <div className={'flex h-full items-center justify-between px-3.5 text-[13px] font-semibold ' + (muted ? 'text-[#FF453A]' : 'text-white')}>
        {muted ? <BellOff size={17} /> : <Bell size={17} />}
        <span>{muted ? 'Бесшумно' : 'Звонок'}</span>
      </div>
    );
  else if (mode === 'order' && order)
    body = (
      <div className="flex h-full items-center justify-between px-[7px]">
        <UsdtDot size={22} />
        <span className={'num pr-1.5 text-[14px] font-semibold ' + (order.urgent ? 'os-pulse' : '')} style={{ color: oc }}>{order.t}</span>
      </div>
    );
  else if (mode === 'music' && info)
    body = (
      <div className="flex h-full items-center justify-between px-[7px]">
        <Cover id={info.id} size={22} radius="28%" />
        <span className="pr-1.5"><Eq color={tint} on={playing} /></span>
      </div>
    );
  else if (mode === 'xorder' && order) body = <OrderExpanded o={order} />;
  else if (mode === 'xmusic' && info)
    body = (
      <div className="flex h-full flex-col px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Cover id={info.id} size={52} radius="22%" />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[15px] font-semibold">{info.title}</div>
            <div className="truncate text-[12.5px] text-white/55">{snap.manual ? info.artist : 'Адаптивный саундтрек'}</div>
          </div>
          <Eq color={tint} on={playing} h={18} n={5} />
        </div>
        <div className="mt-auto flex items-center justify-center gap-11">
          <button type="button" onClick={stop(() => audio.player.prev())}><SkipBack size={26} fill="#fff" /></button>
          <button type="button" onClick={stop(() => (playing ? audio.player.pause() : audio.player.resume()))}>{playing ? <Pause size={34} fill="#fff" /> : <Play size={34} fill="#fff" />}</button>
          <button type="button" onClick={stop(() => audio.player.next())}><SkipForward size={26} fill="#fff" /></button>
        </div>
      </div>
    );

  return (
    <>
      {(mode === 'xorder' || mode === 'xmusic') && <div className="absolute inset-0 z-[79]" onClick={() => useOS.getState().set({ island: '' })} />}
      <motion.div
        onClick={click}
        className="ios absolute top-[11px] left-1/2 z-[80] overflow-hidden bg-black text-white"
        style={{ x: '-50%', pointerEvents: mode === 'idle' ? 'none' : 'auto', cursor: mode === 'idle' ? undefined : 'pointer' }}
        initial={false}
        animate={{ width: w, height: h, borderRadius: r, boxShadow: big ? '0 14px 40px rgba(0,0,0,.5)' : '0 0 0 rgba(0,0,0,0)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.85 }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={mode}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { delay: 0.06, duration: 0.22 } }}
            exit={{ opacity: 0, scale: 0.92, filter: 'blur(4px)', transition: { duration: 0.12 } }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {split && (
          <motion.button
            type="button"
            key="bubble"
            onClick={() => useOS.getState().set({ island: 'music' })}
            className="absolute top-[11px] z-[80] flex h-[35px] w-[35px] items-center justify-center rounded-full bg-black"
            style={{ left: 'calc(50% + 23cqw + 6px)' }}
            initial={{ scale: 0, x: -30 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            <Eq color={tint} on={playing} n={3} h={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

function OrderExpanded({ o }: { o: LiveOrder }) {
  const c = ORDER_COLOR[o.status];
  return (
    <div className="flex h-full flex-col px-5 pt-4 pb-4 text-left">
      <div className="flex items-center gap-3">
        <UsdtDot size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-white/55">
            {o.ex === 'rapira' ? 'Rapira' : 'Bybit'} P2P · {o.side === 'buy' ? 'Покупка' : 'Продажа'}
            {o.n > 1 ? ` · ещё ${o.n - 1}` : ''}
          </div>
          <div className="truncate text-[17px] font-semibold">{fmtUsdt(o.usdt)}</div>
          <div className="num truncate text-[12.5px] text-white/60">{fmtRub(o.rub)} · {o.nick}</div>
        </div>
        <div className="text-right">
          <div className="num text-[24px] leading-none font-semibold" style={{ color: c }}>{o.t}</div>
          <div className="mt-1 text-[11px]" style={{ color: c }}>{ORDER_LABEL[o.status]}</div>
        </div>
      </div>
      {o.frac >= 0 && (
        <div className="mt-3.5 h-[5px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${o.frac * 100}%`, background: c }} />
        </div>
      )}
      <button
        type="button"
        onClick={stop(() => {
          openOrderOnPc(o.id, o.ex);
          useOS.getState().set({ island: '' });
        })}
        className="mt-auto rounded-full bg-white/15 py-2 text-[13px] font-semibold hover:bg-white/20"
      >
        Открыть ордер на компьютере
      </button>
    </div>
  );
}
