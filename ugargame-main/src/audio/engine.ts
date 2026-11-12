/**
 * Audio engine: lazy AudioContext, mixing graph and the shared lookahead ticker.
 * buses (music/ambience → duck, sfx, voice) → master → glue compressor → limiter → soft clip → analyser.
 * `buildGraph` also works on an OfflineAudioContext (used by render.ts for automated checks).
 */
import { getSettings, useSettings, type Settings } from '../game/settings';
import { patchSnap } from './state';
import type { NoiseKind } from './synth';

export type BusId = 'music' | 'ambience' | 'sfx' | 'voice';

export interface Graph {
  ctx: BaseAudioContext;
  master: GainNode;
  /** Bus inputs (instruments connect here). */
  bus: Record<BusId, GainNode>;
  /** Settings volume stage per bus. */
  vol: Record<BusId, GainNode>;
  /** Voice-over ducking stage for music + ambience. */
  duck: GainNode;
  musicVerb: GainNode;
  sfxVerb: GainNode;
  analyser: AnalyserNode;
  nb: NoiseBank;
}

/** Perceptual slider → gain. */
export const vcurve = (v: number) => Math.pow(Math.min(1, Math.max(0, v || 0)), 1.5);

// ───────── generated buffers (noise, crackle, rain drops, impulse responses) ─────────

type Gen = (sr: number) => (i: number) => number;

function makeBuffer(ctx: BaseAudioContext, ch: number, sec: number, gen: Gen, norm: { rms?: number; peak?: number }) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * sec);
  const x = Math.floor(sr * 0.04);
  const b = ctx.createBuffer(ch, n, sr);
  for (let c = 0; c < ch; c++) {
    const g = gen(sr);
    const tmp = new Float32Array(n + x);
    for (let i = 0; i < n + x; i++) tmp[i] = g(i);
    // seamless loop: crossfade the overshoot into the head
    for (let i = 0; i < x; i++) {
      const w = i / x;
      tmp[i] = tmp[i] * w + tmp[n + i] * (1 - w);
    }
    let k = 1;
    if (norm.rms) {
      let s = 0;
      for (let i = 0; i < n; i++) s += tmp[i] * tmp[i];
      k = norm.rms / (Math.sqrt(s / n) || 1);
    } else if (norm.peak) {
      let p = 0;
      for (let i = 0; i < n; i++) p = Math.max(p, Math.abs(tmp[i]));
      k = norm.peak / (p || 1);
    }
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = tmp[i] * k;
  }
  return b;
}

const white: Gen = () => () => Math.random() * 2 - 1;
const pink: Gen = () => {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return o;
  };
};
const brown: Gen = () => {
  let l = 0;
  return () => (l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02);
};
const crackle: Gen = (sr) => {
  let pop = 0, k = 0, y = 0;
  return () => {
    const r = Math.random();
    if (r < 10 / sr) {
      pop = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? -1 : 1);
      k = 0.55 + Math.random() * 0.3;
    } else if (r < 10.6 / sr) {
      pop = (Math.random() < 0.5 ? -0.9 : 0.9) * Math.random();
      k = 0.94;
    }
    const x = pop + (Math.random() * 2 - 1) * 0.006;
    pop *= k;
    y += 0.55 * (x - y);
    return y;
  };
};
/** Sparse damped sinusoids: rain drops on surfaces. */
const drops = (rate: number, f0: number, f1: number, d0: number, d1: number): Gen => (sr) => {
  const act: { ph: number; inc: number; a: number; k: number }[] = [];
  return () => {
    if (Math.random() < rate / sr) {
      const f = f0 * Math.pow(f1 / f0, Math.random());
      act.push({ ph: 0, inc: (2 * Math.PI * f) / sr, a: Math.pow(Math.random(), 2) * (0.3 + Math.random() * 0.7), k: Math.exp(-1 / ((d0 + Math.random() * (d1 - d0)) * sr)) });
    }
    let s = 0;
    for (let j = act.length - 1; j >= 0; j--) {
      const v = act[j];
      s += Math.sin(v.ph) * v.a;
      v.ph += v.inc;
      v.a *= v.k;
      if (v.a < 1e-4) act.splice(j, 1);
    }
    return s;
  };
};

const GENS: Record<NoiseKind, (c: BaseAudioContext) => AudioBuffer> = {
  white: (c) => makeBuffer(c, 1, 2.5, white, { rms: 0.3 }),
  pink: (c) => makeBuffer(c, 2, 6, pink, { rms: 0.3 }),
  brown: (c) => makeBuffer(c, 2, 6, brown, { rms: 0.3 }),
  crackle: (c) => makeBuffer(c, 2, 4.7, crackle, { peak: 0.8 }),
  drops: (c) => makeBuffer(c, 2, 3.3, drops(170, 1500, 6000, 0.0015, 0.006), { peak: 0.9 }),
  dropsSoft: (c) => makeBuffer(c, 2, 3.7, drops(85, 700, 2800, 0.004, 0.014), { peak: 0.9 }),
  dropsBig: (c) => makeBuffer(c, 2, 4.1, drops(22, 500, 2200, 0.01, 0.03), { peak: 0.9 }),
};

export class NoiseBank {
  private ctx: BaseAudioContext;
  private cache = new Map<string, AudioBuffer>();
  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }
  get(k: NoiseKind): AudioBuffer {
    let b = this.cache.get(k);
    if (!b) this.cache.set(k, (b = GENS[k](this.ctx)));
    return b;
  }
  /** Generated stereo room/hall impulse response with HF damping. */
  ir(sec: number): AudioBuffer {
    const key = 'ir' + sec;
    let b = this.cache.get(key);
    if (b) return b;
    const sr = this.ctx.sampleRate;
    const n = Math.floor(sr * sec);
    const pre = Math.floor(sr * 0.016);
    b = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < n; i++) {
        const x = (i - pre) / (n - pre);
        lp += (0.9 - 0.75 * x) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - x, 2) * Math.exp(-x * 3.2);
      }
      for (let r = 0; r < 7; r++) d[pre + Math.floor(sr * (0.003 + Math.random() * 0.045))] += (Math.random() - 0.5) * 0.7;
    }
    this.cache.set(key, b);
    return b;
  }
}

function clipCurve() {
  const n = 4096;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    c[i] = Math.sign(x) * (a < 0.75 ? a : 0.75 + 0.2 * Math.tanh((a - 0.75) / 0.2));
  }
  return c;
}

const BUSES: BusId[] = ['music', 'ambience', 'sfx', 'voice'];

export function buildGraph(ctx: BaseAudioContext): Graph {
  const gn = (v = 1) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };
  const master = gn();
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.knee.value = 12;
  glue.ratio.value = 2.2;
  glue.attack.value = 0.012;
  glue.release.value = 0.25;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -4;
  lim.knee.value = 2;
  lim.ratio.value = 16;
  lim.attack.value = 0.002;
  lim.release.value = 0.12;
  const clip = ctx.createWaveShaper();
  clip.curve = clipCurve();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  master.connect(glue);
  glue.connect(lim);
  lim.connect(clip);
  clip.connect(analyser);
  analyser.connect(ctx.destination);
  const duck = gn();
  duck.connect(master);
  const bus = {} as Record<BusId, GainNode>;
  const vol = {} as Record<BusId, GainNode>;
  for (const id of BUSES) {
    bus[id] = gn();
    vol[id] = gn();
    bus[id].connect(vol[id]);
    vol[id].connect(id === 'music' || id === 'ambience' ? duck : master);
  }
  const nb = new NoiseBank(ctx);
  const verb = (sec: number, into: GainNode, wet: number) => {
    const send = gn();
    const cv = ctx.createConvolver();
    cv.buffer = nb.ir(sec);
    const w = gn(wet);
    send.connect(cv);
    cv.connect(w);
    w.connect(into);
    return send;
  };
  return { ctx, master, bus, vol, duck, musicVerb: verb(2.8, bus.music, 0.9), sfxVerb: verb(1.4, bus.sfx, 0.8), analyser, nb };
}

// ───────── live context ─────────

let G: Graph | null = null;
let unlocked = false;
const onUnlock: (() => void)[] = [];

export const live = (): Graph | null => G;
export const isUnlocked = () => unlocked;
export function whenUnlocked(fn: () => void) {
  if (unlocked) fn();
  else onUnlock.push(fn);
}

function applySettings(g: Graph, s: Settings, now = false) {
  const t = g.ctx.currentTime;
  const set = (p: AudioParam, v: number) => (now ? (p.value = v) : p.setTargetAtTime(v, t, 0.05));
  set(g.master.gain, s.muted ? 0 : vcurve(s.master));
  set(g.vol.music.gain, vcurve(s.music));
  set(g.vol.ambience.gain, vcurve(s.ambience));
  set(g.vol.sfx.gain, vcurve(s.sfx));
  set(g.vol.voice.gain, vcurve(s.voice));
}

function create(): Graph | null {
  if (G) return G;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    G = buildGraph(new AC({ latencyHint: 'interactive' }));
  } catch {
    return null;
  }
  const g = G;
  applySettings(g, getSettings(), true);
  useSettings.subscribe((s) => applySettings(g, s));
  (g.ctx as AudioContext).addEventListener('statechange', markUnlocked);
  return g;
}

function markUnlocked() {
  if (unlocked || !G || G.ctx.state !== 'running') return;
  unlocked = true;
  patchSnap({ unlocked: true });
  if (!timer) timer = setInterval(tick, 90);
  onUnlock.splice(0).forEach((f) => f());
}

/** Create/resume the context. Must run inside a user gesture; idempotent and cheap. */
export function unlockEngine() {
  const g = create();
  if (!g) return;
  const ctx = g.ctx as AudioContext;
  if (ctx.state === 'running') return markUnlocked();
  try {
    // iOS: a silent buffer started inside the gesture unlocks output
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    b.connect(ctx.destination);
    b.start();
  } catch {
    /* ignore */
  }
  ctx.resume().then(markUnlocked, () => {});
}

/** Duck music + ambience while a voice speaks (≈ −9 dB). */
export function duck(on: boolean) {
  if (!G) return;
  G.duck.gain.setTargetAtTime(on ? 0.355 : 1, G.ctx.currentTime, on ? 0.12 : 0.35);
}

let lvBuf: Float32Array<ArrayBuffer> | null = null;
/** Output loudness 0..1 (RMS, dB-mapped) for visualizers. */
export function level(): number {
  if (!G || !unlocked) return 0;
  const a = G.analyser;
  lvBuf ??= new Float32Array(a.fftSize);
  a.getFloatTimeDomainData(lvBuf);
  let s = 0;
  for (let i = 0; i < lvBuf.length; i++) s += lvBuf[i] * lvBuf[i];
  const rms = Math.sqrt(s / lvBuf.length);
  if (rms < 1e-5) return 0;
  return Math.min(1, Math.max(0, (20 * Math.log10(rms) + 54) / 44));
}

// ───────── lookahead ticker (music sequencers, ambience events) ─────────

export interface Sched {
  scheduleUntil(t: number): void;
}
const scheds = new Set<Sched>();
let timer: ReturnType<typeof setInterval> | undefined;

export const addSched = (s: Sched) => void scheds.add(s);
export const dropSched = (s: Sched) => void scheds.delete(s);

function tick() {
  if (!G || !scheds.size) return;
  const ahead = typeof document !== 'undefined' && document.hidden ? 1.6 : 0.4;
  const t = G.ctx.currentTime + ahead;
  scheds.forEach((s) => {
    try {
      s.scheduleUntil(t);
    } catch (e) {
      console.warn('[audio]', e);
    }
  });
}
