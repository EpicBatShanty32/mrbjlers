/**
 * Public audio API — the contract every UI module codes against.
 * Everything is procedural (WebAudio + speechSynthesis): no asset files, so the
 * single-file offline build keeps working. Keep exported names and signatures stable.
 *
 * Ownership rules:
 *  - `useAudioDirector()` (mounted once in App) picks music + ambience from game state:
 *    menu theme, day/night work music, tension during deals, location ambience.
 *  - While someone holds `claimScene()` (cutscenes, ending/credits), the director does not
 *    touch music/ambience; the claimant sets them with `music()` / `ambience()`.
 *  - State-driven sounds (notifications, toasts, money, window/phone changes) are played
 *    by the audio module itself; UI code only calls `sfx()` for local interactions.
 */
import { useSyncExternalStore } from 'react';
import type { CharacterId } from '../game/types';

export type SfxId =
  // generic UI
  | 'ui_click' | 'ui_hover' | 'ui_back' | 'ui_toggle' | 'ui_open' | 'ui_close' | 'ui_error' | 'ui_success' | 'ui_select'
  // typing
  | 'key' | 'text_tick'
  // phone
  | 'phone_tap' | 'phone_unlock' | 'phone_lock' | 'phone_vibrate' | 'phone_home' | 'phone_app_open' | 'phone_app_close'
  | 'notify_bank' | 'notify_tg' | 'notify_sms' | 'notify_market' | 'notify_system' | 'notify_wallet'
  | 'msg_send' | 'msg_receive'
  // money & desk
  | 'cash_in' | 'cash_out' | 'coins' | 'shutter' | 'copy' | 'paste'
  | 'window_open' | 'window_close' | 'window_min'
  | 'thought' | 'success_big' | 'fail' | 'alarm' | 'heartbeat'
  // cinematic
  | 'cine_whoosh' | 'cine_impact' | 'cine_riser' | 'cine_boom' | 'cine_reveal'
  | 'choice_hover' | 'choice_select' | 'trust_up' | 'trust_down' | 'chapter' | 'title_hit'
  // foley for scenes
  | 'door_slam' | 'car_door' | 'car_pass' | 'thunder' | 'cup' | 'phone_buzz_table' | 'keyboard_burst' | 'train_horn'
  // VoronovOS boot
  | 'boot_bios' | 'boot_chime' | 'hdd';

export type MusicTrack =
  | 'menu' | 'day' | 'night' | 'focus' | 'moscow' | 'danger'
  | 'cs_rain' | 'cs_hope' | 'cs_mentor' | 'cs_tension' | 'cs_crisis' | 'cs_triumph' | 'cs_melancholy' | 'credits';

export type AmbienceId =
  | 'rain_street' | 'rain_window' | 'room_day' | 'train' | 'cafe' | 'office_day' | 'office_night' | 'boardroom'
  | 'storm' | 'city_night' | 'wind';

export type VoiceSpeaker = CharacterId | 'narrator' | 'thought' | (string & {});

export interface SfxOptions {
  /** 0..1 multiplier on top of the SFX bus. */
  volume?: number;
  /** -1..1 stereo position. */
  pan?: number;
  /** Playback-rate / pitch multiplier. */
  rate?: number;
}

export interface FadeOptions {
  fadeMs?: number;
}

export interface SpeakRequest {
  speaker: VoiceSpeaker;
  /** Display text; guillemets, emoji and symbols are cleaned up before speaking. */
  text: string;
  emotion?: string;
  onStart?: () => void;
  /** Character index reached in `text` (word boundaries) — for subtitle sync. */
  onProgress?: (charIndex: number) => void;
  /** Always fires exactly once: finished, cancelled, or voice unavailable. */
  onEnd?: () => void;
}

export interface VoiceHandle {
  cancel(): void;
  /** True when real speech synthesis is used (false = silent/blip fallback). */
  readonly tts: boolean;
  /** Rough duration estimate, ms. */
  readonly estimatedMs: number;
}

export interface TrackInfo {
  id: MusicTrack;
  title: string;
  artist: string;
  mood: string;
}

export interface AudioSnapshot {
  unlocked: boolean;
  /** Track currently audible (null = silence). */
  track: MusicTrack | null;
  /** Player picked a track in the phone music app (director stays out of the way in gameplay). */
  manual: boolean;
  paused: boolean;
  speaking: boolean;
  ambience: AmbienceId | null;
}

export const TRACKS: TrackInfo[] = [
  { id: 'menu', title: 'Новозаровск. Дождь', artist: 'P2P: С НУЛЯ — OST', mood: 'главная тема' },
  { id: 'day', title: 'Спред', artist: 'P2P: С НУЛЯ — OST', mood: 'lo-fi, день' },
  { id: 'night', title: '02:14', artist: 'P2P: С НУЛЯ — OST', mood: 'ночь' },
  { id: 'focus', title: 'Ордер открыт', artist: 'P2P: С НУЛЯ — OST', mood: 'сделка' },
  { id: 'moscow', title: 'Покровка', artist: 'P2P: С НУЛЯ — OST', mood: 'Москва' },
  { id: 'danger', title: '115-ФЗ', artist: 'P2P: С НУЛЯ — OST', mood: 'тревога' },
  { id: 'cs_rain', title: 'Лера', artist: 'P2P: С НУЛЯ — OST', mood: 'грусть' },
  { id: 'cs_hope', title: 'Первые 74 рубля', artist: 'P2P: С НУЛЯ — OST', mood: 'надежда' },
  { id: 'cs_mentor', title: 'Сначала считать', artist: 'P2P: С НУЛЯ — OST', mood: 'наставник' },
  { id: 'cs_tension', title: 'Пул Капула', artist: 'P2P: С НУЛЯ — OST', mood: 'напряжение' },
  { id: 'cs_crisis', title: 'Заморозка', artist: 'P2P: С НУЛЯ — OST', mood: 'кризис' },
  { id: 'cs_triumph', title: 'Архитектор', artist: 'P2P: С НУЛЯ — OST', mood: 'триумф' },
  { id: 'cs_melancholy', title: 'Одинокий волк', artist: 'P2P: С НУЛЯ — OST', mood: 'меланхолия' },
  { id: 'credits', title: 'С нуля (титры)', artist: 'P2P: С НУЛЯ — OST', mood: 'финал' },
];

// ───────── stub implementation (replaced by the audio engine) ─────────

let snap: AudioSnapshot = { unlocked: false, track: null, manual: false, paused: false, speaking: false, ambience: null };
const subs = new Set<() => void>();
const emit = (patch: Partial<AudioSnapshot>) => {
  snap = { ...snap, ...patch };
  subs.forEach((f) => f());
};

export const audio = {
  /** Call from a user gesture; idempotent. */
  unlock(): void {
    if (!snap.unlocked) emit({ unlocked: true });
  },
  sfx(_id: SfxId, _opts?: SfxOptions): void {},
  music(track: MusicTrack | null, _opts?: FadeOptions): void {
    emit({ track });
  },
  ambience(id: AmbienceId | null, _opts?: FadeOptions): void {
    emit({ ambience: id });
  },
  /** Take over music/ambience (cutscenes, credits). Returns release(). */
  claimScene(_owner: string): () => void {
    return () => {};
  },
  speak(req: SpeakRequest): VoiceHandle {
    const ms = 600 + req.text.length * 55;
    let done = false;
    const t = setTimeout(() => {
      done = true;
      req.onEnd?.();
    }, ms);
    req.onStart?.();
    return {
      tts: false,
      estimatedMs: ms,
      cancel() {
        if (done) return;
        done = true;
        clearTimeout(t);
        req.onEnd?.();
      },
    };
  },
  stopVoice(): void {},
  voiceAvailable(): boolean {
    return false;
  },
  /** Installed speechSynthesis voices suitable for Russian (for the settings UI). */
  voices(): { name: string; gender: 'male' | 'female' | 'unknown' }[] {
    return [];
  },
  tracks(): TrackInfo[] {
    return TRACKS;
  },
  snapshot(): AudioSnapshot {
    return snap;
  },
  subscribe(fn: () => void): () => void {
    subs.add(fn);
    return () => void subs.delete(fn);
  },
  /** Phone music app controls. */
  player: {
    play(track: MusicTrack): void {
      emit({ track, manual: true, paused: false });
    },
    pause(): void {
      emit({ paused: true });
    },
    resume(): void {
      emit({ paused: false });
    },
    next(): void {},
    prev(): void {},
    /** Back to the adaptive soundtrack. */
    auto(): void {
      emit({ manual: false, paused: false });
    },
  },
  /** Current output loudness 0..1 for visualizers. */
  level(): number {
    return 0;
  },
};

export function useAudioSnapshot(): AudioSnapshot {
  return useSyncExternalStore(audio.subscribe, audio.snapshot, audio.snapshot);
}

/** Mounted once at the top of App: unlock on first gesture, adaptive music & ambience. */
export function useAudioDirector(): void {}
