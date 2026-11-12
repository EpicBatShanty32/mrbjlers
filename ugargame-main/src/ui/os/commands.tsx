import type { ReactNode } from 'react';
import { BedDouble, Image, Lightbulb, LogOut, Target, Timer } from 'lucide-react';
import { useGame } from '../../game/store';
import { openSettings } from '../settings/store';
import { APP_IDS, AppIcon, appMeta, useRulesUnlocked } from './apps';
import type { Skin } from './shared';

type Result = { ok: boolean; error?: string } | void;

export interface Cmd {
  id: string;
  label: string;
  sub: string;
  kind: 'app' | 'action';
  icon: ReactNode;
  keys: string;
  run: () => Result;
}

const KEYS: Record<string, string> = {
  browser: 'bybit биржа p2p usdt ордер сделка интернет',
  files: 'чеки ордера pdf документы 115 папка finder',
  calc: 'калькулятор спред прибыль считать',
  notes: 'блокнот заметки план правила txt',
};

/** Shared launcher entries for the Start-menu search and Spotlight. */
export function useCommands(skin: Skin): Cmd[] {
  const rules = useRulesUnlocked();
  const hints = useGame((s) => s.ui.hints);
  const shop = useGame((s) => s.chapter >= 2);
  const g = useGame.getState;
  const ico = (n: ReactNode) => <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-white/10 text-white/80">{n}</span>;
  const apps: Cmd[] = APP_IDS.map((id) => {
    const m = appMeta(id, rules);
    return { id, label: m.short, sub: m.title, kind: 'app', icon: <AppIcon id={id} skin={skin} size={22} />, keys: KEYS[id], run: () => g().openWindow(id) };
  });
  const actions: Cmd[] = [
    { id: 'settings', label: 'Настройки', sub: 'Звук, сцены, экран и обои', kind: 'action', icon: <AppIcon id="settings" skin={skin} size={22} />, keys: 'параметры громкость звук голос', run: () => openSettings() },
    ...(shop
      ? [{ id: 'shop', label: 'Магазин имущества', sub: 'Компьютер, телефон, жильё, авто', kind: 'action' as const, icon: <AppIcon id="shop" skin={skin} size={22} />, keys: 'купить mac iphone апгрейд', run: () => { g().setBrowserTab('shop'); g().openWindow('browser'); } }]
      : []),
    { id: 'sleep', label: 'Лечь спать', sub: 'До 08:00 или вздремнуть днём', kind: 'action', icon: ico(<BedDouble size={14} />), keys: 'сон отдых', run: () => g().sleep() },
    { id: 'wait', label: 'Подождать 1 час', sub: 'Промотать время', kind: 'action', icon: ico(<Timer size={14} />), keys: 'время ждать час', run: () => g().skipHours(1) },
    { id: 'hints', label: hints ? 'Выключить подсказки' : 'Включить подсказки', sub: 'Подсказки в панели целей', kind: 'action', icon: ico(<Lightbulb size={14} />), keys: 'подсказки помощь', run: () => g().toggleHints() },
    { id: 'quest', label: 'Цели главы', sub: 'Показать или скрыть список целей', kind: 'action', icon: ico(<Target size={14} />), keys: 'цели задачи квест глава', run: () => g().toggleQuest() },
    { id: 'wallpaper', label: 'Сменить обои', sub: 'Персонализация', kind: 'action', icon: ico(<Image size={14} />), keys: 'обои фон персонализация', run: () => openSettings('screen', 'wallpaper') },
    { id: 'quit', label: 'Сохранить и выйти в меню', sub: 'Игра сохраняется автоматически', kind: 'action', icon: ico(<LogOut size={14} />), keys: 'выход меню сохранить', run: () => g().quitToMenu() },
  ];
  return [...apps, ...actions];
}

export const matchCmd = (c: Cmd, q: string) => {
  const s = q.trim().toLowerCase();
  return !s || `${c.label} ${c.sub} ${c.keys}`.toLowerCase().includes(s);
};
