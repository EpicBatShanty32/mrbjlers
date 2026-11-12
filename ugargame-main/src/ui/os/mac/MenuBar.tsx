import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BatteryCharging, BellOff, Bluetooth, Cpu, Headphones, Lightbulb, Search, ToggleRight, Volume2, VolumeX, Wifi, X } from 'lucide-react';
import { useGame } from '../../../game/store';
import { useSettings } from '../../../game/settings';
import { clockStr, dateStr } from '../../../game/util';
import { cn } from '../../common/kit';
import { audio } from '../../../audio';
import { openSettings } from '../../settings/store';
import { Slider } from '../../settings/controls';
import { APP_IDS, MAC_NAME, appMeta } from '../apps';
import { FruitLogo, topWindow, useDismiss } from '../shared';
import { ChapterBadge, ClipboardChip, SpeedControls, Vitals, pcLoad, useOpenCount } from '../widgets';
import { toggleSpotlight } from './Spotlight';

type MenuId = 'fruit' | 'app' | 'file' | 'edit' | 'view' | 'window' | 'help';
type Item = { label: string; run?: () => void; hint?: string; check?: boolean; disabled?: boolean } | null;

const g = useGame.getState;
const withResult = (fn: () => { ok: boolean; error?: string }, okText?: string) => () => {
  const r = fn();
  if (!r.ok) g().toast('error', r.error ?? 'Не получилось');
  else if (okText) g().toast('info', okText);
};

function buildMenu(id: MenuId, about: () => void): Item[] {
  const s = g();
  const top = topWindow(s);
  const open = APP_IDS.filter((a) => s.ui.windows[a].open);
  const name = top ? MAC_NAME[top] : 'Finder';
  switch (id) {
    case 'fruit':
      return [
        { label: 'Об этом Mac', run: about },
        null,
        { label: 'Системные настройки…', run: () => openSettings(), hint: '⌘,' },
        ...(s.chapter >= 2 ? [{ label: 'Магазин имущества…', run: () => (s.setBrowserTab('shop'), s.openWindow('browser')) }] : []),
        null,
        { label: 'Подождать 1 час', run: withResult(() => g().skipHours(1), 'Прошёл час') },
        { label: 'Лечь спать', run: withResult(() => g().sleep()) },
        null,
        { label: 'Сохранить и выйти в меню…', run: () => g().quitToMenu(), hint: '⇧⌘Q' },
      ];
    case 'app':
      return [
        { label: `Скрыть «${name}»`, run: () => top && g().minimizeWindow(top), disabled: !top, hint: '⌘H' },
        { label: 'Закрыть окно', run: () => top && g().closeWindow(top), disabled: !top, hint: '⌘W' },
      ];
    case 'file':
      return [
        { label: 'Новое окно браузера', run: () => g().openWindow('browser'), hint: '⌘N' },
        { label: 'Открыть «Чеки и Ордера»', run: () => g().openWindow('files'), hint: '⌘O' },
        { label: 'Открыть блокнот', run: () => g().openWindow('notes') },
        { label: 'Открыть калькулятор', run: () => g().openWindow('calc') },
        null,
        { label: 'Закрыть окно', run: () => top && g().closeWindow(top), disabled: !top, hint: '⌘W' },
      ];
    case 'edit':
      return [
        { label: s.clipboard ? `В буфере: ${s.clipboard.label}` : 'Буфер обмена пуст', disabled: true },
        { label: 'Очистить буфер обмена', run: () => g().act((d) => void (d.clipboard = null)), disabled: !s.clipboard },
      ];
    case 'view':
      return [
        { label: 'Подсказки', check: s.ui.hints, run: () => g().toggleHints() },
        { label: 'Цели главы', check: s.ui.questOpen, run: () => g().toggleQuest() },
        null,
        { label: top && s.ui.windows[top].maximized ? 'Выйти из полноэкранного режима' : 'Во весь экран', run: () => top && g().toggleMaximize(top), disabled: !top, hint: '⌃⌘F' },
        { label: 'Изменить обои…', run: () => openSettings('screen', 'wallpaper') },
      ];
    case 'window':
      return [
        { label: 'Свернуть', run: () => top && g().minimizeWindow(top), disabled: !top, hint: '⌘M' },
        { label: 'Масштаб', run: () => top && g().toggleMaximize(top), disabled: !top },
        { label: 'Свернуть все окна', run: () => open.forEach((a) => g().minimizeWindow(a)), disabled: !open.length },
        null,
        ...(open.length ? open.map((a) => ({ label: appMeta(a, !!s.flags.sheetUnlocked).title, check: a === top, run: () => g().focusWindow(a) })) : [{ label: 'Нет открытых окон', disabled: true }]),
      ];
    case 'help':
      return [
        { label: 'Spotlight: найти и запустить…', run: () => toggleSpotlight(true), hint: '⌃Space' },
        { label: 'Как играть', run: () => openSettings('game') },
        { label: 'Звук и озвучка…', run: () => openSettings('sound') },
      ];
  }
}

/** macOS-style menu bar (PC tier 3). */
export default function MenuBar() {
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [cc, setCc] = useState(false);
  const [about, setAbout] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btns = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});
  useDismiss(ref, !!menu || cc || about, () => {
    setMenu(null);
    setCc(false);
    setAbout(false);
  });
  const active = useGame((s) => topWindow(s));
  const now = useGame((s) => Math.floor(s.now));
  const MENUS: [MenuId, ReactNode][] = [
    ['fruit', <FruitLogo size={15} />],
    ['app', <b className="font-bold">{active ? MAC_NAME[active] : 'Finder'}</b>],
    ['file', 'Файл'],
    ['edit', 'Правка'],
    ['view', 'Вид'],
    ['window', 'Окно'],
    ['help', 'Справка'],
  ];
  return (
    <div ref={ref} className="@container relative z-[400] flex h-7 shrink-0 items-center bg-[#16161B]/50 px-1.5 text-[13px] text-white/90 backdrop-blur-2xl backdrop-saturate-150" style={{ boxShadow: 'inset 0 -.5px 0 rgba(255,255,255,.08)' }}>
      {MENUS.map(([id, label]) => (
        <button
          key={id}
          ref={(el) => void (btns.current[id] = el)}
          onClick={() => {
            setCc(false);
            setMenu((m) => (m === id ? null : id));
          }}
          onMouseEnter={() => menu && menu !== id && setMenu(id)}
          className={cn('flex h-[22px] shrink-0 items-center rounded-[5px] px-2.5', menu === id ? 'bg-white/20' : 'hover:bg-white/10', id === 'fruit' && 'px-3', id !== 'fruit' && id !== 'app' && '@max-3xl:hidden')}
        >
          {label}
        </button>
      ))}
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <ChapterBadge skin="mac" />
        <SpeedControls skin="mac" />
        <span className="@max-4xl:hidden">
          <Vitals skin="mac" />
        </span>
        <ClipboardChip skin="mac" />
        <MbIcon
          title="Пункт управления"
          active={cc}
          onClick={() => {
            setMenu(null);
            setCc((v) => !v);
          }}
        >
          <ToggleRight size={17} />
        </MbIcon>
        <span className="px-1 @max-3xl:hidden">
          <Wifi size={15} />
        </span>
        <span className="flex items-center gap-1 px-1 text-[12px] @max-3xl:hidden">
          <span className="@max-5xl:hidden">100%</span>
          <BatteryCharging size={18} />
        </span>
        <MbIcon title="Spotlight (Ctrl+Пробел)" onClick={() => toggleSpotlight()}>
          <Search size={14} />
        </MbIcon>
        <span className="px-1.5 text-[12.5px] whitespace-nowrap num">
          <span className="@max-4xl:hidden">{dateStr(now)} </span>
          {clockStr(now)}
        </span>
      </div>
      <AnimatePresence>
        {menu && <Dropdown key={menu} items={buildMenu(menu, () => setAbout(true))} left={btns.current[menu]?.offsetLeft ?? 0} onPick={() => setMenu(null)} />}
        {cc && <ControlCentre key="cc" />}
        {about && <About key="about" onClose={() => setAbout(false)} />}
      </AnimatePresence>
    </div>
  );
}

function MbIcon({ title, active, onClick, children }: { title: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} className={cn('flex h-[22px] items-center rounded-[5px] px-1.5', active ? 'bg-white/20' : 'hover:bg-white/10')}>
      {children}
    </button>
  );
}

const glass = 'bg-[#2A2A30]/80 text-white shadow-[0_22px_60px_-12px_rgba(0,0,0,.85),inset_0_.5px_0_rgba(255,255,255,.16)] ring-1 ring-black/60 backdrop-blur-3xl backdrop-saturate-150';

function Dropdown({ items, left, onPick }: { items: Item[]; left: number; onPick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.06 }} style={{ left }} className={cn('absolute top-[26px] min-w-[240px] rounded-[9px] p-[5px] text-[13px]', glass)}>
      {items.map((it, i) =>
        it ? (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => {
              audio.sfx('ui_click');
              it.run?.();
              onPick();
            }}
            className="flex w-full items-center gap-1.5 rounded-[5px] px-1.5 py-[3px] text-left enabled:hover:bg-[#0A64D8] disabled:text-white/35"
          >
            <span className="w-3.5 text-center text-[11px]">{it.check ? '✓' : ''}</span>
            <span className="max-w-[300px] flex-1 truncate">{it.label}</span>
            {it.hint && <span className="pl-5 text-white/40">{it.hint}</span>}
          </button>
        ) : (
          <div key={i} className="mx-2 my-[5px] h-px bg-white/10" />
        ),
      )}
    </motion.div>
  );
}

function ControlCentre() {
  const st = useSettings();
  const hints = useGame((s) => s.ui.hints);
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const open = useOpenCount();
  const [bt, setBt] = useState(true);
  const { cpu, ram, ramMax } = pcLoad(3, open);
  const row = (icon: ReactNode, on: boolean, label: string, sub: string, fn?: () => void) => (
    <button onClick={() => fn && (audio.sfx('ui_toggle'), fn())} className="flex w-full items-center gap-2.5 text-left">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors', on ? 'bg-[#0A84FF] text-white' : 'bg-white/15 text-white/80')}>{icon}</span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[12.5px] font-semibold">{label}</span>
        <span className="block truncate text-[11px] text-white/50">{sub}</span>
      </span>
    </button>
  );
  const tile = (icon: ReactNode, on: boolean, label: string, fn: () => void) => (
    <button onClick={() => (audio.sfx('ui_toggle'), fn())} className="flex items-center gap-2.5 rounded-2xl bg-white/[.09] p-2.5 text-left ring-1 ring-white/[.06] hover:bg-white/[.13]">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors', on ? 'bg-[#0A84FF] text-white' : 'bg-white/15 text-white/80')}>{icon}</span>
      <span className="text-[12px] leading-tight font-semibold">{label}</span>
    </button>
  );
  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} style={{ transformOrigin: 'top right' }} className={cn('absolute top-[31px] right-1.5 w-[330px] space-y-2 rounded-[20px] p-2.5', glass)}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2.5 rounded-2xl bg-white/[.09] p-2.5 ring-1 ring-white/[.06]">
          {row(<Wifi size={14} />, true, 'Wi-Fi', moscow ? 'MGTS_5G' : 'Novozarovsk_NET')}
          {row(<Bluetooth size={14} />, bt, 'Bluetooth', bt ? 'Вкл.' : 'Выкл.', () => setBt((v) => !v))}
          {row(<Lightbulb size={14} />, hints, 'Подсказки', hints ? 'Вкл.' : 'Выкл.', () => g().toggleHints())}
        </div>
        <div className="grid gap-2">
          {tile(<BellOff size={14} />, st.dnd, 'Не беспокоить', () => st.set({ dnd: !st.dnd }))}
          {tile(st.muted ? <VolumeX size={14} /> : <Volume2 size={14} />, st.muted, 'Без звука', () => st.set({ muted: !st.muted }))}
        </div>
      </div>
      {(
        [
          ['Звук', <Volume2 size={14} />, st.master, (v: number) => st.set({ master: v, muted: false })],
          ['Музыка', <Headphones size={14} />, st.music, (v: number) => st.set({ music: v })],
        ] as const
      ).map(([label, icon, v, fn]) => (
        <div key={label} className="rounded-2xl bg-white/[.09] px-3 py-2 ring-1 ring-white/[.06]">
          <div className="mb-1 text-[12px] font-semibold">{label}</div>
          <div className="flex items-center gap-2 text-white/70">
            {icon}
            <Slider value={v} onChange={fn} accent="#ffffff" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-2xl bg-white/[.09] px-3 py-2 text-[11.5px] text-white/70 ring-1 ring-white/[.06] num">
        <Cpu size={14} /> M5 Max · ЦП {cpu}% · память {ram.toFixed(1)} из {ramMax} ГБ
      </div>
      <button onClick={() => openSettings('sound')} className="w-full rounded-2xl bg-white/[.09] py-2 text-[12.5px] ring-1 ring-white/[.06] hover:bg-white/[.14]">
        Настройки игры…
      </button>
    </motion.div>
  );
}

function About({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={cn('absolute top-[110px] left-1/2 w-[300px] -translate-x-1/2 rounded-2xl px-6 pt-8 pb-6 text-center', glass)}>
      <button onClick={onClose} title="Закрыть" className="group absolute top-3 left-3 flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] text-black/60">
        <X size={8} strokeWidth={3} className="opacity-0 group-hover:opacity-100" />
      </button>
      <div className="mx-auto mb-4 w-40">
        <div className="mx-auto h-[88px] w-[136px] rounded-t-[8px] bg-[#0b0b0d] p-[5px] ring-1 ring-white/15">
          <div className="h-full w-full rounded-[3px] bg-[radial-gradient(120%_90%_at_30%_100%,#ff8a3c,#7b2ff7_45%,#0b1640)]" />
        </div>
        <div className="mx-auto h-[6px] w-40 rounded-b-[6px] bg-gradient-to-b from-[#c9ccd2] to-[#8d939b]" />
      </div>
      <div className="text-[19px] font-semibold">MacBook Pro</div>
      <div className="text-[11.5px] text-white/50">16 дюймов, 2026</div>
      <dl className="mt-4 space-y-1 text-[11.5px]">
        {[
          ['Чип', 'M5 Max'],
          ['Память', '128 ГБ'],
          ['Монитор', 'Studio Display 27″'],
          ['Серийный номер', 'VRN7Q2M5AX'],
          ['macOS', 'Новозаровск 26.1'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-white/50">{k}</dt>
            <dd className="text-white/90">{v}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}
