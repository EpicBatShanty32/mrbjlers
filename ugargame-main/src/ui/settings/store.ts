import { create } from 'zustand';

export type SettingsTab = 'sound' | 'scenes' | 'screen' | 'game';

interface SettingsUi {
  open: boolean;
  tab: SettingsTab;
  /** Element id to scroll to when the modal opens (e.g. 'wallpaper'). */
  focus: string | null;
}

/** Open state of the settings modal. Callable from anywhere: title screen, Start menu, Mac menu, phone… */
export const useSettingsUi = create<SettingsUi>(() => ({ open: false, tab: 'sound', focus: null }));

export const openSettings = (tab: SettingsTab = 'sound', focus: string | null = null) => useSettingsUi.setState({ open: true, tab, focus });
export const closeSettings = () => useSettingsUi.setState({ open: false, focus: null });

/** Decoupled alternative: `window.dispatchEvent(new CustomEvent('p2p:settings', { detail: { tab: 'sound' } }))`. */
export const SETTINGS_EVENT = 'p2p:settings';
