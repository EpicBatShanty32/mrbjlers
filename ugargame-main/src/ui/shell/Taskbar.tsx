import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BatteryMedium, BedDouble, BellOff, Bluetooth, Cloud, CloudRain, FileText, Headphones, Lightbulb, LogOut, Moon, Power, Search, Settings, Sun, Target, Timer, Volume2, VolumeX, Wifi } from 'lucide-react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import { useSettings } from '../../game/settings';
import { clockStr, dateStr, gameDate, hourOf } from '../../game/util';
import { chapterDef } from '../../game/story/chapters';
import { cn, useResult } from '../common/kit';
import { audio } from '../../audio';
import { openSettings } from '../settings/store';
import { Slider } from '../settings/controls';
import { APP_IDS, AppIcon, useAppMeta, type IconId } from '../os/apps';
import { matchCmd, useCommands, type Cmd } from '../os/commands';
import { rng } from '../os/skyline';
import { iconRef, topWindow, useDismiss, VLogo } from '../os/shared';
import { ChapterBadge, ClipboardChip, CpuMeter, SpeedControls, Vitals } from '../os/widgets';

type Panel = 'start' | 'search' | 'quick' | 'calendar' | null;
const flyout = 'absolute bottom-[calc(100%+10px)] overflow-hidden rounded-xl bg-[#1C212C]/92 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 backdrop-blur-3xl';
const pop = { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 26, transition: { duration: 0.14 } }, transition: { type: 'spring' as const, stiffness: 400, damping: 34 } };

/** VoronovOS (Windows-like) taskbar for PC tiers 0–2. */
export default function Taskbar() {
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, !!panel, () => setPanel(null));
  const toggle = (p: Exclude<Panel, null>) => {
    audio.sfx('ui_click');
    setPanel((cur) => (cur === p ? null : p));
  };
  const close = () => setPanel(null);
  return (
    // Narrow monitors: left-aligned icons (Win11 option) so the HUD never overlaps them; wide: centred.
    <div ref={ref} className="@container relative z-[300] h-12 shrink-0 border-t border-white/[.08] px-1.5">
      {/* Blur lives on its own layer: a blurred ancestor would stop the flyouts from blurring the desktop. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#151A25]/80 backdrop-blur-2xl backdrop-saturate-150" />
      <div className="flex h-full items-center gap-1.5 @6xl:grid @6xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="order-2 flex min-w-0 flex-1 items-center gap-1 overflow-hidden @6xl:order-1">
        <span className="order-last @6xl:order-first">
          <Weather />
        </span>
        <Vitals skin="win" />
        <ClipboardChip skin="win" />
        <CpuMeter />
      </div>
      <div className="order-1 flex shrink-0 items-center gap-0.5 @6xl:order-2">
        <TbBtn active={panel === 'start'} title="Пуск" onClick={() => toggle('start')}>
          <VLogo size={22} />
        </TbBtn>
        <TbBtn active={panel === 'search'} title="Поиск" onClick={() => toggle('search')}>
          <Search size={18} className="text-white/85" />
        </TbBtn>
        {APP_IDS.map((id) => (
          <AppButton key={id} id={id} />
        ))}
      </div>
      <div className="order-3 flex shrink-0 items-center justify-end gap-1 @6xl:min-w-0">
        <SpeedControls skin="win" />
        <TrayButton active={panel === 'quick'} onClick={() => toggle('quick')} />
        <ClockButton active={panel === 'calendar'} onClick={() => toggle('calendar')} />
      </div>
      </div>
      <AnimatePresence>
        {(panel === 'start' || panel === 'search') && <StartMenu key="start" search={panel === 'search'} close={close} />}
        {panel === 'quick' && <QuickSettings key="quick" close={close} />}
        {panel === 'calendar' && <Calendar key="cal" />}
      </AnimatePresence>
    </div>
  );
}

function TbBtn({ active, title, onClick, children }: { active: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} className={cn('group flex h-10 w-10 items-center justify-center rounded-md transition-colors', active ? 'bg-white/[.13]' : 'hover:bg-white/[.08]')}>
      <span className="transition-transform duration-150 group-active:scale-[.85]">{children}</span>
    </button>
  );
}

function AppButton({ id }: { id: PcAppId }) {
  // 0 closed · 1 minimised · 2 open in background · 3 focused
  const st = useGame((s) => {
    const w = s.ui.windows[id];
    return w.open ? (w.minimized ? 1 : topWindow(s) === id ? 3 : 2) : 0;
  });
  const meta = useAppMeta()(id);
  const ref = useMemo(() => iconRef(id), [id]);
  const click = () => {
    const g = useGame.getState();
    if (st === 0) g.openWindow(id);
    else if (st === 3) g.minimizeWindow(id);
    else g.focusWindow(id);
  };
  return (
    <button ref={ref} title={meta.title} onClick={click} className={cn('group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors', st === 3 ? 'bg-white/[.12]' : 'hover:bg-white/[.08]')}>
      <span className="transition-transform duration-150 group-active:scale-[.85]">
        <AppIcon id={id} skin="win" size={24} />
      </span>
      {st > 0 && <span className={cn('absolute bottom-[3px] h-[3px] rounded-full transition-all duration-300', st === 3 ? 'w-4 bg-sky-300' : 'w-1.5 bg-white/50')} />}
    </button>
  );
}

function Weather() {
  const day = useGame((s) => Math.floor(s.now / 1440));
  const h = useGame((s) => hourOf(s.now));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const month = gameDate(day * 1440).getUTCMonth();
  const r = rng(day * 7 + (moscow ? 3 : 0))();
  const kind = r < 0.45 ? 'rain' : r < 0.75 ? 'cloud' : 'clear';
  const t = Math.round([-9, -7, -2, 6, 13, 18, 21, 19, 13, 6, -1, -6][month] + (r - 0.5) * 6 + (h > 11 && h < 18 ? 3 : -1));
  const night = h < 6 || h >= 21;
  return (
    <div title="Погода" className="flex h-10 shrink-0 items-center gap-2 rounded-md px-2 hover:bg-white/[.06]">
      <span className={kind === 'clear' ? (night ? 'text-indigo-200' : 'text-amber-300') : 'text-sky-200'}>{kind === 'rain' ? <CloudRain size={20} /> : kind === 'cloud' ? <Cloud size={20} /> : night ? <Moon size={20} /> : <Sun size={20} />}</span>
      <div className="leading-tight">
        <div className="text-[12px] font-semibold num">
          {t > 0 ? '+' : ''}
          {t}°
        </div>
        <div className="text-[10px] whitespace-nowrap text-white/45 @max-6xl:hidden">
          {moscow ? 'Москва' : 'Новозаровск'} · {kind === 'rain' ? 'дождь' : kind === 'cloud' ? 'облачно' : 'ясно'}
        </div>
      </div>
    </div>
  );
}

function TrayButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const muted = useSettings((s) => s.muted || s.master === 0);
  const laptop = useGame((s) => s.hero.pcTier === 0);
  return (
    <button onClick={onClick} title="Сеть, звук и быстрые настройки" className={cn('flex h-10 shrink-0 items-center gap-2 rounded-md px-2 text-white/85 transition-colors', active ? 'bg-white/[.13]' : 'hover:bg-white/[.08]')}>
      <Wifi size={15} />
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      {laptop && <BatteryMedium size={17} />}
    </button>
  );
}

function ClockButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const now = useGame((s) => Math.floor(s.now));
  const h = hourOf(now);
  return (
    <button onClick={onClick} className={cn('flex h-10 shrink-0 items-center gap-2 rounded-md px-2 text-right transition-colors', active ? 'bg-white/[.13]' : 'hover:bg-white/[.08]')}>
      <ChapterBadge skin="win" />
      <span className="@max-4xl:hidden">{h < 6 || h >= 22 ? <Moon size={13} className="text-indigo-300" /> : <Sun size={13} className="text-amber-200" />}</span>
      <div className="leading-tight">
        <div className="text-xs font-semibold num">{clockStr(now)}</div>
        <div className="text-[10px] whitespace-nowrap text-white/50">{dateStr(now)}</div>
      </div>
    </button>
  );
}

function StartMenu({ search, close }: { search: boolean; close: () => void }) {
  const [q, setQ] = useState('');
  const [power, setPower] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cmds = useCommands('win');
  const files = useGame((s) => s.files);
  const difficulty = useGame((s) => s.difficulty);
  const hints = useGame((s) => s.ui.hints);
  const res = useResult();
  const g = useGame.getState;
  useEffect(() => {
    if (search) input.current?.focus();
  }, [search]);
  const results = q ? cmds.filter((c) => matchCmd(c, q)) : [];
  const run = (c: Cmd) => {
    const r = c.run();
    if (r) res.show(r, c.id === 'wait' ? 'Прошёл час' : undefined);
    if (!r) close();
  };
  const pinned = cmds.filter((c) => c.kind === 'app' || c.id === 'settings' || c.id === 'shop');
  const recent = files.slice(-4).reverse();
  return (
    <motion.div {...pop} className={cn(flyout, 'left-1/2 flex w-[580px] max-w-[calc(100%-16px)] -translate-x-1/2 flex-col')}>
      <div className="p-5 pb-3">
        <label className="flex h-9 items-center gap-2 rounded-full bg-black/35 px-3.5 ring-1 ring-white/10 focus-within:ring-sky-400/60">
          <Search size={15} className="text-white/50" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && results[0] && run(results[0])}
            placeholder="Поиск приложений, действий и настроек"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/35"
          />
        </label>
      </div>
      <div className="min-h-[290px] px-5">
        {q ? (
          <div className="space-y-0.5">
            <div className="mb-1.5 text-[12px] font-semibold text-white/60">Лучшее соответствие</div>
            {results.length ? (
              results.map((c, i) => (
                <button key={c.id} onClick={() => run(c)} className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-white/[.08]', i === 0 && 'bg-white/[.06]')}>
                  {c.icon}
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">{c.label}</div>
                    <div className="truncate text-[11px] text-white/45">{c.sub}</div>
                  </div>
                  <span className="ml-auto text-[10.5px] text-white/35">{c.kind === 'app' ? 'Приложение' : 'Действие'}</span>
                </button>
              ))
            ) : (
              <div className="rounded-lg bg-white/[.04] p-4 text-center text-[12px] text-white/45">Ничего не найдено по запросу «{q}»</div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold">Закреплённые</span>
              <span className="rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] text-white/50">VoronovOS</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {pinned.map((c) => (
                <button key={c.id} onClick={() => run(c)} title={c.sub} className="group flex flex-col items-center gap-1.5 rounded-md px-1 py-2.5 transition-colors hover:bg-white/[.07]">
                  <span className="transition-transform group-active:scale-90">
                    <AppIcon id={c.id as IconId} skin="win" size={32} />
                  </span>
                  <span className="line-clamp-2 text-center text-[11px] leading-tight text-white/85">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 mb-2 text-[13px] font-semibold">Рекомендуем</div>
            {recent.length ? (
              <div className="grid grid-cols-2 gap-1">
                {recent.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      g().openWindow('files');
                      close();
                    }}
                    className="flex min-w-0 items-center gap-2.5 rounded-md p-2 text-left hover:bg-white/[.07]"
                  >
                    <FileText size={22} className="shrink-0 text-rose-300" />
                    <div className="min-w-0">
                      <div className="truncate text-[12px]">{f.name}</div>
                      <div className="text-[10.5px] text-white/45">
                        {dateStr(f.at)}, {clockStr(f.at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white/[.04] p-3 text-[12px] text-white/45">Здесь появятся сохранённые чеки и документы.</div>
            )}
          </>
        )}
      </div>
      {res.node && <div className="px-5 pt-2">{res.node}</div>}
      <div className="mt-3 flex items-center gap-2 border-t border-white/[.07] bg-black/25 px-4 py-2.5">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-sm font-bold text-black shadow">А</span>
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold">Артём</div>
            <div className="text-[10.5px] text-white/45">{difficulty === 'story' ? 'сюжетный режим' : 'реалистичный режим'}</div>
          </div>
        </div>
        <button onClick={() => g().toggleHints()} className={cn('ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors', hints ? 'bg-sky-400/15 text-sky-200' : 'text-white/55 hover:bg-white/[.07]')}>
          <Lightbulb size={14} /> Подсказки: {hints ? 'вкл' : 'выкл'}
        </button>
        <div className="relative">
          <button onClick={() => setPower((p) => !p)} title="Завершение работы" className={cn('flex h-9 w-9 items-center justify-center rounded-md transition-colors', power ? 'bg-white/[.12]' : 'hover:bg-white/[.08]')}>
            <Power size={16} />
          </button>
          <AnimatePresence>
            {power && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute right-0 bottom-11 w-64 rounded-lg bg-[#272C38]/95 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                <PItem icon={<BedDouble size={15} />} sub="до 08:00 / вздремнуть днём" onClick={() => res.show(g().sleep())}>
                  Лечь спать
                </PItem>
                <PItem icon={<Timer size={15} />} onClick={() => res.show(g().skipHours(1), 'Прошёл час')}>
                  Подождать 1 час
                </PItem>
                <PItem
                  icon={<Settings size={15} />}
                  onClick={() => {
                    close();
                    openSettings();
                  }}
                >
                  Настройки
                </PItem>
                <div className="mx-2 my-1 h-px bg-white/10" />
                <PItem
                  icon={<LogOut size={15} />}
                  onClick={() => {
                    close();
                    g().quitToMenu();
                  }}
                >
                  Сохранить и выйти в меню
                </PItem>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function PItem({ icon, sub, onClick, children }: { icon: ReactNode; sub?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-white/90 hover:bg-white/10">
      <span className="text-white/60">{icon}</span>
      <span className="leading-tight">
        {children}
        {sub && <span className="block text-[10.5px] text-white/40">{sub}</span>}
      </span>
    </button>
  );
}

function QuickSettings({ close }: { close: () => void }) {
  const st = useSettings();
  const hints = useGame((s) => s.ui.hints);
  const quest = useGame((s) => s.ui.questOpen);
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const laptop = useGame((s) => s.hero.pcTier === 0);
  const [bt, setBt] = useState(false);
  const g = useGame.getState;
  const tiles: [ReactNode, string, boolean, () => void][] = [
    [<Wifi size={16} />, moscow ? 'MGTS_5G' : 'Novozarovsk_NET', true, () => {}],
    [<Bluetooth size={16} />, 'Bluetooth', bt, () => setBt((v) => !v)],
    [<BellOff size={16} />, 'Не беспокоить', st.dnd, () => st.set({ dnd: !st.dnd })],
    [<Lightbulb size={16} />, 'Подсказки', hints, () => g().toggleHints()],
    [<VolumeX size={16} />, 'Без звука', st.muted, () => st.set({ muted: !st.muted })],
    [<Target size={16} />, 'Цели главы', quest, () => g().toggleQuest()],
  ];
  return (
    <motion.div {...pop} className={cn(flyout, 'right-1.5 w-[350px]')}>
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 p-4">
        {tiles.map(([icon, label, on, fn]) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <button onClick={() => (audio.sfx('ui_toggle'), fn())} className={cn('flex h-12 w-full items-center justify-center rounded-md ring-1 transition-colors', on ? 'bg-sky-400 text-black ring-sky-300' : 'bg-white/[.07] text-white/85 ring-white/10 hover:bg-white/[.11]')}>
              {icon}
            </button>
            <span className="max-w-full truncate text-[11px] text-white/75">{label}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 px-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => st.set({ muted: !st.muted })} className="rounded-md p-1.5 text-white/80 hover:bg-white/10" title="Без звука">
            {st.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <Slider value={st.master} onChange={(v) => st.set({ master: v, muted: false })} disabled={st.muted} />
          <span className="w-8 text-right text-[11px] text-white/50 num">{Math.round(st.master * 100)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="p-1.5 text-white/80" title="Музыка">
            <Headphones size={16} />
          </span>
          <Slider value={st.music} onChange={(v) => st.set({ music: v })} />
          <span className="w-8 text-right text-[11px] text-white/50 num">{Math.round(st.music * 100)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/[.07] bg-black/25 px-4 py-2.5 text-[11.5px] text-white/60">
        {laptop ? (
          <>
            <BatteryMedium size={16} /> 64% · износ батареи 41%
          </>
        ) : (
          <span>Питание от сети</span>
        )}
        <button
          title="Все настройки"
          onClick={() => {
            close();
            openSettings('sound');
          }}
          className="ml-auto rounded-md p-1.5 hover:bg-white/10"
        >
          <Settings size={15} />
        </button>
      </div>
    </motion.div>
  );
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function Calendar() {
  const now = useGame((s) => Math.floor(s.now / 60) * 60);
  const chapter = useGame((s) => s.chapter);
  const d = gameDate(now);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const today = d.getUTCDate();
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const def = chapterDef(chapter);
  return (
    <motion.div {...pop} className={cn(flyout, 'right-1.5 w-[320px]')}>
      <div className="border-b border-white/[.07] p-4">
        <div className="text-[10px] font-bold tracking-[0.2em] text-amber-300/80 uppercase">Глава {chapter}</div>
        <div className="text-[14px] font-semibold">{def.title}</div>
        <div className="mt-0.5 text-[11.5px] text-white/50">{def.subtitle}</div>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold">
            {MONTHS[m]} {y}
          </span>
          <span className="text-[11px] text-white/45">{dateStr(now)}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => (
            <span key={w} className="pb-1 text-white/40">
              {w}
            </span>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => (
            <span key={i} className={cn('flex h-8 items-center justify-center rounded-full num', i + 1 === today ? 'bg-sky-400 font-bold text-black' : i + 1 < today ? 'text-white/40' : 'text-white/85')}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
