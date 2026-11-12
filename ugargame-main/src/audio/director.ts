/**
 * Adaptive director: unlock-on-gesture, menu/gameplay music + ambience from game state with
 * hysteresis, scene claims (cutscenes/credits), the phone player's manual mode and UI click sounds.
 */
import { useEffect } from 'react';
import { needsFocus, useGame } from '../game/store';
import type { AmbienceId, MusicTrack } from './index';
import { setAmbience } from './ambience';
import { unlockEngine } from './engine';
import { setMusic } from './music';
import { isSfxId, playSfx } from './sfx';
import { getSnap, patchSnap } from './state';
import { initVoices } from './voice';

const HOLD = 20000;
const claims = new Set<symbol>();
let manual: MusicTrack | null = null;
let paused = false;
let curM: MusicTrack | null | undefined;
let curA: AmbienceId | null | undefined;
let curAv = 1;
let lastM = 0;
let lastA = 0;

type GS = ReturnType<typeof useGame.getState>;

function want(s: GS): { m: MusicTrack; a: AmbienceId; av: number; menu: boolean } {
  if (s.menu || !s.started) return { m: 'menu', a: 'rain_street', av: 0.55, menu: true };
  const hour = Math.floor((((s.now % 1440) + 1440) % 1440) / 60);
  const night = hour < 7 || hour >= 21;
  const danger = !!s.block161 || Object.values(s.banks).some((b) => b.opened && (b.status === 'restricted115' || b.status === 'request115'));
  const moscow = s.hero.location === 'moscow';
  const m: MusicTrack = needsFocus(s) ? 'focus' : danger ? 'danger' : moscow && !night ? 'moscow' : night ? 'night' : 'day';
  const a: AmbienceId = moscow ? (night ? (s.hero.home === 'office' ? 'office_night' : 'city_night') : 'office_day') : night ? 'rain_window' : 'room_day';
  return { m, a, av: 1, menu: false };
}

const tense = (x: MusicTrack | null | undefined) => x === 'focus' || x === 'danger';

/** Re-evaluate desired music/ambience. `force` skips hysteresis (scene release, player actions). */
export function evaluate(force = false) {
  if (claims.size) return;
  const s = useGame.getState();
  if (s.cutscene && !force) return;
  const w = want(s);
  const now = performance.now();
  let m: MusicTrack | null = w.m;
  if (!w.menu && manual) m = manual;
  if (!w.menu && paused) m = null;
  if (m !== curM) {
    const urgent = force || curM == null || m == null || w.menu || curM === 'menu' || tense(m) || tense(curM) || !!manual;
    if (urgent || now - lastM >= HOLD) {
      const fade = tense(m) ? 1500 : w.menu || curM === 'menu' || curM == null ? 2500 : m == null ? 800 : 4000;
      curM = m;
      lastM = now;
      setMusic(m, fade);
      if (m) patchSnap({ track: m });
    }
  }
  if (w.a !== curA || w.av !== curAv) {
    if (force || curA == null || w.menu || curA === 'rain_street' || now - lastA >= HOLD) {
      curA = w.a;
      curAv = w.av;
      lastA = now;
      setAmbience(w.a, 4000, w.av);
      patchSnap({ ambience: w.a });
    }
  }
}

/** Cutscenes / credits take over music + ambience until release(). */
export function claim(owner: string): () => void {
  const k = Symbol(owner);
  claims.add(k);
  curM = undefined;
  curA = undefined;
  return () => {
    if (claims.delete(k) && !claims.size) evaluate(true);
  };
}

export const player = {
  play(track: MusicTrack) {
    manual = track;
    paused = false;
    patchSnap({ manual: true, paused: false, ...(claims.size ? {} : { track }) });
    evaluate(true);
  },
  pause() {
    paused = true;
    patchSnap({ paused: true });
    evaluate(true);
  },
  resume() {
    paused = false;
    patchSnap({ paused: false });
    evaluate(true);
  },
  auto() {
    manual = null;
    paused = false;
    patchSnap({ manual: false, paused: false });
    evaluate(true);
  },
  current: () => manual ?? getSnap().track,
};

// ───────── document listeners ─────────

const CLICKABLE = 'button,[role=button],a[href],[role=tab],[role=menuitem],[role=switch],[role=option],summary';
let uiRefs = 0;
let uiOff: (() => void) | null = null;

/** Quiet UI click / phone tap on pointerdown and soft key ticks while typing (ref-counted). */
export function installInteraction(): () => void {
  if (uiRefs++ === 0 && typeof document !== 'undefined') {
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      const el = e.target as Element | null;
      if (!el?.closest) return;
      const tag = el.closest<HTMLElement>('[data-sfx]');
      const btn = el.closest<HTMLElement>(CLICKABLE);
      if (!tag && !btn) return;
      if (btn && ((btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true')) return;
      const v = tag?.dataset.sfx;
      if (v === 'none') return;
      const id = isSfxId(v) ? v : el.closest('[data-phone]') ? 'phone_tap' : 'ui_click';
      playSfx(id, { volume: id === 'phone_tap' ? 0.7 : 0.6 });
    };
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const text = t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|search|email|number|password|tel|url|)$/.test((t as HTMLInputElement).type)) || t.isContentEditable;
      if (text && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) playSfx('key', { volume: 0.3, rate: 0.92 + Math.random() * 0.16 });
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    uiOff = () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key, true);
    };
  }
  return () => {
    if (--uiRefs === 0) {
      uiOff?.();
      uiOff = null;
    }
  };
}

function installUnlock(): () => void {
  const h = () => unlockEngine();
  const evs = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'] as const;
  evs.forEach((e) => window.addEventListener(e, h, { capture: true, passive: true }));
  return () => evs.forEach((e) => window.removeEventListener(e, h, { capture: true }));
}

export function useAudioDirector(): void {
  useEffect(() => {
    initVoices();
    const offUnlock = installUnlock();
    const offUi = installInteraction();
    const unsub = useGame.subscribe(() => evaluate());
    const iv = setInterval(() => evaluate(), 2000);
    evaluate(true);
    return () => {
      offUnlock();
      offUi();
      unsub();
      clearInterval(iv);
    };
  }, []);
}
