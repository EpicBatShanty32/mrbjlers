import { useMemo } from 'react';
import { create } from 'zustand';
import { motionValue } from 'framer-motion';
import { useGame } from '../../../game/store';
import type { GameState, PhoneAppId } from '../../../game/types';
import { clamp, gameDate, timerStr } from '../../../game/util';

export type Tier = 0 | 1 | 2;

/** Hardware per `hero.phoneTier`. Sizes in CSS px; `sb` = status bar height. */
export interface Device {
  model: string; modelNo: string; chip: string; ios: string; color: string; serial: string;
  storage: number; used: number; health: number; display: string;
  aspect: number; maxH: number; frame: number; bezel: number; screenR: number; sb: number;
  metal: string; button: string;
  /** Battery drain divisor (game minutes per 1%). */
  drain: number;
  faceMs: number; island: boolean; aod: boolean; cell: 'LTE' | '5G';
}

export const DEVICES: Device[] = [
  {
    model: 'iPhone 11', modelNo: 'MHDA3RU/A', chip: 'A13 Bionic', ios: '26.6.1', color: 'Чёрный', serial: 'F2LZK0QHN72J',
    storage: 64, used: 52.6, health: 76, display: '6,1″ Liquid Retina HD (LCD)',
    aspect: 0.5, maxH: 800, frame: 3.5, bezel: 13, screenR: 40, sb: 46,
    metal: 'linear-gradient(90deg,#1b1c1f,#5a5c61 3%,#2a2b2f 8%,#3e4044 50%,#2a2b2f 92%,#5a5c61 97%,#1b1c1f)', button: 'linear-gradient(90deg,#2b2c30,#55575c,#2b2c30)',
    drain: 12, faceMs: 950, island: false, aod: false, cell: 'LTE',
  },
  {
    model: 'iPhone 15 Pro', modelNo: 'MTUX3ZA/A', chip: 'A17 Pro', ios: '27.0.1', color: 'Натуральный титан', serial: 'H7QW2VXK4D',
    storage: 256, used: 61.4, health: 97, display: '6,1″ Super Retina XDR, ProMotion',
    aspect: 0.483, maxH: 820, frame: 4, bezel: 8.5, screenR: 50, sb: 50,
    metal: 'linear-gradient(90deg,#77736c,#e2ddd4 3%,#a39e95 8%,#c9c4ba 50%,#a39e95 92%,#e2ddd4 97%,#77736c)', button: 'linear-gradient(90deg,#8d887f,#d8d3ca,#8d887f)',
    drain: 16, faceMs: 480, island: true, aod: false, cell: '5G',
  },
  {
    model: 'iPhone 18 Pro Max', modelNo: 'MX8P4RU/A', chip: 'A20 Pro', ios: '27.1', color: 'Космический оранжевый', serial: 'L9TX4MR2QF7',
    storage: 512, used: 88.9, health: 100, display: '6,9″ Super Retina XDR, ProMotion, Always-On',
    aspect: 0.474, maxH: 862, frame: 4, bezel: 6, screenR: 56, sb: 52,
    metal: 'linear-gradient(90deg,#9a3d14,#ff9a5c 3%,#d45a1f 8%,#ee7836 50%,#d45a1f 92%,#ff9a5c 97%,#9a3d14)', button: 'linear-gradient(90deg,#b84a18,#ff9a5c,#b84a18)',
    drain: 26, faceMs: 280, island: true, aod: true, cell: '5G',
  },
];

export const useTier = () => useGame((s) => s.hero.phoneTier) as Tier;
export const batteryOf = (s: GameState) => Math.round(clamp(100 - (s.now - s.hero.lastSleepAt) / DEVICES[s.hero.phoneTier].drain, 7, 100));
export const useBattery = () => useGame(batteryOf);

/** Colour of the app's top/bottom edges (status bar + home indicator bands). `light` = white status text. */
export const CHROME: Record<PhoneAppId, { top: string; bottom: string; light: boolean }> = {
  sber: { top: '#21A038', bottom: '#F2F3F5', light: true },
  tbank: { top: '#000000', bottom: '#000000', light: true },
  alfa: { top: '#FFFFFF', bottom: '#FFFFFF', light: false },
  telegram: { top: '#17212B', bottom: '#17212B', light: true },
  avito: { top: '#FFFFFF', bottom: '#FFFFFF', light: false },
  wallet: { top: '#10161F', bottom: '#10161F', light: true },
  auth: { top: '#131314', bottom: '#131314', light: true },
  settings: { top: '#000000', bottom: '#000000', light: true },
  music: { top: '#000000', bottom: '#000000', light: true },
};

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
};
/** Home indicator turns dark over light app bottoms. */
export const lightBottom = (app: PhoneAppId) => luma(CHROME[app].bottom) > 160;

export const APP_OF: Record<string, PhoneAppId | null> = {
  sber: 'sber', tbank: 'tbank', alfa: 'alfa', telegram: 'telegram', avito: 'avito', wallet: 'wallet', sms: 'auth', auth: 'auth',
  settings: 'settings', music: 'music', system: null,
};

// ───────── OS-level UI state (not saved) ─────────
export interface OsState {
  cc: boolean; nc: boolean;
  wifi: boolean; bt: boolean; cell: boolean; air: boolean; torch: boolean; lowPower: boolean; rotLock: boolean; aodOn: boolean;
  face: 'idle' | 'scan' | 'ok' | 'ready';
  flash: { key: string; app: string; title: string; link?: string } | null;
  hud: { kind: 'volume' | 'silent'; at: number } | null;
  aod: boolean;
  /** Expanded Dynamic Island activity ('' = compact). */
  island: '' | 'order' | 'music';
  /** Pro Max shows a second activity as a bubble right of the island. */
  split: boolean;
  set: (p: Partial<OsState>) => void;
}

export const useOS = create<OsState>()((set) => ({
  cc: false, nc: false,
  wifi: true, bt: true, cell: true, air: false, torch: false, lowPower: false, rotLock: true, aodOn: true,
  face: 'idle', flash: null, hud: null, aod: false, island: '', split: false,
  set: (p) => set(p),
}));
const os = () => useOS.getState();

/** Home screen scale (shrinks while an app is in front, like iOS). */
export const homeScale = motionValue(1);

// ───────── Face ID / unlock ─────────
let faceT: ReturnType<typeof setTimeout> | undefined;
let pending: (() => void) | null = null;

/** 'scan' → 'ok' (check shown in the island) → 'ready' (authenticated, waiting for the swipe) → back to 'idle'. */
export function faceScan() {
  if (os().face !== 'idle') return;
  os().set({ face: 'scan', aod: false });
  clearTimeout(faceT);
  faceT = setTimeout(() => {
    os().set({ face: 'ok' });
    const f = pending;
    pending = null;
    if (f) return void setTimeout(f, 200);
    faceT = setTimeout(() => {
      if (os().face === 'ok') os().set({ face: 'ready' });
      faceT = setTimeout(() => os().face === 'ready' && os().set({ face: 'idle' }), 9000);
    }, 900);
  }, DEVICES[useGame.getState().hero.phoneTier].faceMs);
}

/** Face ID, then unlock and run `after` (e.g. open the tapped notification). */
export function unlock(after?: () => void) {
  const done = () => {
    clearTimeout(faceT);
    useGame.getState().phoneLock(false);
    os().set({ aod: false, cc: false });
    after?.();
    setTimeout(() => os().set({ face: 'idle' }), 650);
  };
  const f = os().face;
  if (f === 'ok' || f === 'ready') return done();
  pending = done;
  faceScan();
}

export function resetFace() {
  clearTimeout(faceT);
  pending = null;
  os().set({ face: 'idle' });
}

let flashT: ReturnType<typeof setTimeout> | undefined;
export function islandFlash(n: { id: string; app: string; title: string; link?: string }, ms = 2600) {
  os().set({ flash: { key: n.id, app: n.app, title: n.title, link: n.link } });
  clearTimeout(flashT);
  flashT = setTimeout(() => os().set({ flash: null }), ms);
}

let hudT: ReturnType<typeof setTimeout> | undefined;
export function showHud(kind: 'volume' | 'silent') {
  os().set({ hud: { kind, at: Date.now() } });
  clearTimeout(hudT);
  hudT = setTimeout(() => os().set({ hud: null }), 1600);
}

/** Banner / lock-screen tap: open the app the notification belongs to. */
export function openNotif(n: { app: string; title: string; link?: string }) {
  const s = useGame.getState();
  const target = APP_OF[n.app];
  os().set({ nc: false, cc: false });
  if (target) {
    if (target === 'telegram' && n.link) s.setTgChat(n.link);
    s.phoneOpen(target);
  } else if (n.title.startsWith('Bybit')) {
    s.openWindow('browser');
    s.setBrowserTab('bybit');
    s.setBybitView('orders');
  }
}

export function openOrderOnPc(id: string, ex: string) {
  const s = useGame.getState();
  s.openWindow('browser');
  if (ex === 'rapira') return s.setBrowserTab('rapira');
  s.setBrowserTab('bybit');
  s.setBybitView('orders');
  s.focusOrder(id);
}

// ───────── live P2P order (Dynamic Island / lock screen) ─────────
export interface LiveOrder {
  id: string; ex: string; side: 'buy' | 'sell'; usdt: number; rub: number; status: string;
  t: string; frac: number; nick: string; n: number; urgent: boolean;
}
const LIVE = ['pending_payment', 'paid', 'appeal'];

function liveOrderJson(s: GameState): string {
  const list = s.orders.filter((o) => LIVE.includes(o.status));
  const o = list.find((x) => x.status === 'pending_payment') ?? list[0];
  if (!o) return '';
  let left = s.now - (o.paidAt ?? o.createdAt);
  let total = 0;
  if (o.status === 'pending_payment') {
    left = o.deadline - s.now;
    total = o.deadline - o.createdAt;
  } else if (o.status === 'appeal' && o.appeal) {
    left = o.appeal.resolveAt - s.now;
    total = o.appeal.resolveAt - o.appeal.openedAt;
  }
  const lo: LiveOrder = {
    id: o.id, ex: o.exchange, side: o.side, usdt: o.usdt, rub: o.rub, status: o.status,
    t: timerStr(Math.max(0, left)), frac: total > 0 ? Math.round(clamp(left / total, 0, 1) * 50) / 50 : -1,
    nick: o.cp.nick, n: list.length, urgent: o.status === 'pending_payment' && left < 3,
  };
  return JSON.stringify(lo);
}

export function useLiveOrder(): LiveOrder | null {
  const j = useGame(liveOrderJson);
  return useMemo(() => (j ? (JSON.parse(j) as LiveOrder) : null), [j]);
}

export const ORDER_LABEL: Record<string, string> = { pending_payment: 'Ожидает оплаты', paid: 'Оплачено', appeal: 'Апелляция' };
export const ORDER_COLOR: Record<string, string> = { pending_payment: '#FF9F0A', paid: '#30D158', appeal: '#FF453A' };

// ───────── calendar & weather ─────────
const WD_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MON_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MON_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export function calendar(now: number) {
  const d = gameDate(now);
  return {
    wd: WD_FULL[d.getUTCDay()], day: d.getUTCDate(), month: MON_GEN[d.getUTCMonth()], monthNom: MON_NOM[d.getUTCMonth()],
    h: d.getUTCHours(), m: d.getUTCMinutes(), year: d.getUTCFullYear(),
  };
}

export const weatherOf = (moscow: boolean) =>
  moscow
    ? { city: 'Москва', t: 7, hi: 9, lo: 3, cond: 'Облачно', rain: false }
    : { city: 'Новозаровск', t: 9, hi: 11, lo: 6, cond: 'Дождь', rain: true };

export const agoStr = (now: number, at: number) => {
  const m = now - at;
  if (m < 1) return 'сейчас';
  if (m < 60) return `${Math.floor(m)} мин назад`;
  if (m < 1440) return `${Math.floor(m / 60)} ч назад`;
  return `${Math.floor(m / 1440)} дн назад`;
};
