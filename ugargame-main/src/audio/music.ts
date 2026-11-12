/**
 * Generative soundtrack. A bar-level lookahead sequencer renders the compositions in songs.ts:
 * chord symbols → voice-led voicings → instruments (detuned-saw pads, FM e-piano, plucks, sub bass,
 * lo-fi / house / cinematic drums, strings, bells, leads, risers). Works on OfflineAudioContext too.
 */
import type { MusicTrack } from './index';
import { addSched, dropSched, isUnlocked, live, whenUnlocked, type Graph } from './engine';
import { MODES, MOTIFS, SONGS, type Inst, type LeadWave, type Section, type Song } from './songs';
import { adsr, blip, fadeParam, filter, gainN, hash, hiss, mtof, noiseSrc, oscN, perc, rng } from './synth';

export interface Chord { root: number; bass: number; iv: number[] }
interface Seg { t: number; d: number; beats: number; c: Chord }
interface Bar { t: number; beat: number; dur: number; segs: Seg[]; sec: Section; name: string; sb: number; last: boolean; e: number }

// ───────── harmony ─────────

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const Q: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], 'maj7#11': [0, 4, 7, 11, 18],
  m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17], m7b5: [0, 3, 6, 10], dim: [0, 3, 6],
  '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 14], '13': [0, 4, 10, 14, 21], '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14],
  '13sus': [0, 5, 10, 14, 21], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15], '7#5': [0, 4, 8, 10],
};
const chordCache = new Map<string, Chord>();
export function chord(sym: string): Chord {
  let c = chordCache.get(sym);
  if (c) return c;
  const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(sym.trim());
  if (!m || !Q[m[3]]) throw new Error(`audio: bad chord "${sym}"`);
  const acc = (a?: string) => (a === '#' ? 1 : a === 'b' ? -1 : 0);
  const root = (PC[m[1]] + acc(m[2]) + 12) % 12;
  c = { root, bass: m[4] ? (PC[m[4]] + acc(m[5]) + 12) % 12 : root, iv: Q[m[3]] };
  chordCache.set(sym, c);
  return c;
}

/** Importance of a chord tone for voicings: 3rd/sus, 7th/6th, colour tones, 9/13, 11, 5th, root. */
function rank(iv: number, third: boolean) {
  const r = iv % 12;
  if (r === 3 || r === 4) return 0;
  if ((r === 2 || r === 5) && iv < 12 && !third) return 0;
  if (r === 10 || r === 11 || (r === 9 && iv < 12)) return 1;
  if (r === 6 || r === 8) return 1.5;
  if (iv === 13 || iv === 14 || iv === 15 || iv === 21) return 2;
  if (iv === 17 || iv === 18) return 2.5;
  if (r === 7) return 3;
  return 5;
}
/** `withBass`: include the bass note (rootless voicings are only right while a bass instrument plays). */
export function pcsFor(c: Chord, n: number, withBass = false): number[] {
  const third = c.iv.some((i) => i === 3 || i === 4);
  let ivs = [...c.iv].sort((a, b) => rank(a, third) - rank(b, third));
  if (withBass) ivs = ivs.filter((i) => (c.root + i) % 12 !== c.bass);
  const pcs = ivs.slice(0, withBass ? n - 1 : n).map((i) => (c.root + i) % 12);
  if (withBass) pcs.push(c.bass);
  while (pcs.length < n) pcs.push(pcs.length % 2 ? c.root : (c.root + 7) % 12);
  return pcs;
}
const pcOf = (m: number) => ((m % 12) + 12) % 12;

/**
 * Voicing for `pcs` closest to the previous one: tries every inversion (close, drop-2, drop-3) in three
 * octaves and scores range, clusters (minor/major seconds), wide holes, register and voice movement.
 */
export function voiceLead(prev: number[] | undefined, pcs: number[], lo: number, hi: number): number[] {
  const n = pcs.length;
  const mid = (lo + hi) / 2;
  let best: number[] = [];
  let bs = Infinity;
  const consider = (v: number[]) => {
    v.sort((a, b) => a - b);
    let sc = Math.abs(v.reduce((a, b) => a + b, 0) / n - mid) * 0.4;
    for (let i = 0; i < n; i++) sc += Math.max(0, lo - v[i], v[i] - hi) * 3;
    for (let i = 0; i < n - 1; i++) {
      const g = v[i + 1] - v[i];
      if (g === 1) sc += 10;
      else if (g === 2) sc += v[i] < 60 ? 5 : 1.5;
      else if (g > 9 && i > 0) sc += (g - 9) * 1.5;
    }
    if (prev && prev.length === n) sc += v.reduce((a, m, i) => a + Math.abs(m - prev[i]), 0) + Math.abs(v[n - 1] - prev[n - 1]) * 0.5;
    if (sc < bs) {
      bs = sc;
      best = v.slice();
    }
  };
  for (let r = 0; r < n; r++) {
    const order = pcs.slice(r).concat(pcs.slice(0, r));
    for (const oct of [-12, 0, 12]) {
      const v: number[] = [];
      let cur = lo - 1 + oct;
      for (const pc of order) {
        let m = cur + 1;
        while (pcOf(m) !== pc) m++;
        v.push(m);
        cur = m;
      }
      consider(v.slice());
      if (n >= 4) {
        consider(v.map((m, i) => (i === n - 2 ? m - 12 : m)));
        consider(v.map((m, i) => (i === n - 3 ? m - 12 : m)));
      }
    }
  }
  return best;
}

const barCache = new WeakMap<Section, string[][]>();
export const barsOf = (sec: Section) => {
  let b = barCache.get(sec);
  if (!b) barCache.set(sec, (b = sec.c.split('|').map((x) => x.trim().split(/\s+/))));
  return b;
};

type MotifNote = [pos8: number, len8: number, deg: number | 'L'];
const motifCache = new Map<string, MotifNote[][]>();
function motif(name: string): MotifNote[][] {
  let m = motifCache.get(name);
  if (m) return m;
  m = (MOTIFS[name] ?? '').split('|').map((bar) => {
    let p = 0;
    const out: MotifNote[] = [];
    for (const tok of bar.trim().split(/\s+/)) {
      if (tok[0] === 'r') p += +tok.slice(1);
      else {
        const [d, l] = tok.split(':');
        out.push([p, +l, d === 'L' ? 'L' : +d]);
        p += +l;
      }
    }
    return out;
  });
  motifCache.set(name, m);
  return m;
}

/** Parse every chord / motif once (throws on typos) — used by the offline checks. */
export function validateSongs() {
  for (const s of Object.values(SONGS)) {
    for (const sec of Object.values(s.sec)) {
      barsOf(sec).forEach((bar) => bar.forEach(chord));
      if (sec.m) motif(sec.m);
    }
    for (const n of s.form.split(' ')) if (!s.sec[n]) throw new Error(`audio: unknown section ${n}`);
  }
}

// ───────── instruments ─────────

const hum = (s: Sequencer, ms: number) => (s.rnd() - 0.5) * ms * 0.002;

function sawPad(s: Sequencer, out: AudioNode, t: number, d: number, notes: number[], o: NonNullable<Inst['pad']>, e: number) {
  const ctx = s.ctx;
  const atk = Math.min(o.atk ?? 0.8, d * 0.6);
  const rel = o.rel ?? 1.2;
  const cut = o.cut * (0.75 + 0.5 * e);
  const f = filter(ctx, 'lowpass', cut * 0.55, o.q ?? 0.8);
  f.frequency.setValueAtTime(cut * 0.55, t);
  f.frequency.linearRampToValueAtTime(cut, t + d * 0.5);
  f.frequency.linearRampToValueAtTime(cut * 0.65, t + d + rel);
  const g = gainN(ctx);
  const end = adsr(g.gain, t, 1 / Math.sqrt(notes.length * 2), atk, 0, 1, d, rel);
  f.connect(g);
  g.connect(out);
  const det = o.detune ?? 8;
  for (const m of notes) for (const sg of [-1, 1]) oscN(ctx, o.wave ?? 'sawtooth', mtof(m), t, end, sg * det + (s.rnd() - 0.5) * 4).connect(f);
}

/** FM electric piano: 1:1 modulator for warmth + a fast high "tine" transient. */
function epiano(s: Sequencer, out: AudioNode, t: number, m: number, vel: number, d: number) {
  const ctx = s.ctx;
  const f = mtof(m);
  const end = t + d + 0.5;
  const car = oscN(ctx, 'sine', f, t, end, (s.rnd() - 0.5) * 6);
  const mod = oscN(ctx, 'sine', f, t, end);
  const mg = gainN(ctx);
  mg.gain.setValueAtTime(f * (0.8 + 1.5 * vel), t);
  mg.gain.setTargetAtTime(f * 0.16, t, 0.35);
  mod.connect(mg);
  mg.connect(car.frequency);
  const tine = oscN(ctx, 'sine', Math.min(f * 14, 16000), t, t + 0.12);
  const tg = gainN(ctx);
  tg.gain.setValueAtTime(f * 0.8 * vel, t);
  tg.gain.setTargetAtTime(0, t, 0.018);
  tine.connect(tg);
  tg.connect(car.frequency);
  const a = gainN(ctx);
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(vel * 0.45, t + 0.004);
  a.gain.setTargetAtTime(vel * 0.16, t + 0.004, 0.5);
  a.gain.setTargetAtTime(0, t + d, 0.09);
  car.connect(a);
  a.connect(out);
}

function pluck(s: Sequencer, out: AudioNode, t: number, m: number, vel: number, d: number) {
  const ctx = s.ctx;
  const f = mtof(m);
  const end = t + d + 0.35;
  const fl = filter(ctx, 'lowpass', 500, 1.6);
  fl.frequency.setValueAtTime(Math.min(12000, 500 + 4200 * vel), t);
  fl.frequency.setTargetAtTime(f * 1.2 + 200, t, 0.09);
  const g = gainN(ctx);
  perc(g.gain, t, vel * 0.45, 0.003, d + 0.3);
  oscN(ctx, 'sawtooth', f, t, end, -5).connect(fl);
  oscN(ctx, 'triangle', f, t, end, 5).connect(fl);
  fl.connect(g);
  g.connect(out);
}

function bellN(s: Sequencer, out: AudioNode, t: number, m: number, vel: number, dec: number) {
  const ctx = s.ctx;
  const f = mtof(m);
  const end = t + dec + 0.05;
  const car = oscN(ctx, 'sine', f, t, end);
  const mod = oscN(ctx, 'sine', f * 3.5, t, end);
  const mg = gainN(ctx);
  mg.gain.setValueAtTime(f * 1.3 * vel, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f * 0.05), t + dec * 0.6);
  mod.connect(mg);
  mg.connect(car.frequency);
  const a = gainN(ctx);
  perc(a.gain, t, vel * 0.35, 0.002, dec);
  car.connect(a);
  a.connect(out);
}

function leadN(s: Sequencer, out: AudioNode, t: number, m: number, vel: number, d: number, wave: LeadWave) {
  if (wave === 'bell') return bellN(s, out, t, m, vel * 0.9, Math.max(0.8, d + 0.6));
  const ctx = s.ctx;
  const f = mtof(m);
  const a = gainN(ctx);
  const end = adsr(a.gain, t, vel * 0.32, wave === 'saw' ? 0.035 : 0.025, 0.3, 0.78, d, 0.22);
  const vib = oscN(ctx, 'sine', 4.8 + s.rnd() * 0.8, t, end);
  const vg = gainN(ctx);
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(d > 0.5 ? 11 : 3, t + Math.min(0.6, d) + 0.01);
  vib.connect(vg);
  const osc = (type: OscillatorType, fr: number, det: number, lvl: number, dest: AudioNode) => {
    const o = oscN(ctx, type, fr, t, end, det);
    vg.connect(o.detune);
    const g = gainN(ctx, lvl);
    o.connect(g);
    g.connect(dest);
  };
  if (wave === 'saw') {
    const fl = filter(ctx, 'lowpass', 700, 1);
    fl.frequency.setValueAtTime(700, t);
    fl.frequency.linearRampToValueAtTime(900 + 1700 * vel, t + 0.08);
    fl.frequency.setTargetAtTime(1300, t + 0.08, 0.3);
    osc('sawtooth', f, -7, 0.5, fl);
    osc('sawtooth', f, 7, 0.5, fl);
    fl.connect(a);
  } else if (wave === 'flute') {
    osc('triangle', f, 0, 0.9, a);
    osc('sine', f * 2, 0, 0.08, a);
    hiss(s.G, a, t, { a: 0.04, d: Math.max(0.1, d), v: 0.035, bp: Math.min(f * 2, 9000), q: 2 });
  } else {
    osc('sine', f, 0, 0.85, a);
    osc('triangle', f * 2, 0, 0.13, a);
  }
  a.connect(out);
}

function stringsN(s: Sequencer, out: AudioNode, t: number, d: number, notes: number[], atkIn: number, e: number) {
  const ctx = s.ctx;
  const atk = Math.min(atkIn, d * 0.7);
  const fl = filter(ctx, 'lowpass', 1400 + 2400 * e, 0.4);
  const g = gainN(ctx);
  const end = adsr(g.gain, t, 1 / Math.sqrt(notes.length * 3), atk, 0, 1, d, 1.3);
  fl.connect(g);
  g.connect(out);
  const vib = s.vib();
  for (const m of notes)
    for (const dt of [-11, 0, 12]) {
      const o = oscN(ctx, 'sawtooth', mtof(m), t, end, dt + (s.rnd() - 0.5) * 5);
      vib.connect(o.detune);
      o.onended = () => {
        o.disconnect();
        try {
          vib.disconnect(o.detune);
        } catch {
          /* already gone */
        }
      };
      o.connect(fl);
    }
}

function bassN(s: Sequencer, out: AudioNode, t: number, m: number, vel: number, d: number, w: 'sub' | 'saw' | 'pluck') {
  const ctx = s.ctx;
  const f = mtof(m);
  const a = gainN(ctx);
  if (w === 'sub') {
    const end = adsr(a.gain, t, vel * 0.5, 0.008, 0.3, 0.75, d, 0.08);
    oscN(ctx, 'sine', f, t, end).connect(a);
    const h = gainN(ctx, 0.22);
    oscN(ctx, 'triangle', f * 2, t, end).connect(h);
    h.connect(a);
  } else {
    const saw = w === 'saw';
    const fl = filter(ctx, 'lowpass', 300, saw ? 4 : 1);
    fl.frequency.setValueAtTime(saw ? 300 + 1500 * vel : 400 + 900 * vel, t);
    fl.frequency.setTargetAtTime(f * 1.5 + 80, t, saw ? 0.07 : 0.12);
    const end = saw ? adsr(a.gain, t, vel * 0.42, 0.004, 0.25, 0.7, d, 0.06) : adsr(a.gain, t, vel * 0.6, 0.006, 0.5, 0.3, d, 0.12);
    oscN(ctx, saw ? 'sawtooth' : 'triangle', f, t, end).connect(fl);
    const sub = gainN(ctx, 0.5);
    oscN(ctx, 'sine', f, t, end).connect(sub);
    sub.connect(a);
    fl.connect(a);
  }
  a.connect(out);
}

type Kit = NonNullable<Inst['drums']>['kit'];
function kick(s: Sequencer, out: AudioNode, t: number, v: number, kit: Kit) {
  const big = kit === 'cine';
  blip(s.G, out, t, { f: kit === 'house' ? 165 : 140, f1: big ? 40 : 48, g: 0.09, d: kit === 'brush' ? 0.22 : big ? 0.55 : 0.32, v: v * 0.9 });
  if (kit !== 'brush') hiss(s.G, out, t, { d: 0.01, v: v * (kit === 'house' ? 0.16 : 0.08), hp: 2200 });
}
function snare(s: Sequencer, out: AudioNode, t: number, v: number, kit: Kit) {
  hiss(s.G, out, t, { d: kit === 'lofi' ? 0.15 : 0.18, v: v * 0.42, bp: 1900, q: 0.8 });
  blip(s.G, out, t, { f: 190, f1: 150, g: 0.05, d: 0.08, v: v * 0.3, type: 'triangle' });
}
function clap(s: Sequencer, out: AudioNode, t: number, v: number) {
  for (let k = 0; k < 3; k++) hiss(s.G, out, t + k * 0.011, { d: 0.012, v: v * 0.3, bp: 1150, q: 1.3 });
  hiss(s.G, out, t + 0.03, { d: 0.14, v: v * 0.26, bp: 1100, q: 1.1 });
}
function rim(s: Sequencer, out: AudioNode, t: number, v: number) {
  blip(s.G, out, t, { f: 1700, d: 0.025, v: v * 0.16, type: 'triangle' });
  hiss(s.G, out, t, { d: 0.018, v: v * 0.16, bp: 3200, q: 2 });
}
function tom(s: Sequencer, out: AudioNode, t: number, v: number, f: number) {
  blip(s.G, out, t, { f: f * 1.5, f1: f, g: 0.08, d: 0.45, v: v * 0.7 });
  hiss(s.G, out, t, { d: 0.1, v: v * 0.14, lp: 1200 });
}

// ───────── sequencer ─────────

export class Sequencer {
  readonly id: MusicTrack;
  readonly G: Graph;
  readonly ctx: BaseAudioContext;
  readonly S: Song;
  readonly beat: number;
  readonly form: string[];
  readonly rnd: () => number;
  stopped = false;
  mel = 0;
  next: number;
  fi = 0;
  sb = 0;
  private colour: BiquadFilterNode;
  private fader: GainNode;
  private verbF: GainNode;
  private dlyIn: GainNode;
  private strips = new Map<string, GainNode>();
  private pumps: { g: GainNode; depth: number }[] = [];
  private prev = new Map<string, number[]>();
  private keep: AudioScheduledSourceNode[] = [];
  private vibG: GainNode | null = null;

  constructor(G: Graph, id: MusicTrack, start: number, fade: number) {
    this.G = G;
    this.ctx = G.ctx;
    this.id = id;
    this.S = SONGS[id];
    this.form = this.S.form.split(' ');
    this.beat = 60 / this.S.bpm;
    this.next = start;
    this.rnd = rng(hash(id) ^ (Date.now() & 0xffffff));
    const ctx = this.ctx;
    this.fader = gainN(ctx, fade > 0 ? 0 : 1);
    this.fader.connect(G.bus.music);
    this.verbF = gainN(ctx, fade > 0 ? 0 : 1);
    this.verbF.connect(G.musicVerb);
    // 0.65 = mastering trim so tracks sit around −19 dBFS RMS at unity bus volume
    const out = gainN(ctx, 0.65 * (this.S.gain ?? 1));
    out.connect(this.fader);
    this.colour = filter(ctx, 'lowpass', this.S.lp ?? 18000, 0.5);
    this.colour.connect(out);
    // tempo-synced dotted-eighth delay with a filtered feedback loop
    this.dlyIn = gainN(ctx, 1);
    const dl = ctx.createDelay(2);
    dl.delayTime.value = this.beat * (this.S.dly ?? 0.75);
    const fb = gainN(ctx, 0.34);
    const fl = filter(ctx, 'lowpass', 2600, 0.5);
    const fh = filter(ctx, 'highpass', 280, 0.5);
    const dOut = gainN(ctx, 0.6);
    this.dlyIn.connect(dl);
    dl.connect(fl);
    fl.connect(fh);
    fh.connect(fb);
    fb.connect(dl);
    fh.connect(dOut);
    dOut.connect(this.colour);
    if (fade > 0) {
      fadeParam(this.fader.gain, 1, start, fade);
      fadeParam(this.verbF.gain, 1, start, fade);
    }
    const cr = this.S.inst.crackle;
    if (cr) {
      const src = ctx.createBufferSource();
      src.buffer = G.nb.get('crackle');
      src.loop = true;
      src.start(start);
      this.keep.push(src);
      const g = gainN(ctx, cr);
      src.connect(g);
      g.connect(out);
    }
  }

  /** Per-instrument channel: volume → [lowpass] → [drive] → [pump] → [autopan] → mix, + reverb/delay sends. */
  strip(name: string, vol: number, verb = 0.2, dly = 0, o: { autopan?: number; drive?: boolean; pump?: number; lp?: number } = {}): GainNode {
    let s = this.strips.get(name);
    if (s) return s;
    const ctx = this.ctx;
    s = gainN(ctx, vol);
    let n: AudioNode = s;
    const add = (x: AudioNode) => {
      n.connect(x);
      n = x;
    };
    if (o.lp) add(filter(ctx, 'lowpass', o.lp, 0.6));
    if (o.drive) {
      const w = ctx.createWaveShaper();
      const c = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) c[i] = Math.tanh(((i / 1023) * 2 - 1) * 2.2) * 0.8;
      w.curve = c;
      w.oversample = '2x';
      add(w);
    }
    if (o.pump) {
      const p = gainN(ctx, 1);
      add(p);
      this.pumps.push({ g: p, depth: o.pump });
    }
    if (o.autopan) {
      const p = ctx.createStereoPanner();
      const l = ctx.createOscillator();
      l.frequency.value = 0.17;
      const lg = gainN(ctx, o.autopan);
      l.connect(lg);
      lg.connect(p.pan);
      l.start();
      this.keep.push(l);
      add(p);
    }
    n.connect(this.colour);
    if (verb > 0) {
      const v = gainN(ctx, verb);
      n.connect(v);
      v.connect(this.verbF);
    }
    if (dly > 0) {
      const d = gainN(ctx, dly);
      n.connect(d);
      d.connect(this.dlyIn);
    }
    this.strips.set(name, s);
    return s;
  }

  /** Shared vibrato LFO (cents) for strings. */
  vib(): GainNode {
    if (!this.vibG) {
      const l = this.ctx.createOscillator();
      l.frequency.value = 5.2;
      this.vibG = gainN(this.ctx, 7);
      l.connect(this.vibG);
      l.start();
      this.keep.push(l);
    }
    return this.vibG;
  }

  voicing(layer: string, c: Chord, lo: number, hi: number, n: number, withBass = false): number[] {
    const v = voiceLead(this.prev.get(layer), pcsFor(c, n, withBass), lo, hi);
    this.prev.set(layer, v);
    return v;
  }

  bassMidi(pc: number) {
    const lo = this.S.key - 17 + (this.S.inst.bass?.oct ?? 0);
    return lo + pcOf(pc - lo);
  }

  /** MIDI note with pitch class `pc` nearest to `ref`. */
  near(pc: number, ref: number) {
    const d = pcOf(pc - ref);
    return d > 6 ? ref + d - 12 : ref + d;
  }

  private sec(fi: number) {
    return this.S.sec[this.form[fi]];
  }

  /** First chord of the next bar (for bass approach notes). */
  peek(): Chord {
    let fi = this.fi;
    let sb = this.sb + 1;
    if (sb >= barsOf(this.sec(fi)).length) {
      sb = 0;
      fi = fi + 1 >= this.form.length ? (this.S.loop ?? 0) : fi + 1;
    }
    const bars = barsOf(this.sec(fi));
    return chord(bars[sb % bars.length][0]);
  }

  scheduleUntil(t: number) {
    // throttled timers (hidden tab): skip missed bars instead of playing them all at once
    const now = this.ctx.currentTime;
    if (now > 0.5 && this.next < now - 0.1) this.next = now + 0.05;
    let guard = 0;
    while (!this.stopped && this.next < t && guard++ < 16) {
      const d = this.beat * 4;
      this.playBar(this.next, d);
      this.next += d;
    }
  }

  private playBar(t: number, dur: number) {
    const name = this.form[this.fi];
    const sec = this.sec(this.fi);
    const bars = barsOf(sec);
    const syms = bars[this.sb % bars.length];
    const segs = syms.map((sym, i) => ({ t: t + (dur / syms.length) * i, d: dur / syms.length, beats: 4 / syms.length, c: chord(sym) }));
    if (this.sb === 0) this.mel = 0;
    const b: Bar = { t, beat: this.beat, dur, segs, sec, name, sb: this.sb, last: this.sb === bars.length - 1, e: sec.e ?? 0.6 };
    for (const p of this.pumps)
      for (let i = 0; i < 4; i++) {
        const tb = t + i * this.beat;
        p.g.gain.setValueAtTime(1 - p.depth, tb);
        p.g.gain.setTargetAtTime(1, tb + 0.015, this.beat * 0.22);
      }
    for (const l of sec.l.split(' ')) LAYERS[l]?.(this, b);
    if (++this.sb >= bars.length) {
      this.sb = 0;
      if (++this.fi >= this.form.length) this.fi = this.S.loop ?? 0;
    }
  }

  stop(fade: number) {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    fadeParam(this.fader.gain, 0, t, fade);
    fadeParam(this.verbF.gain, 0, t, fade);
    setTimeout(() => {
      for (const k of this.keep) {
        try {
          k.stop();
        } catch {
          /* not started */
        }
      }
      this.fader.disconnect();
      this.verbF.disconnect();
    }, (fade + 5) * 1000);
  }
}

// ───────── layers ─────────

const COMP = [[0, 2.5], [0, 1.5, 3], [0, 3.5], [0, 2, 3.5], [0, 2.75]];
const TPL = [[2, 2, 4], [3, 3, 2], [-2, 2, 2, 2], [4, 2, 2], [1, 1, 2, 4], [-1, 1, 2, 1, 3], [2, 1, 1, 4], [6, 2], [3, 1, 2, 2], [-4, 2, 2]];
const TPL_SPARSE = [[-2, 6], [4, -4], [-4, 4], [6, -2], [2, -2, 4], [8]];
const TPL_END = [[4, 4], [2, 6], [8], [-2, 6], [3, 5]];

const hasBass = (b: Bar) => b.sec.l.split(' ').includes('bass');
const segAt = (b: Bar, beat: number) => b.segs.find((g) => beat * b.beat < g.t - b.t + g.d - 1e-6) ?? b.segs[b.segs.length - 1];
const tonesOf = (c: Chord) => new Set(c.iv.map((i) => (c.root + i) % 12));

function strum(s: Sequencer, out: AudioNode, t: number, notes: number[], vel: number, d: number, spread: number) {
  notes.forEach((m, i) => epiano(s, out, t + i * spread * (0.6 + 0.8 * s.rnd()), m, vel * (0.85 + 0.25 * s.rnd()), d));
}

function degMidi(S: Song, base: number, d: number) {
  const sc = MODES[S.mode];
  return base + 12 * Math.floor(d / 7) + sc[((d % 7) + 7) % 7];
}

/** Seeded generative melody: deterministic per section (memorable), rhythm repeats in phrase pairs. */
function genBar(s: Sequencer, b: Bar, base: number, sparse: boolean): [number, number, number, number][] {
  const seed = hash(s.id + ':' + b.name);
  const ph = b.sb % 4;
  const lib = sparse ? TPL_SPARSE : TPL;
  const pick = <T,>(arr: T[], k: number) => arr[Math.floor(rng(seed + k)() * arr.length)];
  const tpl = ph === 3 ? pick(TPL_END, 31 + Math.floor(b.sb / 4)) : pick(lib, (ph === 2 ? 0 : ph) * 101 + 7);
  const P = rng(seed * 7 + b.sb * 7919 + 3);
  const scale = new Set(MODES[s.S.mode].map((x) => (x + s.S.key) % 12));
  const lo = base - 3;
  const hi = base + 15;
  if (!s.mel) s.mel = base + 7;
  const out: [number, number, number, number][] = [];
  let pos = 0;
  tpl.forEach((L, idx) => {
    const len = Math.abs(L);
    if (L > 0) {
      const c = segAt(b, pos / 2).c;
      const ct = tonesOf(c);
      const strong = pos % 4 === 0 || len >= 3;
      let m = s.mel;
      if (ph === 3 && idx === tpl.length - 1) m = s.near(P() < 0.6 ? c.root : (c.root + c.iv[1]) % 12, m);
      else if (strong) {
        const target = m + Math.round((P() - 0.5) * 6);
        let best = m;
        for (let x = lo; x <= hi; x++) if (ct.has(pcOf(x)) && Math.abs(x - target) < Math.abs(best - target)) best = x;
        m = ct.has(pcOf(best)) ? best : m;
      } else {
        let steps = [-2, -1, -1, 1, 1, 2][Math.floor(P() * 6)];
        const dir = Math.sign(steps);
        while (steps) {
          m += dir;
          if (scale.has(pcOf(m))) steps -= dir;
        }
      }
      while (m < lo) m += 12;
      while (m > hi) m -= 12;
      s.mel = m;
      out.push([pos, len, m, strong ? 0.85 : 0.68]);
    }
    pos += len;
  });
  return out;
}

type Layer = (s: Sequencer, b: Bar) => void;
const LAYERS: Record<string, Layer> = {
  pad(s, b) {
    const o = s.S.inst.pad!;
    const out = s.strip('pad', o.vol, o.verb ?? 0.35, 0, { pump: o.pump });
    for (const g of b.segs) sawPad(s, out, g.t, g.d, s.voicing('pad', g.c, o.lo ?? 52, o.hi ?? 76, o.n ?? 5, true), o, b.e);
  },

  keys(s, b) {
    const o = s.S.inst.keys!;
    const out = s.strip('keys', o.vol, o.verb ?? 0.25, o.dly ?? 0.06, { autopan: o.style === 'stab' ? 0 : 0.3 });
    const vel = 0.55 + 0.35 * b.e;
    for (const g of b.segs) {
      const v = s.voicing('keys', g.c, o.lo ?? 55, o.hi ?? 74, 4, !hasBass(b));
      if (o.style === 'whole') strum(s, out, g.t + 0.01, v, vel, g.d * 0.95, 0.012);
      else if (o.style === 'comp') {
        const P = COMP[Math.floor(s.rnd() * COMP.length)].filter((x) => x < g.beats);
        P.forEach((x, i) => strum(s, out, g.t + x * b.beat + 0.014 + hum(s, 6), v, vel * (i ? 0.72 : 1), ((P[i + 1] ?? g.beats) - x) * b.beat * 0.92, 0.016));
      } else if (o.style === 'stab') {
        for (const x of (s.rnd() < 0.5 ? [0.5, 1.5, 2.5, 3.5] : [0.5, 1.75, 2.5, 3.25]).filter((x) => x < g.beats)) strum(s, out, g.t + x * b.beat + hum(s, 4), v, vel * 0.8, b.beat * 0.24, 0.004);
      } else {
        const notes = [s.bassMidi(g.c.bass) + 12, ...v];
        const ord = [0, 2, 3, 4, 1, 3, 2, 4];
        const steps = Math.round(g.beats * 2);
        for (let i = 0; i < steps; i++) {
          const tt = g.t + (i * b.beat) / 2 + (i % 2 ? ((s.S.swing ?? 0) * b.beat) / 4 : 0) + hum(s, 8);
          epiano(s, out, tt, notes[ord[i % 8] % notes.length], vel * (i % 4 === 0 ? 0.85 : 0.6), ((steps - i) * b.beat) / 2 + 0.2);
        }
      }
    }
  },

  bass(s, b) {
    const o = s.S.inst.bass!;
    const out = s.strip('bass', o.vol, 0.03, 0);
    const B = b.beat;
    const N = (t: number, m: number, v: number, d: number) => bassN(s, out, t, m, v, d, o.wave ?? 'sub');
    b.segs.forEach((g, gi) => {
      const r = s.bassMidi(g.c.bass);
      const fifth = s.near(g.c.root + (g.c.iv.find((i) => i >= 6 && i <= 8) ?? 7), r + 5);
      const third = s.near(g.c.root + (g.c.iv.find((i) => i === 3 || i === 4) ?? 4), r + 4);
      const lastSeg = gi === b.segs.length - 1;
      const approach = () => {
        const nx = s.bassMidi(s.peek().bass);
        return nx === r ? r + 12 : nx + (nx > r ? -1 : 1);
      };
      switch (b.sec.bs ?? o.style) {
        case 'sustain':
          N(g.t, r, 0.85, g.d * 0.98);
          break;
        case 'pedal':
          N(g.t, s.bassMidi(s.S.key % 12), 0.9, g.d * 0.98);
          break;
        case 'lofi': {
          N(g.t + hum(s, 4), r, 0.92, Math.min(g.beats, 1.6) * B);
          if (g.beats >= 4) {
            const x = s.rnd();
            if (x < 0.4) N(g.t + 2.5 * B, s.rnd() < 0.5 ? fifth : r + 12, 0.62, 0.8 * B);
            else if (x < 0.75) N(g.t + 2 * B, r, 0.72, 1.2 * B);
            if (lastSeg && s.rnd() < 0.55) N(g.t + 3.5 * B, approach(), 0.55, 0.45 * B);
          }
          break;
        }
        case 'walk': {
          const seq = g.beats >= 4 ? [r, s.rnd() < 0.5 ? third : fifth, s.rnd() < 0.5 ? fifth : r + 12, approach()] : [r, lastSeg ? approach() : fifth];
          seq.forEach((m, i) => N(g.t + i * B + hum(s, 5), m, i ? 0.7 : 0.88, B * 0.9));
          break;
        }
        case 'drive':
          for (let i = 0; i < g.beats * 2; i++) N(g.t + (i * B) / 2, i % 4 === 3 ? r + 12 : r, i % 2 ? 0.6 : 0.85, B * 0.42);
          break;
        case 'octave':
          for (let i = 0; i < g.beats * 2; i++) N(g.t + (i * B) / 2, i % 2 ? r + 12 : r, i % 2 ? 0.6 : 0.88, B * 0.45);
          break;
        case 'pulse':
          for (let i = 0; i < g.beats * 4; i++) N(g.t + (i * B) / 4, r, [1, 0.45, 0.7, 0.45][i % 4] * 0.85, B * 0.16);
          break;
        case 'ostinato': {
          const P = [r, r, r + 12, r, fifth, r, r + 12, third];
          for (let i = 0; i < g.beats * 2; i++) N(g.t + (i * B) / 2, P[i % 8], i % 2 ? 0.6 : 0.85, B * 0.38);
          break;
        }
        case 'funk': {
          const P: [number, number, number][] = [[0, r, 0.4], [0.75, r + 12, 0.2], [1.5, r, 0.3], [2.5, r + 12, 0.2], [3, r, 0.3], [3.5, fifth, 0.3]];
          P.forEach(([x, m, d], i) => {
            if (x < g.beats && (i === 0 || s.rnd() > 0.15)) N(g.t + x * B + hum(s, 3), m, i ? 0.7 : 0.92, d * B);
          });
          break;
        }
      }
    });
  },

  drums(s, b) {
    const D = s.S.inst.drums!;
    const pat = D.pat[b.sec.d ?? 'a'] ?? D.pat.a ?? Object.values(D.pat)[0];
    const kit = D.kit;
    const out = s.strip('drums', D.vol, kit === 'cine' ? 0.16 : 0.08, 0, { lp: kit === 'lofi' || kit === 'brush' ? 7000 : undefined });
    const st = b.beat / 4;
    const sw = (s.S.swing ?? 0) * st;
    const fill = b.last && b.sec.fill !== false;
    for (let i = 0; i < 16; i++) {
      const tt = b.t + i * st + (i % 2 ? sw : 0);
      const at = (k: keyof typeof pat) => {
        const ch = pat[k]?.[i];
        return ch && ch !== '.' ? (+ch / 9) * (0.88 + 0.24 * s.rnd()) : 0;
      };
      let v: number;
      if ((v = at('k'))) kick(s, out, tt + hum(s, 2), v, kit);
      if (fill && i >= 12) {
        const fv = [0.4, 0.5, 0.65, 0.8][i - 12];
        if (kit === 'cine') tom(s, out, tt, fv, [150, 125, 100, 82][i - 12]);
        else if (i % 2 || kit === 'house') snare(s, out, tt + hum(s, 3), fv * 0.8, kit);
      } else if ((v = at('s'))) snare(s, out, tt + hum(s, 4) + (kit === 'lofi' ? 0.012 : 0), v, kit);
      else if (kit === 'lofi' && i % 2 && s.rnd() < 0.05) snare(s, out, tt, 0.12, kit);
      if ((v = at('c'))) clap(s, out, tt, v);
      if ((v = at('r'))) rim(s, out, tt + hum(s, 3), v);
      if ((v = at('h')) && s.rnd() > 0.06) hiss(s.G, out, tt + hum(s, 6), { d: kit === 'lofi' ? 0.035 : 0.045, v: v * 0.13, hp: kit === 'lofi' ? 6500 : 7500 });
      if ((v = at('o'))) hiss(s.G, out, tt + hum(s, 4), { d: 0.26, v: v * 0.11, hp: 7000 });
      if ((v = at('sh'))) hiss(s.G, out, tt + hum(s, 7), { a: 0.012, d: 0.05, v: v * 0.07, bp: 6500, q: 1 });
      if ((v = at('rd'))) {
        hiss(s.G, out, tt + hum(s, 6), { d: 0.3, v: v * 0.05, hp: 5200 });
        blip(s.G, out, tt, { f: 3150, d: 0.25, v: v * 0.015 });
      }
      if ((v = at('b'))) hiss(s.G, out, tt + hum(s, 8), { a: 0.03, d: 0.2, v: v * 0.12, bp: 2600, q: 0.7 });
    }
  },

  arp(s, b) {
    const o = s.S.inst.arp!;
    const out = s.strip('arp', o.vol, 0.3, o.dly ?? 0.25);
    const step = o.rate === 16 ? 0.25 : o.rate === 12 ? 1 / 3 : 0.5;
    const lo = o.lo ?? 60;
    for (const g of b.segs) {
      const v = s.voicing('arp', g.c, lo, lo + 15, 4, !hasBass(b));
      const notes = [...v, v[0] + 12, v[1] + 12];
      const n = notes.length;
      const steps = Math.round(g.beats / step);
      for (let i = 0; i < steps; i++) {
        let k: number;
        if (o.pat === 'up') k = i % n;
        else if (o.pat === 'down') k = n - 1 - (i % n);
        else if (o.pat === 'updown') {
          const c = 2 * n - 2;
          const x = i % c;
          k = x < n ? x : c - x;
        } else if (o.pat === 'pend') k = [0, 2, 1, 3, 2, 4, 3, 1][i % 8] % n;
        else k = Math.floor(s.rnd() * n);
        const sw = o.rate !== 12 && i % 2 ? (s.S.swing ?? 0) * b.beat * step : 0;
        const tt = g.t + i * step * b.beat + sw + hum(s, 4);
        const vel = (0.55 + 0.3 * b.e) * (i % (o.rate === 16 ? 4 : 2) === 0 ? 1 : 0.72);
        const d = step * b.beat * (o.gate ?? 0.9);
        if (o.wave === 'pluck') pluck(s, out, tt, notes[k], vel, d);
        else if (o.wave === 'bell') bellN(s, out, tt, notes[k], vel * 0.8, 0.9);
        else blip(s.G, out, tt, { f: mtof(notes[k]), d: d + 0.3, v: vel * 0.22, a: 0.006 });
      }
    }
  },

  lead(s, b) {
    const o = s.S.inst.lead!;
    const wave = b.sec.lw ?? o.wave;
    const out = s.strip('lead:' + wave, o.vol, o.verb ?? 0.35, o.dly ?? 0.25);
    const base = s.S.key + 12 * (o.oct ?? 1);
    let notes: [number, number, number, number][];
    if (b.sec.m) {
      const M = motif(b.sec.m);
      notes = M[b.sb % M.length].map(([p, l, d]) => [p, l, d === 'L' ? base - 1 : degMidi(s.S, base, d), l >= 4 ? 0.9 : 0.78]);
    } else notes = genBar(s, b, base, !!o.sparse);
    for (const [p8, l8, m, v] of notes) {
      const t = b.t + (p8 * b.beat) / 2 + (p8 % 2 ? ((s.S.swing ?? 0) * b.beat) / 4 : 0) + hum(s, 6);
      leadN(s, out, t, m, v * (0.8 + 0.25 * b.e), ((l8 * b.beat) / 2) * 0.94, wave);
    }
  },

  strings(s, b) {
    const o = s.S.inst.strings!;
    const out = s.strip('str', o.vol, 0.5, 0);
    for (const g of b.segs) {
      const v = s.voicing('str', g.c, o.lo ?? 50, o.hi ?? 76, 4, true);
      stringsN(s, out, g.t, g.d, b.e > 0.75 ? [...v, v[v.length - 2] + 12] : v, o.atk ?? 0.9, b.e);
    }
  },

  bell(s, b) {
    const o = s.S.inst.bell!;
    const out = s.strip('bell', o.vol, 0.55, 0.3);
    const hi = o.hi ?? 88;
    for (let i = 0; i < 8; i++) {
      if (s.rnd() > (o.prob ?? 0.15)) continue;
      const c = segAt(b, i / 2).c;
      const pc = (c.root + c.iv[Math.floor(s.rnd() * c.iv.length)]) % 12;
      bellN(s, out, b.t + (i * b.beat) / 2 + hum(s, 10), s.near(pc, hi - 6 - Math.floor(s.rnd() * 8)), 0.35 + 0.35 * s.rnd(), 2.4);
    }
  },

  drone(s, b) {
    const o = s.S.inst.drone!;
    const out = s.strip('drone', o.vol, 0.3, 0, { drive: o.drive });
    const ctx = s.ctx;
    const k = s.bassMidi(s.S.key % 12);
    const cut = o.cut ?? 350;
    const fl = filter(ctx, 'lowpass', cut, 2);
    fl.frequency.setValueAtTime(cut, b.t);
    fl.frequency.linearRampToValueAtTime(cut * 1.6, b.t + b.dur * 0.5);
    fl.frequency.linearRampToValueAtTime(cut, b.t + b.dur + 0.8);
    const g = gainN(ctx);
    const end = adsr(g.gain, b.t, 0.35, 0.4, 0, 1, b.dur, 0.9);
    fl.connect(g);
    g.connect(out);
    for (const m of [k, k + 12]) for (const dt of [-7, 7]) oscN(ctx, 'sawtooth', mtof(m), b.t, end, dt).connect(fl);
  },

  perc(s, b) {
    const o = s.S.inst.perc!;
    const out = s.strip('perc', o.vol, 0.4, 0);
    for (let i = 0; i < 16; i++) {
      const ch = o.pat[i];
      if (!ch || ch === '.') continue;
      const v = +ch / 9;
      tom(s, out, b.t + (i * b.beat) / 4 + hum(s, 5), v, v > 0.8 ? 58 : 78);
    }
  },

  hit(s, b) {
    const o = s.S.inst.hit!;
    if (b.sb % (o.every ?? 8)) return;
    const out = s.strip('hit', o.vol, 0.5, 0);
    blip(s.G, out, b.t, { f: 75, f1: 30, g: 1, d: 2.2, v: 0.85 });
    hiss(s.G, out, b.t, { d: 1.4, v: 0.3, kind: 'brown', lp: 320 });
    hiss(s.G, out, b.t, { d: 2.2, v: 0.09, hp: 5000 });
  },

  tick(s, b) {
    const out = s.strip('tick', s.S.inst.tick!.vol, 0.12, 0.15);
    for (let i = 0; i < 4; i++) {
      const t = b.t + i * b.beat;
      blip(s.G, out, t, { f: i % 2 ? 1500 : 1900, d: 0.018, v: 0.22, type: 'triangle' });
      hiss(s.G, out, t, { d: 0.008, v: 0.1, hp: 5000 });
    }
  },

  siren(s, b) {
    const out = s.strip('siren', s.S.inst.siren!.vol, 0.4, 0.2);
    const ctx = s.ctx;
    const f0 = mtof(s.S.key + 24);
    const f1 = mtof(s.S.key + 25);
    const osc = oscN(ctx, 'triangle', f0, b.t, b.t + b.dur + 0.7);
    for (let i = 0; i < 4; i++) osc.frequency.setTargetAtTime(i % 2 ? f1 : f0, b.t + (i * b.dur) / 4, 0.06);
    const fl = filter(ctx, 'lowpass', 1600, 0.7);
    const g = gainN(ctx);
    adsr(g.gain, b.t, 0.3, 0.25, 0, 1, b.dur, 0.5);
    osc.connect(fl);
    fl.connect(g);
    g.connect(out);
  },

  riser(s, b) {
    if (!b.last) return;
    const out = s.strip('riser', s.S.inst.riser!.vol, 0.35, 0.2);
    const ctx = s.ctx;
    const t = b.t;
    const end = t + b.dur;
    const src = noiseSrc(s.G, 'white', t, end + 0.05);
    const bp = filter(ctx, 'bandpass', 300, 2.2);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(6000, end);
    const g = gainN(ctx);
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(0.5, end - 0.02);
    g.gain.linearRampToValueAtTime(0, end + 0.03);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    const osc = oscN(ctx, 'sawtooth', mtof(s.S.key + 12), t, end + 0.05);
    osc.frequency.exponentialRampToValueAtTime(mtof(s.S.key + 24), end);
    const lp = filter(ctx, 'lowpass', 1800, 0.7);
    const og = gainN(ctx);
    og.gain.setValueAtTime(1e-4, t);
    og.gain.exponentialRampToValueAtTime(0.12, end - 0.02);
    og.gain.linearRampToValueAtTime(0, end + 0.03);
    osc.connect(lp);
    lp.connect(og);
    og.connect(out);
  },
};

// ───────── controller (live context) ─────────

let cur: Sequencer | null = null;
let want: MusicTrack | null = null;
let fadeS = 2.5;
let queued = false;

export function setMusic(track: MusicTrack | null, fadeMs = 2500) {
  want = track;
  fadeS = Math.max(0, fadeMs) / 1000;
  if (!isUnlocked()) {
    if (!queued) {
      queued = true;
      whenUnlocked(() => {
        queued = false;
        applyMusic();
      });
    }
    return;
  }
  applyMusic();
}

function applyMusic() {
  const G = live();
  if (!G) return;
  if (cur && !cur.stopped && cur.id === want) return;
  if (cur) {
    cur.stop(fadeS);
    dropSched(cur);
    cur = null;
  }
  if (!want) return;
  const s = new Sequencer(G, want, G.ctx.currentTime + 0.05, Math.max(0.05, fadeS));
  cur = s;
  addSched(s);
  s.scheduleUntil(G.ctx.currentTime + 0.4);
}
