/**
 * Voice-over through speechSynthesis: Russian voice ranking, character casting, emotion tweaks,
 * text cleanup with an index map back to the display text, chunked queue with progress estimation.
 */
import { getSettings } from '../game/settings';
import type { SpeakRequest, VoiceHandle } from './index';
import { duck, vcurve } from './engine';
import { patchSnap } from './state';
import { clamp, hash } from './synth';

type Gender = 'male' | 'female' | 'unknown';
const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

// ───────── voices ─────────

let ru: SpeechSynthesisVoice[] = [];
let inited = false;
const isRu = (v: SpeechSynthesisVoice) => /^ru([-_]|$)/i.test(v.lang) || /russian|русск/i.test(v.name);
const MALE = /dmitry|dmitri|yuri|pavel|maxim|ivan|nikolai|aleksandr|alexander|artem|boris|\bmale\b|мужск/i;
const FEMALE = /svetlana|dariya|darya|milena|katya|irina|alena|alyona|elena|anna|tatyana|tatiana|ekaterina|marina|olga|natalia|female|женск|google/i;

export function genderOf(v: { name: string }): Gender {
  if (/female|женск/i.test(v.name)) return 'female';
  if (MALE.test(v.name)) return 'male';
  return FEMALE.test(v.name) ? 'female' : 'unknown';
}

function rank(v: SpeechSynthesisVoice) {
  const n = v.name;
  let r = 0;
  if (/natural|online|neural/i.test(n)) r += 100;
  if (/svetlana|dariya|dmitry/i.test(n)) r += 10;
  if (/google/i.test(n)) r += 60;
  if (/milena|katya|yuri/i.test(n)) r += 40;
  if (/enhanced|premium|siri/i.test(n)) r += 15;
  if (/irina|pavel/i.test(n)) r += 20;
  if (v.lang === 'ru-RU') r += 3;
  return r;
}

function load() {
  const s = synth();
  if (!s) return;
  try {
    ru = s.getVoices().filter(isRu).sort((a, b) => rank(b) - rank(a));
  } catch {
    ru = [];
  }
}

export function initVoices() {
  if (inited) return;
  inited = true;
  const s = synth();
  if (!s) return;
  load();
  s.addEventListener?.('voiceschanged', load);
  let n = 0;
  const iv = setInterval(() => {
    load();
    if (ru.length || ++n > 24) clearInterval(iv);
  }, 250);
}

function pick(g: 'male' | 'female'): { v: SpeechSynthesisVoice; pitch: number } | null {
  if (!ru.length) return null;
  const s = getSettings();
  const pref = g === 'male' ? s.voiceMale : s.voiceFemale;
  const chosen = pref && ru.find((x) => x.name === pref);
  if (chosen) return { v: chosen, pitch: 1 };
  const same = ru.find((v) => genderOf(v) === g) ?? ru.find((v) => genderOf(v) === 'unknown');
  if (same) return { v: same, pitch: 1 };
  // only the other gender is installed: emulate with pitch
  return { v: ru[0], pitch: g === 'male' ? 0.72 : 1.32 };
}

export const voiceAvailable = () => (initVoices(), !!synth() && ru.length > 0);
export const listVoices = () => (initVoices(), ru.map((v) => ({ name: v.name, gender: genderOf(v) })));

// ───────── casting ─────────

interface Cast { g: 'male' | 'female'; p: number; r: number; v?: number }
const CAST: Record<string, Cast> = {
  artem: { g: 'male', p: 1, r: 1 },
  thought: { g: 'male', p: 1, r: 0.95, v: 0.8 },
  narrator: { g: 'male', p: 0.85, r: 0.92 },
  marat: { g: 'male', p: 0.8, r: 0.9 },
  danya: { g: 'male', p: 1.05, r: 1.12 },
  pasha: { g: 'male', p: 0.75, r: 0.92 },
  ivan: { g: 'male', p: 1, r: 1.1 },
  kapul: { g: 'male', p: 1, r: 1.08 },
  karim: { g: 'male', p: 0.95, r: 1 },
  sanya: { g: 'male', p: 1.1, r: 1.12 },
  grisha: { g: 'male', p: 0.9, r: 0.93 },
  max: { g: 'male', p: 1.08, r: 1.05 },
  lera: { g: 'female', p: 1.05, r: 1 },
  mama: { g: 'female', p: 0.95, r: 0.95 },
};
const ALIAS: Record<string, string> = {
  me: 'artem', 'артём': 'artem', 'артем': 'artem', 'марат': 'marat', 'даня': 'danya', 'паша': 'pasha', 'иван': 'ivan', 'капул': 'kapul',
  'карим': 'karim', 'саня': 'sanya', 'гриша': 'grisha', 'макс': 'max', 'лера': 'lera', 'мама': 'mama', 'рассказчик': 'narrator',
};
const MALE_NAMES = /^(саня|саша|даня|паша|гриша|ваня|миша|дима|лёша|леша|алёша|алеша|коля|толя|вова|петя|вася|гоша|серёжа|сережа|стёпа|степа|федя|костя|слава|юра|жора|илья|никита|кузьма|фома|лука|женя|тёма|тема|папа|дядя|дед|дедушка|батя|sasha|misha|nikita|ilya)$/;

function castFor(speaker: string): Cast {
  const k = speaker.trim().toLowerCase();
  if (CAST[k]) return CAST[k];
  const first = k.split(/[\s,.:@]+/).filter(Boolean)[0]?.replace(/[^a-zа-яё-]/g, '') ?? '';
  const id = ALIAS[k] ?? ALIAS[first];
  if (id) return CAST[id];
  const female = !MALE_NAMES.test(first) && /[aая]$/.test(first);
  return { g: female ? 'female' : 'male', p: 0.92 + (hash(k) % 17) / 100, r: 1 };
}

function emotion(e?: string) {
  const s = (e ?? '').toLowerCase();
  let r = 1, p = 1, v = 1;
  if (/ang|furi|mad|rage|зл|ярост|гнев/.test(s)) (r = 1.08), (v = 1.1), (p = 1.02);
  else if (/sad|cry|tear|груст|печал|слез/.test(s)) (r = 0.9), (p = 0.93);
  else if (/worr|anx|nerv|scar|fear|panic|трев|волн|страх|паник/.test(s)) (r = 1.07), (p = 1.03);
  else if (/calm|soft|gentle|спок|тих|мягк/.test(s)) r = 0.94;
  else if (/happy|joy|excit|cheer|рад|восторг|весел/.test(s)) (r = 1.05), (p = 1.05);
  if (/whisper|шёпот|шепот/.test(s)) (v *= 0.6), (r *= 0.95);
  return { r, p, v };
}

// ───────── text ─────────

type Rule = [RegExp, string | ((m: RegExpExecArray) => string)];
const RULES: Rule[] = [
  [/115[-‑–\s]?ФЗ/y, ' сто пятнадцатый фэ зэ '],
  [/161[-‑–\s]?ФЗ/y, ' сто шестьдесят первый фэ зэ '],
  [/TRC[-‑]?20/iy, ' ти ар си двадцать '],
  [/USDT/iy, ' ю эс ди ти '],
  [/[PР]2[PР]/iy, ' пи ту пи '],
  [/СБП/y, ' эс бэ пэ '],
  [/AML/y, ' эй эм эл '],
  [/OTC/y, ' о ти си '],
  [/KMI/iy, ' кей эм ай '],
  [/Bybit/iy, 'байбит'],
  [/₽/y, ' рублей'],
  [/%/y, ' процентов'],
  [/(\d)[ \u00A0\u202F](?=\d{3}(?!\d))/y, (m) => m[1]],
  [/[«»"“”„▍*_~`#]/y, ''],
  [/\p{Extended_Pictographic}(?:[\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic})*/uy, ' '],
  [/[\uFE0F\u200D]/y, ''],
];

/** Speakable text + map from each spoken char to its index in the display text. */
export function cleanText(text: string): { s: string; map: number[] } {
  let s = '';
  const map: number[] = [];
  const push = (str: string, at: number) => {
    for (let j = 0; j < str.length; j++) {
      const ch = str[j];
      if (/\s/.test(ch) && (!s.length || s[s.length - 1] === ' ')) continue;
      s += /\s/.test(ch) ? ' ' : ch;
      map.push(at);
    }
  };
  let i = 0;
  outer: while (i < text.length) {
    for (const [re, rep] of RULES) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m[0].length) {
        push(typeof rep === 'string' ? rep : rep(m), i);
        i += m[0].length;
        continue outer;
      }
    }
    push(text[i], i);
    i++;
  }
  while (s.endsWith(' ')) {
    s = s.slice(0, -1);
    map.pop();
  }
  return { s, map };
}

/** Sentence chunks ≤ ~180 chars (Chrome cuts long utterances); short sentences are merged. */
function chunks(s: string) {
  const sent: { at: number; text: string }[] = [];
  const re = /[^.!?…]*(?:[.!?…]+|$)\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && m[0]) sent.push({ at: m.index, text: m[0] });
  const parts: { at: number; text: string }[] = [];
  for (const x of sent) {
    let { at, text } = x;
    while (text.length > 180) {
      let c = Math.max(text.lastIndexOf(', ', 180), text.lastIndexOf(' — ', 180));
      if (c < 60) c = text.lastIndexOf(' ', 180);
      if (c < 20) c = 180;
      parts.push({ at, text: text.slice(0, c + 1) });
      at += c + 1;
      text = text.slice(c + 1);
    }
    parts.push({ at, text });
  }
  const out: { at: number; text: string }[] = [];
  for (const p of parts) {
    const l = out[out.length - 1];
    if (l && l.text.length < 40 && l.text.length + p.text.length <= 120) l.text += p.text;
    else out.push({ ...p });
  }
  return out.filter((c) => /[0-9a-zа-яё]/i.test(c.text));
}

// ───────── speak ─────────

let current: (() => void) | null = null;
const alive = new Set<SpeechSynthesisUtterance>(); // Chrome GC bug: keep utterances referenced
let speakingOn = false;
function setSpeaking(on: boolean) {
  if (on === speakingOn) return;
  speakingOn = on;
  duck(on);
  patchSnap({ speaking: on });
}

export function stopVoice() {
  current?.();
}

export function speak(req: SpeakRequest): VoiceHandle {
  initVoices();
  current?.();
  const set = getSettings();
  const { s: text, map } = cleanText(req.text ?? '');
  const cast = castFor(String(req.speaker ?? ''));
  const em = emotion(req.emotion);
  const rate = clamp(cast.r * em.r * (req.rate ?? 1), 0.5, 2.4);
  const cps = 14.5 * rate;
  const estimatedMs = Math.round(400 + (text.length / cps) * 1000);
  const sy = synth();
  const pv = sy && set.voiceOver && !set.muted && set.voice > 0 && set.master > 0 && /[0-9a-zа-яё]/i.test(text) ? pick(cast.g) : null;

  let mode: 'tts' | 'silent' | 'done' = pv ? 'tts' : 'silent';
  let tts = !!pv;
  let last = -1;
  let iv: number | undefined;
  const timers: number[] = [];
  const progress = (i: number) => {
    const o = i >= map.length ? req.text.length : map[Math.max(0, i)];
    if (o > last) {
      last = o;
      try {
        req.onProgress?.(o);
      } catch (e) {
        console.warn(e);
      }
    }
  };
  const finish = (natural: boolean) => {
    if (mode === 'done') return;
    const wasTts = mode === 'tts';
    mode = 'done';
    timers.forEach(clearTimeout);
    clearInterval(iv);
    if (current === cancel) current = null;
    if (wasTts && !natural) {
      try {
        sy?.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpeaking(false);
    if (natural) progress(text.length);
    try {
      req.onEnd?.();
    } catch (e) {
      console.warn(e);
    }
  };
  const cancel = () => finish(false);
  current = cancel;
  const handle: VoiceHandle = {
    cancel,
    get tts() {
      return tts;
    },
    estimatedMs,
  };
  const start = () => {
    try {
      req.onStart?.();
    } catch (e) {
      console.warn(e);
    }
  };
  /** Silent playback of the rest of the text with estimated progress. */
  const silent = (ms: number, from: number) => {
    mode = 'silent';
    tts = false;
    const t0 = performance.now();
    clearInterval(iv);
    iv = window.setInterval(() => progress(from + Math.floor(Math.min(1, (performance.now() - t0) / ms) * (text.length - from))), 100);
    timers.push(window.setTimeout(() => finish(true), ms));
  };
  if (!pv || !sy) {
    start();
    silent(estimatedMs, 0);
    return handle;
  }

  const parts = chunks(text);
  const est = (c: { text: string }) => (c.text.length / cps) * 1000 + 200;
  let k = 0;
  let started = false;
  let chunkT0 = 0;
  let lastB = 0;
  let lastResume = performance.now();
  const vol = clamp((cast.v ?? 1) * em.v * vcurve(set.master) * vcurve(set.voice) * 1.25, 0, 1);
  const fallbackRest = () => {
    if (mode !== 'tts') return;
    mode = 'silent';
    try {
      sy.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
    if (!started) {
      started = true;
      start();
    }
    silent(Math.max(300, parts.slice(k).reduce((a, c) => a + est(c), 0)), parts[k]?.at ?? text.length);
  };
  const say = () => {
    if (mode !== 'tts') return;
    const c = parts[k];
    if (!c) return finish(true);
    const u = new SpeechSynthesisUtterance(c.text);
    u.voice = pv.v;
    u.lang = pv.v.lang || 'ru-RU';
    u.rate = rate;
    u.pitch = clamp(cast.p * em.p * pv.pitch, 0.1, 2);
    u.volume = vol;
    u.onstart = () => {
      if (mode !== 'tts') return;
      chunkT0 = performance.now();
      lastB = 0;
      if (!started) {
        started = true;
        setSpeaking(true);
        start();
      }
    };
    u.onboundary = (e) => {
      if (mode !== 'tts') return;
      lastB = performance.now();
      progress(c.at + (e.charIndex || 0));
    };
    u.onend = () => {
      alive.delete(u);
      if (mode !== 'tts') return;
      progress(c.at + c.text.length);
      k++;
      if (k >= parts.length) finish(true);
      else say();
    };
    u.onerror = (e) => {
      alive.delete(u);
      if (mode !== 'tts') return;
      if (e.error === 'interrupted' || e.error === 'canceled') finish(false);
      else fallbackRest();
    };
    alive.add(u);
    try {
      sy.speak(u);
    } catch {
      fallbackRest();
    }
  };
  // Estimated progress when the engine has no boundary events + Chrome resume() keepalive.
  iv = window.setInterval(() => {
    if (mode !== 'tts' || !started) return;
    const now = performance.now();
    if (now - lastResume > 5000) {
      lastResume = now;
      try {
        sy.resume();
      } catch {
        /* ignore */
      }
    }
    const c = parts[k];
    if (!c || now - lastB < 700) return;
    progress(c.at + Math.floor(Math.min(0.96, (now - chunkT0) / est(c)) * c.text.length));
  }, 120);
  timers.push(window.setTimeout(() => mode === 'tts' && !started && fallbackRest(), 3000));
  timers.push(
    window.setTimeout(() => {
      if (mode !== 'tts') return;
      progress(text.length);
      cancel();
    }, estimatedMs * 2.5 + 6000),
  );
  if (sy.speaking || sy.pending) {
    try {
      sy.cancel();
    } catch {
      /* ignore */
    }
    timers.push(window.setTimeout(say, 80));
  } else say();
  return handle;
}

if (typeof window !== 'undefined') setTimeout(initVoices, 0);
