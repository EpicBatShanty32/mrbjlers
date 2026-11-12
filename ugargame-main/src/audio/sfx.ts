/** Procedural SFX library: soft glassy UI/phone sounds, cash, cinematic hits, foley, boot. */
import { getSettings } from '../game/settings';
import type { SfxId, SfxOptions } from './index';
import { live, type Graph } from './engine';
import { bell as L, blip as B, buzz, gainN, hiss as H, lastEnd, resetEnd, setRate, thump as T } from './synth';

type Rec = (G: Graph, o: AudioNode, t: number) => void;
const rnd = Math.random;

const R: Record<SfxId, Rec> = {
  // generic UI
  ui_click: (G, o, t) => {
    B(G, o, t, { f: 1250, f1: 820, d: 0.035, v: 0.14 });
    H(G, o, t, { d: 0.01, v: 0.04, hp: 4000 });
  },
  ui_hover: (G, o, t) => void B(G, o, t, { f: 2300, d: 0.018, v: 0.04 }),
  ui_back: (G, o, t) => {
    B(G, o, t, { f: 900, f1: 640, d: 0.05, v: 0.11 });
    B(G, o, t + 0.045, { f: 700, f1: 520, d: 0.06, v: 0.08 });
  },
  ui_toggle: (G, o, t) => {
    B(G, o, t, { f: 1400, f1: 1750, d: 0.03, v: 0.1 });
    H(G, o, t, { d: 0.014, v: 0.05, bp: 3000, q: 1.2 });
  },
  ui_open: (G, o, t) => {
    H(G, o, t, { a: 0.09, d: 0.09, v: 0.1, bp: 900, bp1: 3200, q: 1.4 });
    B(G, o, t + 0.02, { f: 660, f1: 990, d: 0.12, a: 0.01, v: 0.06 });
  },
  ui_close: (G, o, t) => {
    H(G, o, t, { a: 0.05, d: 0.1, v: 0.1, bp: 3000, bp1: 800, q: 1.4 });
    B(G, o, t, { f: 880, f1: 600, d: 0.1, v: 0.07 });
  },
  ui_error: (G, o, t) => {
    B(G, o, t, { f: 330, f1: 300, d: 0.13, v: 0.15, type: 'triangle', lp: 1600 });
    B(G, o, t + 0.12, { f: 262, f1: 240, d: 0.17, v: 0.13, type: 'triangle', lp: 1300 });
  },
  ui_success: (G, o, t) => {
    L(G, o, t, { f: 1047, ratio: 2, idx: 0.8, d: 0.4, v: 0.11 });
    L(G, o, t + 0.08, { f: 1568, ratio: 2, idx: 0.8, d: 0.55, v: 0.11 });
  },
  ui_select: (G, o, t) => {
    B(G, o, t, { f: 1320, d: 0.05, v: 0.09 });
    L(G, o, t, { f: 2640, ratio: 2, idx: 0.5, d: 0.12, v: 0.025 });
  },
  ui_warn: (G, o, t) => {
    B(G, o, t, { f: 740, d: 0.14, v: 0.09, type: 'triangle', lp: 2400 });
    B(G, o, t + 0.14, { f: 740, d: 0.2, v: 0.07, type: 'triangle', lp: 2400 });
  },
  // typing
  key: (G, o, t) => {
    H(G, o, t, { d: 0.016, v: 0.08, bp: 2200 + rnd() * 1600, q: 1.2 });
    B(G, o, t, { f: 170 + rnd() * 60, d: 0.02, v: 0.06 });
  },
  text_tick: (G, o, t) => void B(G, o, t, { f: 2700 + rnd() * 500, d: 0.012, v: 0.04 }),
  // phone
  phone_tap: (G, o, t) => void B(G, o, t, { f: 1650, f1: 1300, d: 0.022, v: 0.08 }),
  phone_unlock: (G, o, t) => {
    H(G, o, t, { d: 0.012, v: 0.06, hp: 3000 });
    B(G, o, t, { f: 1150, d: 0.03, v: 0.07 });
    B(G, o, t + 0.055, { f: 1750, d: 0.045, v: 0.06 });
  },
  phone_lock: (G, o, t) => {
    B(G, o, t, { f: 520, f1: 300, d: 0.045, v: 0.2 });
    H(G, o, t, { d: 0.022, v: 0.1, bp: 1500, q: 1 });
  },
  phone_vibrate: (G, o, t) => {
    buzz(G, o, t, 0.32, 0.22);
    buzz(G, o, t + 0.5, 0.32, 0.22);
  },
  phone_home: (G, o, t) => {
    H(G, o, t, { a: 0.03, d: 0.1, v: 0.08, bp: 2200, bp1: 1000, q: 1.2 });
    B(G, o, t, { f: 1000, d: 0.03, v: 0.07 });
  },
  phone_app_open: (G, o, t) => {
    H(G, o, t, { a: 0.07, d: 0.07, v: 0.12, bp: 1200, bp1: 3500, q: 1.8 });
    B(G, o, t, { f: 800, f1: 1100, d: 0.06, v: 0.06 });
  },
  phone_app_close: (G, o, t) => {
    H(G, o, t, { a: 0.03, d: 0.1, v: 0.14, bp: 3000, bp1: 1000, q: 1.8 });
    B(G, o, t, { f: 1000, f1: 700, d: 0.06, v: 0.05 });
  },
  notify_bank: (G, o, t) => {
    L(G, o, t, { f: 1318.5, ratio: 2, idx: 0.9, d: 0.6, v: 0.16 });
    L(G, o, t + 0.11, { f: 1760, ratio: 2, idx: 0.9, d: 0.9, v: 0.15 });
  },
  notify_tg: (G, o, t) => {
    B(G, o, t, { f: 990, f1: 1180, g: 0.05, d: 0.09, v: 0.14 });
    L(G, o, t + 0.07, { f: 1480, ratio: 2, idx: 0.7, d: 0.5, v: 0.12 });
  },
  notify_sms: (G, o, t) => {
    L(G, o, t, { f: 1175, ratio: 3, idx: 0.7, d: 0.35, v: 0.12 });
    L(G, o, t + 0.12, { f: 1568, ratio: 3, idx: 0.7, d: 0.55, v: 0.12 });
  },
  notify_market: (G, o, t) => [784, 988, 1175].forEach((f, i) => B(G, o, t + i * 0.08, { f, d: 0.18, v: 0.12, type: 'triangle', lp: 3200 })),
  notify_system: (G, o, t) => void L(G, o, t, { f: 1046, ratio: 3.5, idx: 0.9, d: 0.8, v: 0.12 }),
  notify_wallet: (G, o, t) => {
    L(G, o, t, { f: 2093, ratio: 2.4, idx: 1, d: 0.35, v: 0.09 });
    L(G, o, t + 0.06, { f: 2637, ratio: 2.4, idx: 1, d: 0.5, v: 0.09 });
  },
  msg_send: (G, o, t) => {
    H(G, o, t, { a: 0.05, d: 0.07, v: 0.08, bp: 1500, bp1: 4000, q: 1.5 });
    B(G, o, t, { f: 700, f1: 1200, d: 0.07, v: 0.07 });
  },
  msg_receive: (G, o, t) => {
    B(G, o, t, { f: 1200, f1: 900, d: 0.06, v: 0.09 });
    B(G, o, t + 0.05, { f: 1500, d: 0.05, v: 0.045 });
  },
  // money & desk
  cash_in: (G, o, t) => {
    H(G, o, t, { d: 0.05, v: 0.05, bp: 5000, q: 1 });
    [2093, 2637, 3136].forEach((f, i) => L(G, o, t + 0.02 + i * 0.07, { f, ratio: 2, idx: 0.6, d: 0.5 + i * 0.12, v: 0.09 }));
    H(G, o, t + 0.05, { a: 0.05, d: 0.35, v: 0.02, hp: 7000 });
  },
  cash_out: (G, o, t) => {
    L(G, o, t, { f: 1568, ratio: 2, idx: 0.6, d: 0.35, v: 0.08 });
    L(G, o, t + 0.08, { f: 1175, ratio: 2, idx: 0.6, d: 0.45, v: 0.08 });
    H(G, o, t, { a: 0.04, d: 0.12, v: 0.025, bp: 2500, q: 0.8 });
  },
  coins: (G, o, t) => {
    for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) L(G, o, t + rnd() * 0.25, { f: 2500 + rnd() * 2000, ratio: 2.7, idx: 1.2, d: 0.12 + rnd() * 0.12, v: 0.05 });
  },
  shutter: (G, o, t) => {
    H(G, o, t, { d: 0.03, v: 0.18, hp: 2000 });
    H(G, o, t + 0.06, { d: 0.05, v: 0.14, bp: 1500, q: 1 });
    B(G, o, t, { f: 200, d: 0.02, v: 0.08 });
  },
  copy: (G, o, t) => {
    B(G, o, t, { f: 1700, d: 0.03, v: 0.06 });
    B(G, o, t + 0.045, { f: 2200, d: 0.035, v: 0.05 });
  },
  paste: (G, o, t) => {
    B(G, o, t, { f: 2200, d: 0.03, v: 0.05 });
    B(G, o, t + 0.045, { f: 1700, d: 0.04, v: 0.06 });
  },
  window_open: (G, o, t) => {
    H(G, o, t, { kind: 'pink', a: 0.1, d: 0.11, v: 0.14, bp: 600, bp1: 2400, q: 1.2 });
    B(G, o, t + 0.02, { f: 520, f1: 780, d: 0.14, a: 0.02, v: 0.05 });
  },
  window_close: (G, o, t) => {
    H(G, o, t, { kind: 'pink', a: 0.05, d: 0.11, v: 0.12, bp: 2400, bp1: 600, q: 1.2 });
    B(G, o, t, { f: 700, f1: 450, d: 0.1, v: 0.05 });
  },
  window_min: (G, o, t) => {
    H(G, o, t, { kind: 'pink', a: 0.06, d: 0.16, v: 0.12, bp: 3000, bp1: 500, q: 2 });
    B(G, o, t, { f: 900, f1: 350, d: 0.2, v: 0.05 });
  },
  thought: (G, o, t) => {
    L(G, o, t, { f: 659, ratio: 2, idx: 0.5, d: 1.2, a: 0.02, v: 0.06 });
    L(G, o, t + 0.13, { f: 988, ratio: 2, idx: 0.5, d: 1.2, a: 0.02, v: 0.045 });
    H(G, o, t, { a: 0.3, d: 0.4, v: 0.012, bp: 3000, q: 0.8 });
  },
  success_big: (G, o, t) => {
    [523, 659, 784, 1047].forEach((f, i) => L(G, o, t + i * 0.07, { f, ratio: 2, idx: 0.8, d: 0.8, v: 0.1 }));
    [523, 659, 784].forEach((f) => B(G, o, t + 0.3, { f, d: 1.2, a: 0.1, v: 0.03, type: 'triangle', lp: 2500 }));
    H(G, o, t + 0.25, { a: 0.2, d: 0.7, v: 0.025, hp: 7000 });
  },
  fail: (G, o, t) => {
    [392, 349, 311].forEach((f, i) => B(G, o, t + i * 0.15, { f, d: 0.35, v: 0.11, type: 'triangle', lp: 1800 }));
    T(G, o, t + 0.3, { f: 90, f1: 55, d: 0.35, v: 0.14 });
  },
  alarm: (G, o, t) => {
    for (let i = 0; i < 4; i++) B(G, o, t + i * 0.28, { f: i % 2 ? 698 : 880, d: 0.24, a: 0.015, v: 0.11, type: 'triangle', lp: 2600 });
  },
  heartbeat: (G, o, t) => {
    T(G, o, t, { f: 62, f1: 40, d: 0.16, v: 0.45 });
    T(G, o, t + 0.2, { f: 56, f1: 38, d: 0.2, v: 0.34 });
  },
  // cinematic
  cine_whoosh: (G, o, t) => {
    H(G, o, t, { kind: 'pink', a: 0.45, d: 0.5, v: 0.5, bp: 300, bp1: 2400, q: 1.1, pan: -0.6, pan1: 0.6 });
    H(G, o, t, { kind: 'brown', a: 0.4, d: 0.4, v: 0.3, lp: 220 });
  },
  cine_impact: (G, o, t) => {
    T(G, o, t, { f: 95, f1: 32, g: 0.5, d: 1.4, v: 0.7 });
    H(G, o, t, { d: 0.5, v: 0.28, lp: 2500, lp1: 300 });
    H(G, o, t, { d: 0.02, v: 0.18, hp: 2000 });
  },
  cine_riser: (G, o, t) => {
    H(G, o, t, { a: 2.4, d: 0.08, v: 0.2, bp: 200, bp1: 6000, q: 2 });
    B(G, o, t, { f: 220, f1: 880, g: 2.45, a: 2.4, d: 0.08, v: 0.05, type: 'sawtooth', lp: 2500 });
    B(G, o, t, { f: 440, f1: 1760, g: 2.45, a: 2.4, d: 0.08, v: 0.03 });
  },
  cine_boom: (G, o, t) => {
    T(G, o, t, { f: 58, f1: 25, g: 1.2, d: 3, v: 0.8 });
    H(G, o, t, { kind: 'brown', d: 2.5, v: 0.45, lp: 400, lp1: 80 });
    H(G, o, t, { d: 0.6, v: 0.12, lp: 3000, lp1: 200 });
  },
  cine_reveal: (G, o, t) => {
    [1047, 1319, 1568, 1976, 2349].forEach((f, i) => L(G, o, t + i * 0.06, { f, ratio: 2, idx: 0.6, d: 2.4, a: 0.01, v: 0.06 }));
    H(G, o, t, { a: 0.8, d: 1.4, v: 0.035, hp: 6000 });
  },
  choice_hover: (G, o, t) => void B(G, o, t, { f: 1760, d: 0.03, v: 0.05 }),
  choice_select: (G, o, t) => {
    L(G, o, t, { f: 880, ratio: 2, idx: 0.7, d: 0.45, v: 0.11 });
    B(G, o, t, { f: 1320, d: 0.08, v: 0.05 });
    H(G, o, t, { d: 0.1, v: 0.03, bp: 3000, q: 1 });
  },
  trust_up: (G, o, t) => {
    L(G, o, t, { f: 784, ratio: 2, idx: 0.7, d: 0.45, v: 0.1 });
    L(G, o, t + 0.09, { f: 1175, ratio: 2, idx: 0.7, d: 0.65, v: 0.1 });
  },
  trust_down: (G, o, t) => {
    B(G, o, t, { f: 587, d: 0.25, v: 0.1, type: 'triangle', lp: 1600 });
    B(G, o, t + 0.11, { f: 440, d: 0.38, v: 0.1, type: 'triangle', lp: 1400 });
  },
  chapter: (G, o, t) => {
    T(G, o, t, { f: 70, f1: 34, g: 0.6, d: 1.8, v: 0.45 });
    [440, 659, 880].forEach((f, i) => L(G, o, t + 0.05 + i * 0.04, { f, ratio: 2, idx: 0.6, d: 2.6, a: 0.01, v: 0.08 }));
    H(G, o, t, { a: 0.5, d: 1.2, v: 0.035, bp: 1500, q: 0.7 });
  },
  title_hit: (G, o, t) => {
    T(G, o, t, { f: 82, f1: 28, g: 0.8, d: 2.4, v: 0.75 });
    H(G, o, t, { d: 1.3, v: 0.32, lp: 4000, lp1: 200 });
    L(G, o, t, { f: 220, ratio: 1.5, idx: 1.2, d: 2.2, v: 0.12 });
  },
  // foley
  door_slam: (G, o, t) => {
    T(G, o, t, { f: 110, f1: 60, d: 0.3, v: 0.65 });
    H(G, o, t, { d: 0.35, v: 0.4, lp: 1200, lp1: 200 });
    H(G, o, t + 0.02, { d: 0.09, v: 0.08, bp: 3000, q: 2 });
  },
  car_door: (G, o, t) => {
    T(G, o, t, { f: 140, f1: 80, d: 0.2, v: 0.5 });
    H(G, o, t, { d: 0.13, v: 0.28, lp: 900 });
    H(G, o, t + 0.02, { d: 0.015, v: 0.14, hp: 4000 });
  },
  car_pass: (G, o, t) => {
    H(G, o, t, { kind: 'pink', a: 1.6, d: 1.6, v: 0.2, bp: 350, bp1: 600, q: 0.9, pan: -0.85, pan1: 0.85 });
    H(G, o, t, { a: 1.6, d: 1.6, v: 0.05, hp: 2500, pan: -0.85, pan1: 0.85 });
    B(G, o, t, { f: 72, f1: 58, g: 3.2, a: 1.6, d: 1.6, v: 0.06, type: 'sawtooth', lp: 260 });
  },
  thunder: (G, o, t) => {
    H(G, o, t, { d: 0.5, v: 0.35, lp: 6000, lp1: 700 });
    H(G, o, t + 0.05, { kind: 'brown', a: 0.3, d: 4.5, v: 0.5, lp: 300, lp1: 90 });
    H(G, o, t + 0.9, { kind: 'brown', a: 0.4, d: 3, v: 0.3, lp: 200 });
  },
  cup: (G, o, t) => {
    L(G, o, t, { f: 2600, ratio: 2.76, idx: 1, d: 0.25, v: 0.13 });
    L(G, o, t + 0.004, { f: 3900, ratio: 2.76, idx: 0.8, d: 0.18, v: 0.06 });
    T(G, o, t, { f: 300, f1: 240, d: 0.05, v: 0.08 });
  },
  phone_buzz_table: (G, o, t) => {
    buzz(G, o, t, 0.45, 0.3, 165, true);
    buzz(G, o, t + 0.7, 0.45, 0.3, 165, true);
  },
  keyboard_burst: (G, o, t) => {
    let tt = t;
    for (let i = 0, n = 8 + Math.floor(rnd() * 7); i < n; i++) {
      R.key(G, o, tt);
      tt += 0.05 + rnd() * 0.08;
    }
  },
  train_horn: (G, o, t) => [220, 277, 330].forEach((f) => B(G, o, t, { f, d: 1.3, a: 0.12, v: 0.05, type: 'sawtooth', lp: 1300 })),
  // VoronovOS boot
  boot_bios: (G, o, t) => void B(G, o, t, { f: 1000, d: 0.18, a: 0.004, v: 0.12, lp: 3000 }),
  boot_chime: (G, o, t) => {
    [174.6, 261.6, 329.6, 392, 523.3].forEach((f, i) => {
      B(G, o, t + i * 0.012, { f, d: 2.6, a: 0.02, v: 0.06, type: 'triangle', lp: 2400 });
      B(G, o, t + i * 0.012, { f: f * 2, d: 1.8, a: 0.02, v: 0.02 });
    });
    L(G, o, t + 0.05, { f: 1046.5, ratio: 2, idx: 0.5, d: 2.2, v: 0.04 });
  },
  hdd: (G, o, t) => {
    B(G, o, t, { f: 120, d: 1.3, a: 0.2, v: 0.02, type: 'triangle' });
    H(G, o, t, { kind: 'pink', a: 0.2, d: 1.1, v: 0.02, bp: 400, q: 1 });
    let tt = t + 0.1;
    for (let i = 0; i < 8; i++) {
      H(G, o, tt, { d: 0.012, v: 0.06 + rnd() * 0.05, bp: 1800 + rnd() * 800, q: 2 });
      tt += 0.04 + rnd() * 0.16;
    }
  },
};

/** Reverb send per id (default 0.08). */
const VERB: Partial<Record<SfxId, number>> = {
  thought: 0.4, success_big: 0.3, chapter: 0.5, title_hit: 0.5, cine_whoosh: 0.35, cine_impact: 0.45, cine_riser: 0.4, cine_boom: 0.5, cine_reveal: 0.6,
  door_slam: 0.25, car_door: 0.2, thunder: 0.3, train_horn: 0.5, boot_chime: 0.4, notify_bank: 0.14, notify_tg: 0.12, notify_sms: 0.12, notify_system: 0.15,
  notify_wallet: 0.14, notify_market: 0.1, cash_in: 0.15, trust_up: 0.2, choice_select: 0.2, alarm: 0.15,
};
const LOW = new Set<SfxId>(['key', 'text_tick', 'ui_hover', 'choice_hover', 'phone_tap', 'ui_click']);

export const SFX_IDS = Object.keys(R) as SfxId[];
export const isSfxId = (v: string | undefined): v is SfxId => !!v && v in R;

const lastAt = new Map<SfxId, number>();
let ends: number[] = [];

/** Play an SFX on the live graph (or on `G` at time `at`, for offline rendering). */
export function playSfx(id: SfxId, opts: SfxOptions = {}, G: Graph | null = live(), at?: number): void {
  if (!G || !R[id]) return;
  const ctx = G.ctx;
  if (at === undefined) {
    const s = getSettings();
    if (s.muted || s.sfx <= 0 || s.master <= 0 || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (lastAt.get(id) ?? -1e9) < 40) return;
    lastAt.set(id, now);
    ends = ends.filter((e) => e > ctx.currentTime);
    if (ends.length > 28 && LOW.has(id)) return;
  }
  const t = at ?? ctx.currentTime + 0.005;
  const out = gainN(ctx, Math.max(0, opts.volume ?? 1));
  if (opts.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, opts.pan));
    out.connect(p);
    p.connect(G.bus.sfx);
  } else out.connect(G.bus.sfx);
  const send = gainN(ctx, VERB[id] ?? 0.08);
  out.connect(send);
  send.connect(G.sfxVerb);
  setRate(opts.rate ?? 1);
  resetEnd();
  try {
    R[id](G, out, t);
  } catch (e) {
    console.warn('[audio] sfx', id, e);
  } finally {
    setRate(1);
  }
  ends.push(lastEnd());
}
