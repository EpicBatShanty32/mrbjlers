import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/store';
import { getSettings } from '../../game/settings';
import type { BankId, PcAppId, PhoneNotification } from '../../game/types';
import { audio, type SfxId, type SfxOptions } from '../../audio';
import { installInteraction } from '../../audio/director';

/** Drives the simulation: ~5 ticks per real second. */
export function useGameLoop() {
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;
      useGame.getState().tick(dt);
    }, 200);
    return () => clearInterval(id);
  }, []);
}

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

// ───────── sound effects (procedural, see src/audio) ─────────

type LegacySfx = 'notify' | 'message' | 'cash' | 'error' | 'click' | 'thought';
const LEGACY: Record<LegacySfx, SfxId> = { notify: 'notify_system', message: 'msg_receive', cash: 'cash_in', error: 'ui_error', click: 'ui_click', thought: 'thought' };

/** Thin wrapper over `audio.sfx` (accepts the old short names too). Volume/mute come from settings. */
export function sfx(kind: LegacySfx | SfxId, opts?: SfxOptions) {
  audio.sfx(LEGACY[kind as LegacySfx] ?? (kind as SfxId), opts);
}

const NOTIFY: Record<PhoneNotification['app'], SfxId> = {
  sber: 'notify_bank', tbank: 'notify_bank', alfa: 'notify_bank', telegram: 'notify_tg', sms: 'notify_sms',
  avito: 'notify_market', wallet: 'notify_wallet', system: 'notify_system', auth: 'notify_system', settings: 'notify_system', music: 'notify_system',
};

/** Plays sounds in reaction to state changes (notifications, toasts, money, windows, phone…). */
export function useSoundEffects() {
  useEffect(() => {
    const offUi = installInteraction();
    const last: Record<string, number> = {};
    const play = (id: SfxId, opts?: SfxOptions, gap = 0) => {
      const now = performance.now();
      if (gap && now - (last[id] ?? -1e9) < gap) return;
      last[id] = now;
      audio.sfx(id, opts);
    };
    const unsub = useGame.subscribe((s, p) => {
      if (s === p || s.menu || !s.started || p.menu || !p.started) return;
      let cashToast = false;

      if (s.toasts !== p.toasts) {
        const old = new Set(p.toasts.map((t) => t.id));
        for (const t of s.toasts) {
          if (old.has(t.id)) continue;
          if (t.kind === 'error') play('ui_error');
          else if (t.kind === 'success') (cashToast = true), play('cash_in', undefined, 250);
          else if (t.kind === 'thought') play('thought', { volume: 0.8 });
          else if (t.kind === 'warn') play('ui_warn');
        }
      }

      const top = s.notifications[0];
      if (top && s.notifications !== p.notifications && !p.notifications.some((n) => n.id === top.id)) {
        const dnd = getSettings().dnd;
        if (!dnd) play(NOTIFY[top.app] ?? 'notify_system', undefined, 350);
        if (dnd || s.ui.phoneLocked) play('phone_vibrate', { volume: 0.8 }, 900);
      }

      // messages arriving in the Telegram chat that is open right now (no notification for those)
      const chatId = s.ui.phoneApp === 'telegram' && !s.ui.phoneLocked ? s.ui.tgChat : null;
      if (chatId && chatId === p.ui.tgChat && s.tg !== p.tg) {
        const a = p.tg[chatId]?.messages;
        const b = s.tg[chatId]?.messages;
        const m = b?.[b.length - 1];
        if (a && b && m && m.id !== a[a.length - 1]?.id) play(m.from === 'me' ? 'msg_send' : 'msg_receive', { volume: 0.8 });
      }

      if (s.clipboard && s.clipboard !== p.clipboard) play('copy');

      if (s.ui.windows !== p.ui.windows)
        for (const k of Object.keys(s.ui.windows) as PcAppId[]) {
          const a = p.ui.windows[k];
          const b = s.ui.windows[k];
          if (!a || a === b) continue;
          if (!a.open && b.open) play('window_open');
          else if (a.open && !b.open) play('window_close');
          else if (b.open && !a.minimized && b.minimized) play('window_min');
          else if (b.open && a.minimized && !b.minimized) play('window_open', { volume: 0.7 });
        }

      if (s.ui.phoneLocked !== p.ui.phoneLocked) play(s.ui.phoneLocked ? 'phone_lock' : 'phone_unlock');
      else if (s.ui.phoneApp !== p.ui.phoneApp) play(s.ui.phoneApp ? 'phone_app_open' : 'phone_app_close');

      if (s.banks !== p.banks) {
        let delta = 0;
        let moved = false;
        let alarm = false;
        for (const id of Object.keys(s.banks) as BankId[]) {
          const a = p.banks[id];
          const b = s.banks[id];
          if (!a || a === b) continue;
          if (b.balance !== a.balance) (delta += b.balance - a.balance), (moved = true);
          if (b.status !== a.status && (b.status === 'request115' || b.status === 'restricted115')) alarm = true;
        }
        if (alarm) play('alarm', undefined, 3000);
        if (delta >= 1 && !cashToast) play('cash_in', undefined, 600);
        else if (delta <= -1) play('cash_out', undefined, 600);
        else if (moved && Math.abs(delta) < 1) play('coins', { volume: 0.5 }, 600);
      }
      if (s.block161 && !p.block161) play('alarm', undefined, 3000);
      if (s.ui.chapterCard != null && p.ui.chapterCard == null) play('chapter');
      if (s.cutscene && !p.cutscene) play('cine_whoosh');
      if (s.stats.scamsCaught > p.stats.scamsCaught) play('success_big');
      if (s.stats.scamsMissed > p.stats.scamsMissed) play('fail');
    });
    return () => {
      unsub();
      offUi();
    };
  }, []);
}
