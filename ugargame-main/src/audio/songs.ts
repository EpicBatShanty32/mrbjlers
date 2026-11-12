/**
 * Soundtrack compositions. Chords: one bar per `|` (several symbols in a bar split it evenly).
 * Drum patterns: 16 steps, digit = velocity (9 loudest), '.' = rest.
 * `form` lists sections; after the end playback continues from index `loop`.
 */
import type { MusicTrack } from './index';

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

/** Leitmotif in scale degrees (0 = tonic, L = leading tone) as `degree:eighths`, `rN` = rest. */
export const MOTIFS: Record<string, string> = {
  theme: 'r1 4:1 4:2 3:1 2:1 3:2 | 0:6 r2 | -1:1 0:1 2:2 4:2 3:2 | 1:4 L:4 | r1 4:1 4:2 3:1 2:1 6:2 | 5:6 4:2 | 3:2 2:2 1:2 2:2 | 0:4 L:4',
};

export type LeadWave = 'glass' | 'saw' | 'bell' | 'flute';
export type BassStyle = 'lofi' | 'sustain' | 'pedal' | 'walk' | 'drive' | 'octave' | 'pulse' | 'ostinato' | 'funk';
export interface DrumPat { k?: string; s?: string; c?: string; r?: string; h?: string; o?: string; sh?: string; rd?: string; b?: string }

export interface Inst {
  pad?: { cut: number; vol: number; q?: number; atk?: number; rel?: number; lo?: number; hi?: number; n?: number; detune?: number; wave?: OscillatorType; pump?: number; verb?: number };
  keys?: { style: 'comp' | 'whole' | 'stab' | 'ballad'; vol: number; lo?: number; hi?: number; verb?: number; dly?: number };
  bass?: { style: BassStyle; wave?: 'sub' | 'saw' | 'pluck'; vol: number; oct?: number };
  drums?: { kit: 'lofi' | 'house' | 'cine' | 'brush'; vol: number; pat: Record<string, DrumPat> };
  arp?: { rate: 8 | 12 | 16; pat: 'up' | 'down' | 'updown' | 'pend' | 'rand'; wave: 'pluck' | 'bell' | 'glass'; vol: number; lo?: number; dly?: number; gate?: number };
  lead?: { wave: LeadWave; vol: number; oct?: number; dly?: number; verb?: number; sparse?: boolean };
  strings?: { vol: number; lo?: number; hi?: number; atk?: number };
  bell?: { vol: number; prob?: number; hi?: number };
  drone?: { vol: number; cut?: number; drive?: boolean };
  perc?: { vol: number; pat: string };
  hit?: { vol: number; every?: number };
  tick?: { vol: number };
  siren?: { vol: number };
  riser?: { vol: number };
  crackle?: number;
}

export interface Section {
  c: string;
  /** Active layers: pad keys bass drums arp lead strings bell drone perc hit tick siren riser */
  l: string;
  /** Energy 0..1 (brightness, velocity). */
  e?: number;
  /** Drum pattern name. */
  d?: string;
  /** Motif name for the lead (otherwise a seeded generative melody). */
  m?: string;
  lw?: LeadWave;
  bs?: BassStyle;
  fill?: boolean;
}

export interface Song {
  bpm: number;
  key: number;
  mode: keyof typeof MODES;
  swing?: number;
  lp?: number;
  gain?: number;
  dly?: number;
  inst: Inst;
  sec: Record<string, Section>;
  form: string;
  loop?: number;
}

const THEME_MIN = 'Am9 | Fmaj9 | C/G | E7 | Am9 | Fmaj9 | Dm9 | E7sus4 E7';
const LOFI_SOFT = {
  a: { k: '8.....5...7.....', s: '....7.......7...', h: '5.3.5.3.5.335.3.' },
  b: { k: '8......5..7..5..', s: '....7.......7..3', h: '5.3.5.335.3.5.3.', o: '..............4.' },
};

export const SONGS: Record<MusicTrack, Song> = {
  // Rainy-night lo-fi synthwave; the 8-bar leitmotif lives here.
  menu: {
    bpm: 84, key: 57, mode: 'aeolian', swing: 0.16, lp: 9500,
    inst: {
      pad: { cut: 1300, vol: 0.2, atk: 1.4, rel: 2, lo: 52, hi: 76, detune: 9 },
      keys: { style: 'comp', vol: 0.22, lo: 55, hi: 72 },
      bass: { style: 'lofi', wave: 'sub', vol: 0.5 },
      drums: { kit: 'lofi', vol: 0.55, pat: LOFI_SOFT },
      arp: { rate: 16, pat: 'updown', wave: 'pluck', vol: 0.12, lo: 64, dly: 0.35 },
      lead: { wave: 'glass', vol: 0.3, oct: 1, dly: 0.3, verb: 0.45 },
      bell: { vol: 0.12, prob: 0.16 },
      crackle: 0.06,
    },
    sec: {
      i: { c: 'Am9 | Fmaj9 | C/G | E7sus4 E7', l: 'pad bell', e: 0.4 },
      A: { c: THEME_MIN, l: 'pad keys bass drums lead', m: 'theme', e: 0.6 },
      B: { c: 'Dm9 | G13 | Cmaj9 | Fmaj7#11 | Bm7b5 | E7b9 | Am9 | Am9', l: 'pad keys bass drums arp bell', d: 'b', e: 0.7 },
      C: { c: 'Fmaj9 | Em7 | Dm9 | E7sus4 E7', l: 'pad arp bell', e: 0.45, fill: false },
    },
    form: 'i A B A C B A', loop: 1,
  },
  // Lazy daytime lo-fi: jazzy ii–V–I in F, heavy swing.
  day: {
    bpm: 76, key: 53, mode: 'ionian', swing: 0.3, lp: 7800,
    inst: {
      keys: { style: 'comp', vol: 0.26, lo: 55, hi: 74 },
      pad: { cut: 900, vol: 0.1, atk: 1, rel: 1.5, lo: 48, hi: 67, wave: 'triangle' },
      bass: { style: 'lofi', wave: 'sub', vol: 0.55 },
      drums: { kit: 'lofi', vol: 0.62, pat: { a: { k: '9......6..8.....', s: '....9.......9...', h: '6.4.6.436.4.6.4.' }, b: { k: '9.....6...8..6..', s: '....9..2....9...', h: '6.4.6.4.6.436.44', o: '..............5.' } } },
      lead: { wave: 'bell', vol: 0.18, oct: 1, dly: 0.25 },
      arp: { rate: 8, pat: 'rand', wave: 'pluck', vol: 0.1, lo: 65 },
      crackle: 0.08,
    },
    sec: {
      i: { c: 'Gm9 | C13 | Fmaj9 | Dm9', l: 'keys pad', e: 0.45, fill: false },
      A: { c: 'Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C13 | Am7 | D7b9', l: 'keys pad bass drums', e: 0.6 },
      B: { c: 'Bbmaj9 | A7#5 | Dm9 | Ab13 | Gm9 | C9sus4 | Fmaj9 | Fmaj9', l: 'keys bass drums lead', d: 'b', e: 0.65 },
      A2: { c: 'Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C13 | Am7 | D7b9', l: 'keys pad bass drums arp', e: 0.6 },
    },
    form: 'i A B A2 B', loop: 1,
  },
  // 2 a.m. ambient: slow Db-major pads, bells, sparse glass melody.
  night: {
    bpm: 60, key: 49, mode: 'ionian',
    inst: {
      pad: { cut: 1000, vol: 0.24, atk: 2.4, rel: 3, lo: 51, hi: 75, detune: 11 },
      bass: { style: 'sustain', wave: 'sub', vol: 0.4 },
      bell: { vol: 0.13, prob: 0.12 },
      arp: { rate: 8, pat: 'updown', wave: 'glass', vol: 0.09, lo: 68, dly: 0.45 },
      lead: { wave: 'glass', vol: 0.18, oct: 1, dly: 0.4, verb: 0.6, sparse: true },
      strings: { vol: 0.08, lo: 56, hi: 80, atk: 2.5 },
    },
    sec: {
      A: { c: 'Dbmaj9 | Bbm9 | Gbmaj7#11 | Absus4 Ab', l: 'pad bass bell', e: 0.4 },
      B: { c: 'Gbmaj9 | Fm7 | Ebm9 | Absus4 Ab', l: 'pad bass arp bell', e: 0.5 },
      C: { c: 'Bbm9 | Gbmaj9 | Dbmaj9/F | Ab6', l: 'pad bass lead strings', e: 0.45 },
    },
    form: 'A A B C B A', loop: 0,
  },
  // Live deal: 16th pulse, clock tick, dark minor harmony with a Neapolitan.
  focus: {
    bpm: 96, key: 48, mode: 'aeolian', lp: 12000,
    inst: {
      pad: { cut: 800, vol: 0.16, atk: 0.8, rel: 1.2, lo: 51, hi: 72 },
      bass: { style: 'pulse', wave: 'saw', vol: 0.36 },
      tick: { vol: 0.12 },
      drums: { kit: 'cine', vol: 0.5, pat: { a: { k: '9.......8.......', h: '3.2.3.2.3.2.3.2.' }, b: { k: '9.....6.8.......', h: '4242424242424242', r: '........6.......' } } },
      arp: { rate: 16, pat: 'pend', wave: 'pluck', vol: 0.09, lo: 60, gate: 0.4, dly: 0.2 },
      strings: { vol: 0.11, lo: 48, hi: 70, atk: 1.5 },
      riser: { vol: 0.12 },
    },
    sec: {
      A: { c: 'Cm9 | Cm9 | Abmaj7#11 | Gsus4', l: 'pad bass tick drums', e: 0.5 },
      B: { c: 'Fm9 | Dbmaj7 | Cm9 | G7b9', l: 'pad bass tick drums arp riser', d: 'b', e: 0.65 },
      C: { c: 'Abmaj7 | Fm9 | Dbmaj7#11 | Gsus4 G7b9', l: 'pad bass arp strings tick drums', d: 'b', e: 0.7 },
    },
    form: 'A B A C', loop: 0,
  },
  // Moscow: upbeat Dorian nu-disco — four-on-the-floor, funky octave bass, stabs, pumping pad.
  moscow: {
    bpm: 106, key: 52, mode: 'dorian', swing: 0.08, lp: 14000,
    inst: {
      drums: { kit: 'house', vol: 0.6, pat: { i: { k: '9...9...9...9...', o: '..5...5...5...5.' }, a: { k: '9...9...9...9...', c: '....8.......8...', o: '..6...6...6...6.', sh: '4343434343434343' }, b: { k: '9...9...9...9..5', c: '....8.......8...', o: '..6...6...6...6.', h: '4.3.4.3.4.3.4.34', r: '..........4..4..' } } },
      bass: { style: 'funk', wave: 'saw', vol: 0.4 },
      keys: { style: 'stab', vol: 0.2, lo: 57, hi: 76 },
      pad: { cut: 1800, vol: 0.12, atk: 0.4, rel: 0.8, lo: 55, hi: 79, pump: 0.6 },
      arp: { rate: 16, pat: 'up', wave: 'pluck', vol: 0.09, lo: 67, dly: 0.25 },
      lead: { wave: 'saw', vol: 0.14, oct: 1, dly: 0.2 },
    },
    sec: {
      i: { c: 'Em9 | A13 | Em9 | A13', l: 'pad keys drums', d: 'i', e: 0.5 },
      A: { c: 'Em9 | A13 | Em9 | A13 | Cmaj9 | Bm7 | Am9 | B7#9', l: 'pad keys bass drums', e: 0.65 },
      B: { c: 'Gmaj9 | F#m7 | Em9 | A13 | Cmaj9 | Bm7 | Em9 | Em9', l: 'pad keys bass drums arp lead', d: 'b', e: 0.75 },
    },
    form: 'i A B A B', loop: 1,
  },
  // 115-ФЗ: driving phrygian ostinato over a D pedal, taiko, a soft two-tone alarm.
  danger: {
    bpm: 124, key: 50, mode: 'phrygian', lp: 11000,
    inst: {
      drone: { vol: 0.2, cut: 380, drive: true },
      bass: { style: 'drive', wave: 'saw', vol: 0.34 },
      drums: { kit: 'cine', vol: 0.55, pat: { a: { k: '9.....7.9.......', s: '........9.......', h: '5353535353535353' }, b: { k: '9.7...7.9.7.....', s: '........9.....4.', h: '6363636363636363', o: '..............6.' } } },
      siren: { vol: 0.05 },
      perc: { vol: 0.5, pat: '9.....6.....7.6.' },
      pad: { cut: 900, vol: 0.12, atk: 0.3, rel: 0.8, lo: 50, hi: 70 },
      arp: { rate: 16, pat: 'rand', wave: 'pluck', vol: 0.08, lo: 62, gate: 0.35 },
      strings: { vol: 0.1, lo: 50, hi: 72, atk: 0.4 },
      riser: { vol: 0.14 },
    },
    sec: {
      A: { c: 'Dm | Bb/D | Ebmaj7#11/D | Dmadd9', l: 'drone bass drums siren pad', e: 0.6 },
      B: { c: 'Gm9 | Ebmaj7#11 | Bbmaj7 | A7b9', l: 'drone bass drums arp perc siren strings riser', d: 'b', e: 0.75 },
    },
    form: 'A A B A B', loop: 0,
  },
  // Sad piano-like ballad in B minor.
  cs_rain: {
    bpm: 66, key: 47, mode: 'aeolian',
    inst: {
      keys: { style: 'ballad', vol: 0.3, lo: 52, hi: 71, verb: 0.4 },
      pad: { cut: 900, vol: 0.12, atk: 2, rel: 2.5, lo: 50, hi: 74 },
      bass: { style: 'sustain', wave: 'sub', vol: 0.38 },
      strings: { vol: 0.14, lo: 54, hi: 79, atk: 2 },
      lead: { wave: 'glass', vol: 0.2, oct: 1, dly: 0.3, verb: 0.55, sparse: true },
      bell: { vol: 0.08, prob: 0.08 },
    },
    sec: {
      A: { c: 'Bm9 | Gmaj7 | D/F# | Em9 | Bm/A | Gmaj7#11 | Em9 | F#7sus4 F#7', l: 'keys pad bass bell', e: 0.4 },
      B: { c: 'Bm9 | Gmaj7 | D/F# | Em9 | Bm/A | Gmaj7#11 | Em9 | F#7sus4 F#7', l: 'keys pad bass strings lead', e: 0.55 },
      C: { c: 'Gmaj9 | A6 | F#m7 | Bm9 | Em9 | A7sus4 | Dmaj7 | F#7sus4 F#7', l: 'keys bass strings lead', e: 0.6 },
    },
    form: 'A B C B', loop: 1,
  },
  // Warm, rising D major: 8th plucks, then drums, strings and a flute-like melody.
  cs_hope: {
    bpm: 92, key: 50, mode: 'ionian', swing: 0.05,
    inst: {
      arp: { rate: 8, pat: 'up', wave: 'pluck', vol: 0.14, lo: 62, dly: 0.3 },
      pad: { cut: 1600, vol: 0.15, atk: 1, rel: 1.6, lo: 54, hi: 78 },
      bass: { style: 'sustain', wave: 'sub', vol: 0.4 },
      drums: { kit: 'lofi', vol: 0.5, pat: { a: { k: '8.......6.6.....', r: '....7.......7...', h: '5.3.5.3.5.3.5.3.' }, b: { k: '9.....6.8.......', s: '....8.......8...', h: '5.3.5.3.5.3.5.33', o: '..............5.' } } },
      lead: { wave: 'flute', vol: 0.2, oct: 1, dly: 0.25 },
      strings: { vol: 0.13, lo: 55, hi: 81, atk: 1.2 },
      riser: { vol: 0.1 },
      hit: { vol: 0.35, every: 8 },
    },
    sec: {
      A: { c: 'Dmaj9 | Bm9 | Gmaj9 | Asus4 A', l: 'arp pad bass riser', e: 0.45 },
      B: { c: 'Gmaj7 | A6 | F#m7 | Bm9 | Gmaj9 | A | D/F# | Asus4 A', l: 'arp pad bass drums lead riser', e: 0.6 },
      C: { c: 'Dmaj9 | A/C# | Bm9 | Gmaj9 | Em9 | Gmaj7/A | Dmaj9 | Asus4 A', l: 'arp pad bass drums strings lead hit', d: 'b', bs: 'octave', e: 0.8 },
    },
    form: 'A B C B C', loop: 1,
  },
  // Calm mentor: brushed jazz in Bb, walking upright bass, vibraphone melody.
  cs_mentor: {
    bpm: 70, key: 46, mode: 'ionian', swing: 0.26, lp: 8000,
    inst: {
      keys: { style: 'comp', vol: 0.26, lo: 53, hi: 72 },
      bass: { style: 'walk', wave: 'pluck', vol: 0.5 },
      drums: { kit: 'brush', vol: 0.5, pat: { a: { k: '6.......4.......', b: '....6.......6...', rd: '6..46..46..46..4' } } },
      pad: { cut: 800, vol: 0.08, atk: 1.5, rel: 2, lo: 50, hi: 70, wave: 'triangle' },
      lead: { wave: 'bell', vol: 0.17, oct: 1, dly: 0.2 },
    },
    sec: {
      A: { c: 'Bbmaj9 | Gm9 | Cm9 | F13', l: 'keys bass drums pad', e: 0.5 },
      B: { c: 'Ebmaj9 | D7#5 | Gm9 | C9 | Cm9 | F13sus | Bbmaj9 | Bbmaj9', l: 'keys bass drums lead', e: 0.55 },
    },
    form: 'A A B A B', loop: 0,
  },
  // Tension: motoric F# minor ostinato, tick, toms.
  cs_tension: {
    bpm: 100, key: 54, mode: 'aeolian', lp: 11000,
    inst: {
      pad: { cut: 700, vol: 0.15, atk: 1, rel: 1.4, lo: 50, hi: 70 },
      bass: { style: 'ostinato', wave: 'saw', vol: 0.34 },
      tick: { vol: 0.1 },
      drums: { kit: 'cine', vol: 0.5, pat: { a: { k: '9.....7...9.....', r: '........6.......', h: '3.3.3.3.3.3.3.3.' }, b: { k: '9.....7...9...7.', r: '....5.......6...', h: '4343434343434343' } } },
      strings: { vol: 0.13, lo: 54, hi: 78, atk: 1.6 },
      perc: { vol: 0.45, pat: '7.......5...5...' },
      riser: { vol: 0.12 },
    },
    sec: {
      A: { c: 'F#madd9 | F#madd9 | Dmaj7#11 | C#7sus4 C#7b9', l: 'pad bass tick drums', e: 0.55 },
      B: { c: 'Bm9 | Dmaj7#11 | F#madd9 | C#7b9', l: 'pad bass tick drums strings perc riser', d: 'b', e: 0.7 },
    },
    form: 'A B A B', loop: 0,
  },
  // Crisis: heavy Eb minor — driven drone, sub pedal, taiko, impacts.
  cs_crisis: {
    bpm: 66, key: 51, mode: 'aeolian', lp: 9000,
    inst: {
      drone: { vol: 0.26, cut: 300, drive: true },
      bass: { style: 'pedal', wave: 'sub', vol: 0.5 },
      pad: { cut: 650, vol: 0.16, atk: 1.5, rel: 2, lo: 46, hi: 66 },
      perc: { vol: 0.6, pat: '9.......6.......' },
      hit: { vol: 0.55, every: 4 },
      strings: { vol: 0.15, lo: 46, hi: 70, atk: 2 },
      bell: { vol: 0.06, prob: 0.06 },
      riser: { vol: 0.12 },
    },
    sec: {
      A: { c: 'Ebm | Cbmaj7 | Abm9 | Bb7b9', l: 'drone bass pad perc hit bell', e: 0.55 },
      B: { c: 'Ebm | Ebm/D | Cbmaj7/Db | Abm9 | Ebm/Bb | Cbmaj7 | Fm7b5 | Bb7b9', l: 'drone bass pad strings perc hit riser', e: 0.7 },
    },
    form: 'A B', loop: 0,
  },
  // Triumph: the leitmotif in C major on brass-like saws, strings, taiko.
  cs_triumph: {
    bpm: 96, key: 48, mode: 'ionian',
    inst: {
      strings: { vol: 0.17, lo: 52, hi: 79, atk: 0.6 },
      pad: { cut: 2200, vol: 0.12, atk: 0.6, rel: 1.4, lo: 55, hi: 79 },
      bass: { style: 'octave', wave: 'saw', vol: 0.36 },
      drums: { kit: 'cine', vol: 0.55, pat: { a: { k: '9.......9.......', s: '....8.......8...', h: '5.3.5.3.5.3.5.3.' }, b: { k: '9.....7.9.......', s: '....9.......9.5.', h: '5353535353535353' } } },
      perc: { vol: 0.5, pat: '9.....7.9...7.7.' },
      arp: { rate: 16, pat: 'up', wave: 'pluck', vol: 0.09, lo: 67, dly: 0.2 },
      lead: { wave: 'saw', vol: 0.26, oct: 1, dly: 0.2, verb: 0.4 },
      hit: { vol: 0.5, every: 8 },
      riser: { vol: 0.14 },
    },
    sec: {
      i: { c: 'Cmaj9 | Fmaj9 | Am9 | Gsus4 G', l: 'strings pad bass arp riser', e: 0.55 },
      A: { c: 'Cmaj9 | Fmaj9 | Am9 | Gsus4 G | Cmaj9 | Fmaj7 | Dm9 | Gsus4 G', l: 'strings pad bass drums lead perc hit', m: 'theme', e: 0.8 },
      B: { c: 'Fmaj7 | G6 | Em7 | Am9 | Fmaj9 | G | C/E | Gsus4 G', l: 'strings pad bass drums arp perc riser', d: 'b', e: 0.85 },
    },
    form: 'i A B A', loop: 1,
  },
  // Bittersweet G major lo-fi with the minor iv (Cm6).
  cs_melancholy: {
    bpm: 74, key: 55, mode: 'ionian', swing: 0.2, lp: 8000,
    inst: {
      keys: { style: 'ballad', vol: 0.26, lo: 52, hi: 72 },
      bass: { style: 'lofi', wave: 'sub', vol: 0.48 },
      drums: { kit: 'lofi', vol: 0.5, pat: { a: { k: '8......5..7.....', r: '....7.......7...', h: '5.3.5.3.5.3.5.3.' } } },
      arp: { rate: 8, pat: 'rand', wave: 'pluck', vol: 0.08, lo: 67, dly: 0.35 },
      lead: { wave: 'bell', vol: 0.17, oct: 1, dly: 0.3 },
      pad: { cut: 900, vol: 0.09, atk: 1.5, rel: 2, lo: 50, hi: 72 },
      crackle: 0.07,
    },
    sec: {
      A: { c: 'Cmaj9 | G/B | Am9 | Em9', l: 'keys bass drums pad', e: 0.5 },
      B: { c: 'Am9 | D13 | Gmaj9 | B7sus4 B7 | Cmaj9 | Cm6 | Bm7 | Em9', l: 'keys bass drums arp lead', e: 0.6 },
    },
    form: 'A A B A B', loop: 0,
  },
  // Credits: full reprise of the main theme, ending with the motif on brass + strings.
  credits: {
    bpm: 88, key: 57, mode: 'aeolian', swing: 0.12, lp: 12000,
    inst: {
      pad: { cut: 1500, vol: 0.18, atk: 1.2, rel: 1.8, lo: 52, hi: 76 },
      keys: { style: 'comp', vol: 0.2, lo: 55, hi: 72 },
      bass: { style: 'lofi', wave: 'sub', vol: 0.5 },
      drums: { kit: 'lofi', vol: 0.58, pat: LOFI_SOFT },
      arp: { rate: 16, pat: 'updown', wave: 'pluck', vol: 0.1, lo: 64, dly: 0.3 },
      lead: { wave: 'glass', vol: 0.3, oct: 1, dly: 0.3, verb: 0.45 },
      strings: { vol: 0.14, lo: 52, hi: 79, atk: 1.2 },
      bell: { vol: 0.1, prob: 0.14 },
      perc: { vol: 0.35, pat: '9.......7.......' },
      hit: { vol: 0.4, every: 8 },
      crackle: 0.04,
    },
    sec: {
      i: { c: 'Am9 | Fmaj9 | C/G | E7sus4 E7', l: 'pad bell strings', e: 0.45 },
      A: { c: THEME_MIN, l: 'pad keys bass drums lead', m: 'theme', e: 0.6 },
      B: { c: 'Dm9 | G13 | Cmaj9 | Fmaj7#11 | Bm7b5 | E7b9 | Am9 | E7sus4 E7', l: 'pad keys bass drums arp strings', d: 'b', e: 0.7 },
      A2: { c: THEME_MIN, l: 'pad strings bass drums lead arp perc hit', m: 'theme', lw: 'saw', d: 'b', e: 0.85 },
      o: { c: 'Fmaj9 | Em7 | Dm9 | Am9', l: 'pad bell strings', e: 0.4, fill: false },
    },
    form: 'i A B A2 o', loop: 1,
  },
};
