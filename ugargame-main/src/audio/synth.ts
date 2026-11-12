/** Low-level synthesis primitives shared by music, ambience and SFX. */
import type { Graph } from './engine';

export type NoiseKind = 'white' | 'pink' | 'brown' | 'crackle' | 'drops' | 'dropsSoft' | 'dropsBig';

// Pitch multiplier for SFX `rate` and the latest end time of the voices built by a recipe.
let RATE = 1;
let END = 0;
export const setRate = (r: number) => void (RATE = r > 0 && Number.isFinite(r) ? r : 1);
export const resetEnd = () => void (END = 0);
export const lastEnd = () => END;
const mark = (e: number) => (e > END ? (END = e) : e, e);

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gainN(ctx: BaseAudioContext, v = 0) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

export function filter(ctx: BaseAudioContext, type: BiquadFilterType, f: number, q = 0.707) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = clamp(f, 10, 20000);
  b.Q.value = q;
  return b;
}

export function link(a: AudioNode, b: AudioNode) {
  a.connect(b);
  return b;
}

export function oscN(ctx: BaseAudioContext, type: OscillatorType, f: number, t: number, end: number, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  o.start(t);
  o.stop(end);
  o.onended = () => o.disconnect();
  return o;
}

export function noiseSrc(G: Graph, kind: NoiseKind, t: number, end: number) {
  const b = G.nb.get(kind);
  const s = G.ctx.createBufferSource();
  s.buffer = b;
  const len = end - t;
  s.loop = len > b.duration * 0.8;
  s.start(t, Math.random() * (s.loop ? b.duration : Math.max(0.001, b.duration - len)));
  s.stop(end);
  s.onended = () => s.disconnect();
  return s;
}

/** Percussive envelope: linear attack, exponential decay. Returns end time. */
export function perc(p: AudioParam, t: number, v: number, a: number, d: number) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(Math.max(v, 1e-4), t + a);
  p.exponentialRampToValueAtTime(1e-4, t + a + d);
  p.setValueAtTime(0, t + a + d + 0.002);
  return t + a + d;
}

/** Sustained envelope; releases at t+hold. Returns end time. */
export function adsr(p: AudioParam, t: number, v: number, a: number, d: number, s: number, hold: number, r: number) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(v, t + a);
  if (d > 0 && s < 1) p.setTargetAtTime(v * s, t + a, d / 3);
  const e = t + Math.max(hold, a + 0.002);
  p.setTargetAtTime(0, e, Math.max(0.005, r / 4));
  return e + r * 1.3;
}

/** Equal-power-ish fade from the current value; never throws. */
export function fadeParam(p: AudioParam, to: number, t: number, dur: number) {
  const from = p.value;
  try {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
    else p.cancelScheduledValues(0);
    p.setValueAtTime(from, t);
    if (dur < 0.02) return void p.setValueAtTime(to, t + 0.005);
    const n = 32;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      c[i] = to > from ? from + (to - from) * Math.sin((x * Math.PI) / 2) : to + (from - to) * Math.cos((x * Math.PI) / 2);
    }
    p.setValueCurveAtTime(c, t + 0.005, dur);
  } catch {
    p.setTargetAtTime(to, t, Math.max(0.01, dur / 3));
  }
}

function route(ctx: BaseAudioContext, g: AudioNode, out: AudioNode, pan?: number) {
  if (pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p);
    p.connect(out);
  } else g.connect(out);
}

export interface BlipO {
  f: number;
  /** Glide target frequency, reached after `g` seconds. */
  f1?: number;
  g?: number;
  type?: OscillatorType;
  a?: number;
  d: number;
  v: number;
  lp?: number;
  hp?: number;
  q?: number;
  pan?: number;
  det?: number;
}

/** Enveloped oscillator (with optional glide + filters). */
export function blip(G: Graph, out: AudioNode, t: number, o: BlipO): number {
  const ctx = G.ctx;
  const a = o.a ?? 0.002;
  const end = t + a + o.d;
  const osc = oscN(ctx, o.type ?? 'sine', o.f * RATE, t, end + 0.01, o.det ?? 0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 * RATE), t + (o.g ?? a + o.d));
  const g = gainN(ctx);
  perc(g.gain, t, o.v, a, o.d);
  let n: AudioNode = osc;
  if (o.hp) n = link(n, filter(ctx, 'highpass', o.hp, 0.7));
  if (o.lp) n = link(n, filter(ctx, 'lowpass', o.lp, o.q ?? 0.7));
  n.connect(g);
  route(ctx, g, out, o.pan);
  return mark(end);
}

export interface HissO {
  d: number;
  v: number;
  /** Attack; > 0.02 gives an exponential swell. */
  a?: number;
  kind?: NoiseKind;
  hp?: number;
  bp?: number;
  bp1?: number;
  lp?: number;
  lp1?: number;
  q?: number;
  pan?: number;
  pan1?: number;
}

/** Enveloped, filtered noise with optional sweeps and auto-pan. */
export function hiss(G: Graph, out: AudioNode, t: number, o: HissO): number {
  const ctx = G.ctx;
  const a = o.a ?? 0.002;
  const end = t + a + o.d;
  let n: AudioNode = noiseSrc(G, o.kind ?? 'white', t, end + 0.02);
  if (o.hp) n = link(n, filter(ctx, 'highpass', o.hp * RATE, 0.7));
  const sweep = (type: BiquadFilterType, f0: number, f1: number | undefined, q: number) => {
    const f = filter(ctx, type, f0 * RATE, q);
    if (f1) {
      f.frequency.setValueAtTime(f0 * RATE, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * RATE), end);
    }
    n = link(n, f);
  };
  if (o.bp) sweep('bandpass', o.bp, o.bp1, o.q ?? 1);
  if (o.lp) sweep('lowpass', o.lp, o.lp1, o.bp ? 0.7 : (o.q ?? 0.7));
  const g = gainN(ctx);
  if (a > 0.02) {
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(Math.max(o.v, 2e-4), t + a);
    g.gain.exponentialRampToValueAtTime(1e-4, end);
    g.gain.setValueAtTime(0, end + 0.002);
  } else perc(g.gain, t, o.v, a, o.d);
  n.connect(g);
  if (o.pan !== undefined || o.pan1 !== undefined) {
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(o.pan ?? 0, t);
    if (o.pan1 !== undefined) p.pan.linearRampToValueAtTime(o.pan1, end);
    g.connect(p);
    p.connect(out);
  } else g.connect(out);
  return mark(end);
}

/** Two-operator FM bell / glass. */
export function bell(G: Graph, out: AudioNode, t: number, o: { f: number; ratio?: number; idx?: number; d: number; v: number; a?: number; pan?: number; lp?: number }): number {
  const ctx = G.ctx;
  const f = o.f * RATE;
  const a = o.a ?? 0.002;
  const end = t + a + o.d;
  const car = oscN(ctx, 'sine', f, t, end + 0.01);
  const mod = oscN(ctx, 'sine', f * (o.ratio ?? 3.5), t, end + 0.01);
  const idx = f * (o.idx ?? 1.2);
  const mg = gainN(ctx);
  mg.gain.setValueAtTime(idx, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(0.01, idx * 0.08), t + a + o.d * 0.5);
  mod.connect(mg);
  mg.connect(car.frequency);
  const g = gainN(ctx);
  perc(g.gain, t, o.v, a, o.d);
  let n: AudioNode = car;
  if (o.lp) n = link(n, filter(ctx, 'lowpass', o.lp, 0.7));
  n.connect(g);
  route(ctx, g, out, o.pan);
  return mark(end);
}

/** Pitch-dropping sine: kicks, thumps, sub drops. */
export function thump(G: Graph, out: AudioNode, t: number, o: { f: number; f1: number; d: number; v: number; g?: number; pan?: number }) {
  return blip(G, out, t, { f: o.f, f1: o.f1, g: o.g ?? Math.min(0.15, o.d * 0.4), d: o.d, v: o.v, pan: o.pan, lp: 700 });
}

/** Phone vibration motor: filtered saw with rattle AM. */
export function buzz(G: Graph, out: AudioNode, t: number, d: number, v: number, f = 150, table = false) {
  const ctx = G.ctx;
  const end = t + d + 0.06;
  const o = oscN(ctx, 'sawtooth', f * RATE, t, end);
  const lp = filter(ctx, 'lowpass', 420, 1.2);
  const am = oscN(ctx, 'sine', 31, t, end);
  const amg = gainN(ctx, 0.45);
  const m = gainN(ctx, 0.55);
  am.connect(amg);
  amg.connect(m.gain);
  const g = gainN(ctx);
  adsr(g.gain, t, v, 0.015, 0, 1, d, 0.04);
  o.connect(lp);
  lp.connect(m);
  m.connect(g);
  g.connect(out);
  if (table) hiss(G, out, t, { a: 0.03, d, v: v * 0.18, bp: 2400, q: 3 });
  return mark(end);
}
