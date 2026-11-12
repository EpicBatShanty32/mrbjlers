import { useEffect, useRef, useState, type RefObject } from 'react';
import { audio, type VoiceHandle } from '../../audio';
import { useSettings, type TextSpeed } from '../../game/settings';
import type { Speaker } from '../../game/story/cutscenes';

const CPS: Record<TextSpeed, number> = { slow: 26, normal: 48, fast: 95, instant: Infinity };
const wordEnd = (t: string, i: number) => {
  let j = i;
  while (j < t.length && !/\s/.test(t[j])) j++;
  return j;
};

export interface Reveal {
  shown: RefObject<HTMLSpanElement | null>;
  rest: RefObject<HTMLSpanElement | null>;
  /** Text fully revealed AND voice finished → continue prompt / auto-advance. */
  done: boolean;
  /** Voice is speaking or text is being typed (drives the portrait). */
  talking: boolean;
  /** True once every character is visible (voice may still be going). */
  isRevealed: () => boolean;
  finish: () => void;
}

interface Opts { text: string; who: Speaker; emotion?: string; run: boolean; instant?: boolean }

/**
 * Typewriter that writes to the DOM directly (no per-frame React state).
 * Voiced lines follow `onProgress` word boundaries (time-based fallback when the engine
 * emits none); unvoiced lines use the text-speed setting with soft tick sounds.
 */
export function useLineReveal({ text, who, emotion, run, instant }: Opts): Reveal {
  const shown = useRef<HTMLSpanElement>(null);
  const rest = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);
  const [talking, setTalking] = useState(false);
  const ctl = useRef({ finish: () => {}, revealed: false });

  useEffect(() => {
    setDone(false);
    setTalking(false);
    ctl.current.revealed = false;
    if (!run) return;
    const len = text.length;
    const st = useSettings.getState();
    const cps = instant ? Infinity : CPS[st.textSpeed];
    let n = 0, acc = 0, target = 0, tickN = 0, raf = 0, alive = true;
    let sync = false, progressed = false, ended = false;
    let handle: VoiceHandle | null = null;
    const t0 = performance.now();
    let last = t0;

    const paint = () => {
      if (shown.current) shown.current.textContent = text.slice(0, n);
      if (rest.current) rest.current.textContent = text.slice(n);
      ctl.current.revealed = n >= len;
    };
    const settle = () => {
      if (n >= len && (!sync || ended)) {
        setDone(true);
        setTalking(false);
      }
    };
    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.max(0, now - last);
      last = now;
      let goal = len;
      let rate = cps;
      if (sync && !ended) {
        goal = progressed ? target : Math.min(len - 1, Math.floor((Math.max(0, now - t0) / Math.max(500, handle?.estimatedMs ?? 3000)) * len));
        rate = 90;
      }
      let step = len;
      if (rate !== Infinity) {
        acc += (dt * rate) / 1000;
        step = Math.floor(acc);
        acc -= step;
      }
      if (step > 0 && n < goal) {
        n = Math.min(goal, n + step);
        paint();
        if (!st.voiceOver && n - tickN >= 3 && n < len) {
          tickN = n;
          audio.sfx('text_tick', { volume: 0.35 });
        }
      }
      if (n >= len) return settle();
      raf = requestAnimationFrame(frame);
    };

    ctl.current.finish = () => {
      n = len;
      paint();
      cancelAnimationFrame(raf);
      settle();
    };

    if (instant) {
      n = len;
      paint();
      setDone(true);
      return;
    }
    setTalking(true);
    if (st.voiceOver) {
      handle = audio.speak({
        speaker: who,
        text,
        emotion,
        onProgress: (ci) => {
          if (!alive) return;
          progressed = true;
          target = wordEnd(text, Math.max(0, Math.min(len - 1, ci)));
        },
        onEnd: () => {
          if (!alive) return;
          ended = true;
          settle();
        },
      });
      // silent fallback (no real speech): never make the player wait for the estimate
      sync = handle.tts && !ended && cps !== Infinity;
    }
    paint();
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      handle?.cancel();
    };
  }, [text, who, emotion, run, instant]);

  return { shown, rest, done, talking, isRevealed: () => ctl.current.revealed, finish: () => ctl.current.finish() };
}
