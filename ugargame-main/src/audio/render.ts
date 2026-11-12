/**
 * Dev-only offline checks (not imported by the app): renders tracks, beds and SFX through the real
 * mix graph on an OfflineAudioContext and reports peak / RMS / NaN / silence.
 * Usage in the dev server console: `(await import('/src/audio/render.ts')).checkAll()`.
 */
import type { AmbienceId, MusicTrack, SfxId } from './index';
import { Bed } from './ambience';
import { buildGraph, type Graph } from './engine';
import { barsOf, chord, pcsFor, Sequencer, validateSongs, voiceLead } from './music';
import { SONGS } from './songs';
import { playSfx, SFX_IDS } from './sfx';
import { cleanText, speak } from './voice';

const AMB: AmbienceId[] = ['rain_street', 'rain_window', 'room_day', 'train', 'cafe', 'office_day', 'office_night', 'boardroom', 'storm', 'city_night', 'wind'];

export interface Stats { peak: number; rms: number; nan: number; silent: number; ms: number }

export async function measure(sec: number, setup: (G: Graph) => void): Promise<Stats> {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.round(sr * sec), sr);
  const G = buildGraph(ctx);
  const t0 = performance.now();
  setup(G);
  const buf = await ctx.startRendering();
  let peak = 0, sum = 0, nan = 0, n = 0, silent = 0, wins = 0;
  const win = Math.floor(sr * 0.5);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    let ws = 0;
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      if (!Number.isFinite(x)) {
        nan++;
        continue;
      }
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
      ws += x * x;
      n++;
      if ((i + 1) % win === 0) {
        if (i > win) {
          wins++;
          if (Math.sqrt(ws / win) < 3e-4) silent++;
        }
        ws = 0;
      }
    }
  }
  const db = (v: number) => +(20 * Math.log10(v || 1e-9)).toFixed(1);
  return { peak: +peak.toFixed(3), rms: db(Math.sqrt(sum / Math.max(1, n))), nan, silent: wins ? +(silent / wins).toFixed(2) : 0, ms: Math.round(performance.now() - t0) };
}

export async function checkMusic(sec = 8, ids = Object.keys(SONGS) as MusicTrack[]) {
  validateSongs();
  const out: Record<string, Stats> = {};
  for (const id of ids) out[id] = await measure(sec, (G) => new Sequencer(G, id, 0.05, 0).scheduleUntil(sec));
  return out;
}

export async function checkAmbience(sec = 8, ids = AMB) {
  const out: Record<string, Stats> = {};
  for (const id of ids) out[id] = await measure(sec, (G) => new Bed(G, id, 0.05, 0).scheduleUntil(sec));
  return out;
}

export async function checkSfx(ids: SfxId[] = SFX_IDS) {
  const out: Record<string, Stats | string> = {};
  for (const id of ids) {
    try {
      out[id] = await measure(4.5, (G) => playSfx(id, {}, G, 0.05));
    } catch (e) {
      out[id] = String(e);
    }
  }
  return out;
}

/** speak() without voices / voice-over must end exactly once with tts:false. */
export function checkSpeak(): Promise<{ tts: boolean; est: number; ends: number; starts: number; progress: number[]; cleaned: string }> {
  return new Promise((res) => {
    let ends = 0, starts = 0;
    const progress: number[] = [];
    const text = '«Привет!» Перевёл 12 500 ₽ через СБП, 3% — это P2P на Bybit (USDT TRC-20). 115-ФЗ 🙂';
    const h = speak({ speaker: 'marat', text, rate: 3, onStart: () => starts++, onProgress: (i) => progress.push(i), onEnd: () => ends++ });
    setTimeout(() => {
      h.cancel();
      res({ tts: h.tts, est: h.estimatedMs, ends, starts, progress: [progress[0], progress[progress.length - 1], text.length], cleaned: cleanText(text).s });
    }, h.estimatedMs + 600);
  });
}

const NN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nn = (m: number) => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

/** Voiced keys/pad notes per chord of a section, with the total semitone movement from the previous voicing. */
export function voicings(id: MusicTrack, sec: string, n = 4): string[] {
  const S = SONGS[id];
  const o = S.inst.keys ?? S.inst.pad;
  let prev: number[] | undefined;
  return barsOf(S.sec[sec]).map((bar) =>
    bar
      .map((sym) => {
        const v = voiceLead(prev, pcsFor(chord(sym), n), o?.lo ?? 55, o?.hi ?? 74);
        const mv = prev ? v.reduce((a, m, i) => a + Math.abs(m - prev![i]), 0) : 0;
        prev = v;
        return `${sym}: ${v.map(nn).join(' ')} (Δ${mv})`;
      })
      .join(' | '),
  );
}

export async function checkAll() {
  return { music: await checkMusic(), ambience: await checkAmbience(), sfx: await checkSfx(), speak: await checkSpeak() };
}
