import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Player preferences. Stored separately from the save so they survive "New game"
 * and never break old saves (persist merges new fields over defaults).
 */
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Settings {
  /** Volumes 0..1 */
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  voice: number;
  muted: boolean;
  /** Speak cutscene lines and Telegram voice messages (speechSynthesis). */
  voiceOver: boolean;
  /** Preferred speechSynthesis voice names ('' = automatic choice). */
  voiceMale: string;
  voiceFemale: string;
  textSpeed: TextSpeed;
  /** Cutscenes advance by themselves once a line is read/spoken. */
  autoAdvance: boolean;
  filmGrain: boolean;
  reduceMotion: boolean;
  /** VoronovOS boot sequence when entering the game. */
  bootIntro: boolean;
  phoneWallpaper: string;
  pcWallpaper: string;
  /** 0.35..1 — dims the phone screen. */
  phoneBrightness: number;
  /** Do not disturb: phone banners and notification sounds are silenced. */
  dnd: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.55,
  sfx: 0.7,
  ambience: 0.5,
  voice: 0.9,
  muted: false,
  voiceOver: true,
  voiceMale: '',
  voiceFemale: '',
  textSpeed: 'normal',
  autoAdvance: false,
  filmGrain: true,
  reduceMotion: false,
  bootIntro: true,
  phoneWallpaper: 'aurora',
  pcWallpaper: 'dynamic',
  phoneBrightness: 1,
  dnd: false,
};

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const SETTINGS_KEY = 'p2p-s-nulya-settings-v1';

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_KEY,
      version: 1,
      partialize: ({ set: _s, reset: _r, ...rest }) => rest,
    },
  ),
);

/** Non-reactive read for audio code and event handlers. */
export const getSettings = (): Settings => useSettings.getState();
