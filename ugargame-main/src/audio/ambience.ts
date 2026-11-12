/**
 * Ambience beds: looped generated noise through filters with slow LFO movement, plus randomly
 * scheduled one-shot events (drips, car passes, thunder, birds, clinks…). Crossfaded on change.
 */
import type { AmbienceId } from './index';
import { addSched, dropSched, isUnlocked, live, whenUnlocked, type Graph } from './engine';
import { bell, blip, fadeParam, filter, gainN, hiss, link, noiseSrc, oscN, type NoiseKind } from './synth';

type FSpec = [BiquadFilterType, number, number?];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Bed {
  readonly G: Graph;
  readonly ctx: BaseAudioContext;
  readonly id: AmbienceId;
  readonly fader: GainNode;
  readonly t0: number;
  level: number;
  stopped = false;
  private srcs: AudioScheduledSourceNode[] = [];
  private evs: { next: number; min: number; max: number; fn: (t: number) => void }[] = [];

  constructor(G: Graph, id: AmbienceId, t0: number, fade: number, level = 1) {
    this.G = G;
    this.ctx = G.ctx;
    this.id = id;
    this.t0 = t0;
    this.level = level;
    const lv = level * (BED_GAIN[id] ?? 1);
    this.fader = gainN(G.ctx, fade > 0 ? 0 : lv);
    this.fader.connect(G.bus.ambience);
    if (fade > 0) fadeParam(this.fader.gain, lv, t0, fade);
    BEDS[id](this);
  }

  /** Continuous looped noise layer. `lfo` = [rate Hz, depth × vol] on gain; `flfo` = [rate, Hz] on the first filter. */
  loop(kind: NoiseKind, chain: FSpec[], vol: number, o: { lfo?: [number, number]; flfo?: [number, number]; pan?: number } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.G.nb.get(kind);
    src.loop = true;
    src.start(this.t0, Math.random() * src.buffer.duration);
    this.srcs.push(src);
    let n: AudioNode = src;
    let first: BiquadFilterNode | null = null;
    for (const [ty, f, q] of chain) {
      const fl = filter(this.ctx, ty, f, q ?? 0.7);
      first ??= fl;
      n = link(n, fl);
    }
    const g = gainN(this.ctx, vol);
    n.connect(g);
    if (o.lfo) this.lfo(o.lfo[0], vol * o.lfo[1], g.gain);
    if (o.flfo && first) this.lfo(o.flfo[0], o.flfo[1], first.frequency);
    if (o.pan) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p);
      p.connect(this.fader);
    } else g.connect(this.fader);
    return g;
  }

  lfo(rate: number, depth: number, p: AudioParam) {
    const o = this.ctx.createOscillator();
    o.frequency.value = rate * rand(0.85, 1.15);
    const g = gainN(this.ctx, depth);
    o.connect(g);
    g.connect(p);
    o.start(this.t0);
    this.srcs.push(o);
  }

  hum(f: number, vol: number, type: OscillatorType = 'sine', chain: FSpec[] = [], am?: [number, number]) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(this.t0);
    this.srcs.push(o);
    let n: AudioNode = o;
    for (const [ty, fr, q] of chain) n = link(n, filter(this.ctx, ty, fr, q ?? 0.7));
    const g = gainN(this.ctx, vol);
    n.connect(g);
    if (am) this.lfo(am[0], vol * am[1], g.gain);
    g.connect(this.fader);
  }

  /** Random event every min..max seconds (first one after `first` s, default random). */
  ev(min: number, max: number, fn: (t: number) => void, first?: number) {
    this.evs.push({ next: this.t0 + (first ?? rand(min, max)), min, max, fn });
  }

  scheduleUntil(t: number) {
    if (this.stopped) return;
    const now = this.ctx.currentTime;
    for (const e of this.evs) {
      // throttled timers (hidden tab): skip missed events instead of firing them all at once
      if (now > 0.5 && e.next < now - 0.3) e.next = now + rand(0, e.max);
      while (e.next < t) {
        try {
          e.fn(e.next);
        } catch (err) {
          console.warn('[audio]', err);
        }
        e.next += rand(e.min, e.max);
      }
    }
  }

  stop(fade: number) {
    if (this.stopped) return;
    this.stopped = true;
    fadeParam(this.fader.gain, 0, this.ctx.currentTime, fade);
    setTimeout(() => {
      for (const s of this.srcs) {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
      }
      this.fader.disconnect();
    }, (fade + 7) * 1000);
  }
}

// ───────── events ─────────

function drip(b: Bed, t: number, v: number, f = 2600) {
  const f0 = f * rand(0.6, 1.5);
  blip(b.G, b.fader, t, { f: f0, f1: f0 * 0.55, g: 0.05, d: rand(0.04, 0.09), v: v * rand(0.4, 1), pan: rand(-0.8, 0.8) });
}

function carPass(b: Bed, t: number, v: number, wet: boolean) {
  const ctx = b.ctx;
  const d = rand(3.5, 6);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const end = t + d;
  const mid = t + d * rand(0.4, 0.6);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.85 * dir, t);
  pan.pan.linearRampToValueAtTime(0.85 * dir, end);
  pan.connect(b.fader);
  const env = (g: GainNode, peak: number) => {
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(peak, mid);
    g.gain.exponentialRampToValueAtTime(1e-4, end);
  };
  const n = noiseSrc(b.G, 'pink', t, end + 0.05);
  const bp = filter(ctx, 'bandpass', 260, 0.9);
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.exponentialRampToValueAtTime(750, mid);
  bp.frequency.exponentialRampToValueAtTime(240, end);
  const g = gainN(ctx);
  env(g, v);
  n.connect(bp);
  bp.connect(g);
  g.connect(pan);
  if (wet) {
    const w = noiseSrc(b.G, 'white', t, end + 0.05);
    const hp = filter(ctx, 'highpass', 2500);
    const wg = gainN(ctx);
    env(wg, v * 0.3);
    w.connect(hp);
    hp.connect(wg);
    wg.connect(pan);
  }
  const f = rand(48, 70);
  const o = oscN(ctx, 'sawtooth', f * 1.05, t, end + 0.05);
  o.frequency.linearRampToValueAtTime(f * 0.93, end);
  const lp = filter(ctx, 'lowpass', 200, 0.8);
  const og = gainN(ctx);
  env(og, v * 0.35);
  o.connect(lp);
  lp.connect(og);
  og.connect(pan);
}

function birds(b: Bed, t: number) {
  const base = rand(2600, 4300);
  const pan = rand(-0.7, 0.7);
  let tt = t;
  for (let i = 0, n = 2 + Math.floor(Math.random() * 4); i < n; i++) {
    const up = Math.random() < 0.5;
    const d = rand(0.05, 0.11);
    blip(b.G, b.fader, tt, { f: base * (up ? 0.85 : 1.2), f1: base * (up ? 1.25 : 0.8), g: d, a: 0.01, d, v: rand(0.006, 0.012), pan });
    tt += d + rand(0.04, 0.12);
  }
}

function clack(b: Bed, t: number) {
  for (const [dt, v] of [[0, 1], [0.12, 0.8]]) {
    hiss(b.G, b.fader, t + dt, { d: 0.05, v: 0.05 * v, bp: 1600, q: 0.9 });
    blip(b.G, b.fader, t + dt, { f: 110, f1: 65, g: 0.05, d: 0.08, v: 0.12 * v });
  }
}

const clink = (b: Bed, t: number, v = 1) => bell(b.G, b.fader, t, { f: rand(2300, 3600), ratio: 2.76, idx: 0.8, d: rand(0.15, 0.3), v: rand(0.006, 0.014) * v, pan: rand(-0.8, 0.8) });

function keyboard(b: Bed, t: number, v: number) {
  let tt = t;
  for (let i = 0, n = 5 + Math.floor(Math.random() * 10); i < n; i++) {
    hiss(b.G, b.fader, tt, { d: 0.015, v: v * rand(0.5, 1), bp: rand(2000, 3500), q: 1.5 });
    blip(b.G, b.fader, tt, { f: 150, d: 0.02, v: v * 0.4 });
    tt += rand(0.06, 0.15);
  }
}

function ring(b: Bed, t: number) {
  for (const k of [0, 1.6]) for (let i = 0; i < 12; i++) blip(b.G, b.fader, t + k + i * 0.07, { f: i % 2 ? 1300 : 1600, d: 0.06, v: 0.0035, lp: 1800, pan: 0.5 });
}

function siren(b: Bed, t: number, v: number) {
  const ctx = b.ctx;
  const d = 4.5;
  const o = oscN(ctx, 'sine', 620, t, t + d + 0.1);
  for (let i = 0; i < 6; i++) o.frequency.linearRampToValueAtTime(i % 2 ? 620 : 980, t + ((i + 1) * d) / 6);
  const lp = filter(ctx, 'lowpass', 1500);
  const g = gainN(ctx);
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(v, t + 1.5);
  g.gain.exponentialRampToValueAtTime(1e-4, t + d);
  const p = ctx.createStereoPanner();
  p.pan.value = rand(-0.8, 0.8);
  o.connect(lp);
  lp.connect(g);
  g.connect(p);
  p.connect(b.fader);
}

function thunder(b: Bed, t: number, near: boolean) {
  if (near) hiss(b.G, b.fader, t, { d: 0.6, v: 0.1, lp: 6000, lp1: 700 });
  const dt = near ? 0.05 : rand(0.5, 1.5);
  hiss(b.G, b.fader, t + dt, { kind: 'brown', a: 0.4, d: rand(3, 6), v: near ? 0.35 : 0.18, lp: near ? 300 : 180, lp1: 90 });
  hiss(b.G, b.fader, t + dt + rand(0.6, 1.6), { kind: 'brown', a: 0.5, d: 3, v: near ? 0.15 : 0.08, lp: 220 });
}

function fan(b: Bed, v: number) {
  b.loop('pink', [['bandpass', 420, 0.6]], 0.02 * v);
  b.hum(117, 0.004 * v);
  b.hum(234, 0.0015 * v);
}

function murmur(b: Bed, v: number) {
  const g = b.loop('pink', [['bandpass', rand(300, 1000), 1.4], ['lowpass', 2200]], v, { lfo: [rand(3, 5.5), 0.6] });
  b.lfo(rand(0.12, 0.3), v * 0.4, g.gain);
}

function wind(b: Bed, v: number) {
  b.loop('pink', [['bandpass', 450, 0.8]], v, { lfo: [0.06, 0.5], flfo: [0.05, 250] });
  b.loop('white', [['bandpass', 1100, 6]], v * 0.25, { lfo: [0.08, 0.7], flfo: [0.04, 300] });
}

// ───────── beds ─────────

/** Loudness trim per bed (dense rain/traffic beds are pulled down to sit under the music). */
const BED_GAIN: Partial<Record<AmbienceId, number>> = { rain_street: 0.5, train: 0.45, storm: 0.6, city_night: 0.45, rain_window: 0.75, office_night: 0.7 };

const BEDS: Record<AmbienceId, (b: Bed) => void> = {
  rain_street: (b) => {
    b.loop('pink', [['highpass', 500], ['lowpass', 6000]], 0.09, { lfo: [0.05, 0.25] });
    b.loop('drops', [['highpass', 1200]], 0.06);
    b.loop('dropsBig', [['bandpass', 1400, 0.6]], 0.05);
    b.loop('brown', [['lowpass', 220]], 0.12, { lfo: [0.035, 0.35] });
    b.ev(0.3, 1.8, (t) => drip(b, t, 0.025));
    b.ev(8, 22, (t) => carPass(b, t, 0.07, true), 2.5);
  },
  rain_window: (b) => {
    b.loop('pink', [['highpass', 200], ['lowpass', 2000]], 0.1, { lfo: [0.04, 0.3] });
    b.loop('dropsSoft', [['lowpass', 4500], ['highpass', 500]], 0.08);
    fan(b, 0.6);
    b.loop('brown', [['lowpass', 140]], 0.05);
    b.ev(2, 6, (t) => drip(b, t, 0.012, 900));
    b.ev(14, 30, (t) => hiss(b.G, b.fader, t, { kind: 'pink', a: 3, d: 3, v: 0.05, lp: 2500 }));
  },
  room_day: (b) => {
    fan(b, 1);
    b.loop('brown', [['lowpass', 150]], 0.05);
    b.loop('pink', [['bandpass', 350, 0.5]], 0.02, { lfo: [0.03, 0.4] });
    b.ev(4, 13, (t) => birds(b, t), 2);
    b.ev(14, 34, (t) => carPass(b, t, 0.025, false));
  },
  train: (b) => {
    b.loop('brown', [['lowpass', 170]], 0.22, { lfo: [0.09, 0.15] });
    b.loop('pink', [['bandpass', 320, 0.8]], 0.05, { lfo: [0.21, 0.2] });
    b.loop('pink', [['highpass', 2500]], 0.012);
    b.ev(1.05, 1.18, (t) => clack(b, t), 0.4);
    b.ev(18, 40, (t) => blip(b.G, b.fader, t, { f: 2400, f1: 2700, g: 2, a: 0.6, d: 1.6, v: 0.004 }));
  },
  cafe: (b) => {
    for (let i = 0; i < 4; i++) murmur(b, 0.016);
    b.loop('brown', [['lowpass', 200]], 0.04);
    b.ev(2.5, 8, (t) => clink(b, t), 1);
    b.ev(9, 20, (t) => {
      for (let i = 0, n = 3 + Math.floor(Math.random() * 4); i < n; i++) clink(b, t + i * rand(0.15, 0.25), 0.6);
    });
    b.ev(25, 50, (t) => {
      hiss(b.G, b.fader, t, { a: 0.4, d: 2.6, v: 0.012, hp: 2500, lp: 7000 });
      hiss(b.G, b.fader, t + 0.3, { kind: 'pink', a: 0.3, d: 2, v: 0.008, bp: 500, q: 2 });
    }, 8);
    b.ev(12, 28, (t) => hiss(b.G, b.fader, t, { kind: 'pink', a: 0.05, d: 0.35, v: 0.008, bp: 600, bp1: 380, q: 4, pan: rand(-0.7, 0.7) }));
  },
  office_day: (b) => {
    b.loop('pink', [['lowpass', 700]], 0.045);
    b.hum(60, 0.004);
    b.hum(120, 0.002);
    for (let i = 0; i < 2; i++) murmur(b, 0.008);
    b.ev(4, 11, (t) => keyboard(b, t, 0.012), 1.5);
    b.ev(25, 55, (t) => ring(b, t), 10);
  },
  office_night: (b) => {
    b.hum(50, 0.006);
    b.hum(100, 0.003);
    b.hum(150, 0.0012);
    b.hum(100, 0.0025, 'sawtooth', [['bandpass', 3200, 6]], [6.3, 0.4]);
    b.loop('brown', [['lowpass', 260]], 0.08, { lfo: [0.03, 0.3] });
    b.loop('pink', [['lowpass', 500]], 0.02);
    b.ev(20, 45, (t) => carPass(b, t, 0.02, false), 6);
    b.ev(40, 80, (t) => siren(b, t, 0.004), 20);
  },
  boardroom: (b) => {
    b.loop('brown', [['lowpass', 160]], 0.06);
    b.loop('pink', [['lowpass', 900]], 0.012);
    b.hum(55, 0.002);
    b.ev(15, 35, (t) => hiss(b.G, b.fader, t, { kind: 'pink', a: 0.08, d: 0.4, v: 0.006, bp: 420, bp1: 520, q: 9 }), 6);
  },
  storm: (b) => {
    b.loop('pink', [['highpass', 300], ['lowpass', 9000]], 0.16, { lfo: [0.07, 0.3] });
    b.loop('white', [['highpass', 2500]], 0.03, { lfo: [0.11, 0.3] });
    b.loop('drops', [['highpass', 900]], 0.08);
    wind(b, 0.05);
    b.ev(8, 20, (t) => thunder(b, t, Math.random() < 0.35), 3);
  },
  city_night: (b) => {
    b.loop('brown', [['lowpass', 420]], 0.14, { lfo: [0.025, 0.3] });
    b.loop('pink', [['bandpass', 260, 0.7]], 0.035, { lfo: [0.05, 0.4] });
    b.ev(5, 14, (t) => carPass(b, t, 0.05, false), 1.5);
    b.ev(25, 60, (t) => siren(b, t, 0.007), 8);
    b.ev(30, 70, (t) => [392, 494].forEach((f) => blip(b.G, b.fader, t, { f, d: 0.35, a: 0.02, v: 0.004, type: 'sawtooth', lp: 900, pan: 0.4 })), 15);
  },
  wind: (b) => {
    wind(b, 0.09);
    b.ev(5, 12, (t) => hiss(b.G, b.fader, t, { kind: 'pink', a: rand(1.5, 3), d: rand(2, 4), v: 0.04, bp: 500, bp1: 900, q: 0.8, pan: rand(-0.6, 0), pan1: rand(0, 0.6) }));
  },
};

// ───────── controller (live context) ─────────

let cur: Bed | null = null;
let want: AmbienceId | null = null;
let wantLevel = 1;
let fadeS = 3;
let queued = false;

export function setAmbience(id: AmbienceId | null, fadeMs = 3000, level = 1) {
  want = id;
  wantLevel = level;
  fadeS = Math.max(0, fadeMs) / 1000;
  if (!isUnlocked()) {
    if (!queued) {
      queued = true;
      whenUnlocked(() => {
        queued = false;
        applyAmbience();
      });
    }
    return;
  }
  applyAmbience();
}

function applyAmbience() {
  const G = live();
  if (!G) return;
  if (cur && !cur.stopped && cur.id === want) {
    if (cur.level !== wantLevel) {
      cur.level = wantLevel;
      fadeParam(cur.fader.gain, wantLevel * (BED_GAIN[cur.id] ?? 1), G.ctx.currentTime, Math.max(0.3, fadeS));
    }
    return;
  }
  if (cur) {
    cur.stop(fadeS);
    dropSched(cur);
    cur = null;
  }
  if (!want) return;
  cur = new Bed(G, want, G.ctx.currentTime + 0.05, Math.max(0.05, fadeS), wantLevel);
  addSched(cur);
}
