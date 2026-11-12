import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Antenna, BatteryFull, Bell, Bluetooth, Briefcase, Check, ChevronLeft, ChevronRight, Hand, Hourglass, Image, Info, Link, Moon, Plane, Search, Settings as Gear, Sun, Volume1, Volume2, Wifi } from 'lucide-react';
import { audio } from '../../../audio';
import { useGame } from '../../../game/store';
import { useSettings, type Settings } from '../../../game/settings';
import { clamp, clockStr, shortDT } from '../../../game/util';
import { cn } from '../../common/kit';
import { IconArt } from './icons';
import { Slider, Tile, Toggle } from './kit';
import { DEVICES, useBattery, useOS, useTier } from './state';
import { WALLPAPERS, Wallpaper } from './wallpapers';

type Page = 'root' | 'wallpaper' | 'sounds' | 'display' | 'focus' | 'battery' | 'about';
const TITLES: Record<Page, string> = { root: 'Настройки', wallpaper: 'Обои', sounds: 'Звуки', display: 'Экран и яркость', focus: 'Фокусирование', battery: 'Аккумулятор', about: 'Об устройстве' };
const spring = { type: 'spring', stiffness: 380, damping: 38 } as const;
const setS = (p: Partial<Settings>) => useSettings.getState().set(p);

export default function SettingsApp() {
  const [page, setPage] = useState<Page>('root');
  return (
    <div className="ios relative h-full w-full overflow-hidden bg-black text-white">
      <AnimatePresence initial={false}>
        {page === 'root' ? (
          <motion.div key="root" className="absolute inset-0 z-0" initial={{ x: '-30%' }} animate={{ x: 0 }} exit={{ x: '-30%' }} transition={spring}>
            <Root go={setPage} />
          </motion.div>
        ) : (
          <motion.div key={page} className="absolute inset-0 z-10 bg-black shadow-[-12px_0_30px_rgba(0,0,0,.6)]" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
            <div className="flex h-full flex-col">
              <div className="relative flex h-12 shrink-0 items-center justify-center">
                <button type="button" onClick={() => setPage('root')} className="lg-btn absolute left-3 flex h-9 w-9 items-center justify-center rounded-full" title="Назад">
                  <ChevronLeft size={22} strokeWidth={2.6} />
                </button>
                <div className="max-w-[62%] truncate text-[16px] font-semibold">{TITLES[page]}</div>
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-10">
                {page === 'wallpaper' && <Wallpapers />}
                {page === 'sounds' && <Sounds />}
                {page === 'display' && <Display />}
                {page === 'focus' && <Focus />}
                {page === 'battery' && <Battery />}
                {page === 'about' && <About />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, foot, children }: { title?: string; foot?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-6">
      {title && <div className="mb-1.5 px-4 text-[13px] text-white/50 uppercase">{title}</div>}
      <div className="overflow-hidden rounded-[22px] bg-[#1C1C1E]">{children}</div>
      {foot && <div className="mt-1.5 px-4 text-[12.5px] leading-snug text-white/45">{foot}</div>}
    </div>
  );
}

function Row({ icon, title, sub, value, right, chevron, check, onClick, big }: { icon?: ReactNode; title: ReactNode; sub?: string; value?: string; right?: ReactNode; chevron?: boolean; check?: boolean; onClick?: () => void; big?: boolean }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('os-row relative flex items-center gap-3 px-4', big ? 'py-3' : 'min-h-[46px] py-2', onClick && 'cursor-pointer active:bg-white/10')}
      style={{ '--sep': icon ? (big ? '82px' : '57px') : '16px' } as CSSProperties}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate', big ? 'text-[19px] font-semibold' : 'text-[15.5px]')}>{title}</div>
        {sub && <div className="truncate text-[12.5px] text-white/50">{sub}</div>}
      </div>
      {value && <span className="max-w-[48%] truncate text-[15px] text-white/50">{value}</span>}
      {right}
      {check && <Check size={18} className="text-[#0A84FF]" strokeWidth={2.8} />}
      {chevron && <ChevronRight size={18} className="-mr-1 text-white/30" strokeWidth={2.6} />}
    </div>
  );
}

function Root({ go }: { go: (p: Page) => void }) {
  const dev = DEVICES[useTier()];
  const air = useOS((s) => s.air), wifi = useOS((s) => s.wifi), bt = useOS((s) => s.bt);
  const dnd = useSettings((s) => s.dnd);
  const battery = useBattery();
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const set = useOS.getState().set;
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10">
      <div className="pt-2 pb-2 text-[31px] font-bold tracking-tight">Настройки</div>
      <div className="mb-5 flex items-center gap-2 rounded-[12px] bg-[#1C1C1E] px-2.5 py-[7px] text-[15px] text-white/40">
        <Search size={16} /> Поиск
      </div>
      <Group>
        <Row big chevron icon={<span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-[#7d8bff] to-[#2b3bd6] text-[20px] font-semibold">АВ</span>} title="Артём Воронов" sub="Аккаунт Apple, iCloud+ и другое" />
      </Group>
      <Group>
        <Row icon={<Tile bg="#FF9F0A"><Plane size={17} fill="#fff" strokeWidth={0} /></Tile>} title="Авиарежим" right={<Toggle on={air} onChange={(v) => set({ air: v })} />} />
        <Row icon={<Tile bg="#0A84FF"><Wifi size={17} strokeWidth={2.4} /></Tile>} title="Wi‑Fi" value={wifi ? (moscow ? 'Pokrovka_5G' : 'Novozarovsk_Free') : 'Выкл.'} onClick={() => set({ wifi: !wifi })} chevron />
        <Row icon={<Tile bg="#0A84FF"><Bluetooth size={17} strokeWidth={2.4} /></Tile>} title="Bluetooth" value={bt ? 'Вкл.' : 'Выкл.'} onClick={() => set({ bt: !bt })} chevron />
        <Row icon={<Tile bg="#30D158"><Antenna size={17} /></Tile>} title="Сотовая связь" value={dev.cell} chevron />
        <Row icon={<Tile bg="#30D158"><Link size={16} /></Tile>} title="Режим модема" value="Выкл." chevron />
      </Group>
      <Group>
        <Row icon={<Tile bg="#FF3B30"><Bell size={16} fill="#fff" /></Tile>} title="Уведомления" onClick={() => go('focus')} chevron />
        <Row icon={<Tile bg="#FF2D55"><Volume2 size={17} fill="#fff" /></Tile>} title="Звуки, тактильные сигналы" onClick={() => go('sounds')} chevron />
        <Row icon={<Tile bg="#5E5CE6"><Moon size={16} fill="#fff" strokeWidth={0} /></Tile>} title="Фокусирование" value={dnd ? 'Не беспокоить' : undefined} onClick={() => go('focus')} chevron />
        <Row icon={<Tile bg="#5E5CE6"><Hourglass size={16} /></Tile>} title="Экранное время" chevron />
      </Group>
      <Group>
        <Row icon={<Tile bg="#8E8E93"><Gear size={17} /></Tile>} title="Основные" onClick={() => go('about')} chevron />
        <Row icon={<Tile bg="#0A84FF"><Sun size={17} /></Tile>} title="Экран и яркость" onClick={() => go('display')} chevron />
        <Row icon={<Tile bg="#32ADE6"><Image size={16} /></Tile>} title="Обои" onClick={() => go('wallpaper')} chevron />
        <Row icon={<Tile bg="#30D158"><BatteryFull size={17} /></Tile>} title="Аккумулятор" value={`${battery}%`} onClick={() => go('battery')} chevron />
        <Row icon={<Tile bg="#0A84FF"><Hand size={16} /></Tile>} title="Конфиденциальность" chevron />
      </Group>
      <Group>
        <Row icon={<Tile bg="#8E8E93"><Info size={17} /></Tile>} title="Об устройстве" value={dev.model} onClick={() => go('about')} chevron />
      </Group>
    </div>
  );
}

function MiniPhone({ id, kind, now }: { id: string; kind: 'lock' | 'home'; now: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-[9/19.5] w-[118px] overflow-hidden rounded-[20px] ring-[3px] ring-[#2c2c2e]">
        <Wallpaper id={id} />
        {kind === 'lock' ? (
          <div className="ios-round os-clock absolute inset-x-0 top-[13%] text-center text-[30px] leading-none font-semibold">{clockStr(now)}</div>
        ) : (
          <>
            <div className="absolute inset-x-[9%] top-[14%] grid grid-cols-4 gap-[7px]">
              {['sber', 'tbank', 'alfa', 'avito', 'wallet', 'auth'].map((a) => (
                <span key={a} className="aspect-square overflow-hidden rounded-[5px]"><IconArt id={a} /></span>
              ))}
            </div>
            <div className="lg absolute inset-x-[5%] bottom-[3%] flex justify-around rounded-[12px] p-[5px]">
              {['telegram', 'auth', 'music', 'settings'].map((a) => (
                <span key={a} className="h-[18px] w-[18px] overflow-hidden rounded-[5px]"><IconArt id={a} /></span>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="text-[12px] text-white/60">{kind === 'lock' ? 'Экран блокировки' : 'Экран «Домой»'}</span>
    </div>
  );
}

function Wallpapers() {
  const cur = useSettings((s) => s.phoneWallpaper);
  const now = useGame((s) => Math.floor(s.now));
  return (
    <>
      <div className="mb-6 flex justify-center gap-5">
        <MiniPhone id={cur} kind="lock" now={now} />
        <MiniPhone id={cur} kind="home" now={now} />
      </div>
      <div className="mb-2 px-1 text-[13px] text-white/50 uppercase">Коллекция</div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        {WALLPAPERS.map((w) => (
          <button key={w.id} type="button" onClick={() => setS({ phoneWallpaper: w.id })} className="flex flex-col items-center gap-1.5">
            <div className={cn('relative aspect-[9/19.5] w-full overflow-hidden rounded-[14px] ring-[2.5px] ring-offset-2 ring-offset-black transition', cur === w.id ? 'ring-[#0A84FF]' : 'ring-transparent')}>
              <Wallpaper id={w.id} />
              <div className="ios-round absolute inset-x-0 top-[12%] text-center text-[17px] font-semibold text-white/90" style={{ textShadow: '0 1px 6px rgba(0,0,0,.35)' }}>{clockStr(now)}</div>
              {cur === w.id && (
                <span className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0A84FF]"><Check size={13} strokeWidth={3} /></span>
              )}
            </div>
            <span className="w-full truncate text-center text-[11.5px] text-white/70">{w.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const VOLS: [keyof Settings, string][] = [['master', 'Общая'], ['music', 'Музыка'], ['sfx', 'Эффекты'], ['ambience', 'Окружение'], ['voice', 'Голоса']];

function Sounds() {
  const st = useSettings();
  const voices = useMemo(() => audio.voices(), []);
  return (
    <>
      <Group title="Громкость">
        {VOLS.map(([k, label]) => (
          <div key={k} className="os-row relative px-4 pt-2.5 pb-1.5" style={{ '--sep': '16px' } as CSSProperties}>
            <div className="text-[13px] text-white/55">{label}</div>
            <Slider value={st[k] as number} onChange={(v) => setS({ [k]: v, ...(k === 'master' ? { muted: false } : {}) })} left={<Volume1 size={15} className="text-white/50" />} right={<Volume2 size={17} className="text-white/70" />} />
          </div>
        ))}
      </Group>
      <Group>
        <Row title="Без звука" right={<Toggle on={st.muted} onChange={(v) => setS({ muted: v })} />} />
      </Group>
      <Group title="Озвучка" foot="Реплики катсцен и голосовые сообщения в Telegram читает синтезатор речи системы.">
        <Row title="Озвучивать реплики" right={<Toggle on={st.voiceOver} onChange={(v) => setS({ voiceOver: v })} />} />
      </Group>
      <VoicePick title="Мужской голос" speaker="marat" list={voices.filter((v) => v.gender !== 'female')} value={st.voiceMale} onPick={(n) => setS({ voiceMale: n })} />
      <VoicePick title="Женский голос" speaker="lera" list={voices.filter((v) => v.gender !== 'male')} value={st.voiceFemale} onPick={(n) => setS({ voiceFemale: n })} />
    </>
  );
}

function VoicePick({ title, speaker, list, value, onPick }: { title: string; speaker: string; list: { name: string }[]; value: string; onPick: (n: string) => void }) {
  const pick = (n: string) => {
    onPick(n);
    audio.speak({ speaker, text: 'Привет! Так звучит мой голос.' });
  };
  return (
    <Group title={title} foot={list.length ? undefined : 'Русские голоса синтезатора речи в системе не найдены — используется голос по умолчанию.'}>
      <Row title="Автоматически" check={!value} onClick={() => pick('')} />
      {list.slice(0, 8).map((v) => (
        <Row key={v.name} title={v.name} check={value === v.name} onClick={() => pick(v.name)} />
      ))}
    </Group>
  );
}

function Display() {
  const b = useSettings((s) => s.phoneBrightness);
  const reduce = useSettings((s) => s.reduceMotion);
  const tier = useTier();
  const aodOn = useOS((s) => s.aodOn);
  return (
    <>
      <Group title="Яркость">
        <div className="px-4 py-3">
          <Slider value={b} min={0.35} max={1} onChange={(v) => setS({ phoneBrightness: v })} left={<Sun size={14} className="text-white/55" />} right={<Sun size={21} />} />
        </div>
      </Group>
      <Group title="Оформление">
        <Row title="Тёмное" check />
        <Row title="Автоблокировка" value="2,5 мин" />
        {tier === 2 && <Row title="Всегда включённый экран" right={<Toggle on={aodOn} onChange={(v) => useOS.getState().set({ aodOn: v })} />} />}
      </Group>
      <Group foot="Отключает пружинные анимации, масштабирование приложений и анимированные обои.">
        <Row title="Уменьшение движения" right={<Toggle on={reduce} onChange={(v) => setS({ reduceMotion: v })} />} />
      </Group>
    </>
  );
}

function Focus() {
  const dnd = useSettings((s) => s.dnd);
  return (
    <>
      <Group foot="Баннеры и звуки уведомлений отключены. Уведомления всё равно приходят — они ждут в Центре уведомлений и на экране блокировки.">
        <Row icon={<Tile bg="#5E5CE6"><Moon size={16} fill="#fff" strokeWidth={0} /></Tile>} title="Не беспокоить" right={<Toggle on={dnd} onChange={(v) => setS({ dnd: v })} tint="#5E5CE6" />} />
      </Group>
      <Group>
        <Row icon={<Tile bg="#30D158"><Briefcase size={16} /></Tile>} title="Работа" value="Скоро" />
      </Group>
    </>
  );
}

function Battery() {
  const tier = useTier();
  const dev = DEVICES[tier];
  const b = useBattery();
  const low = useOS((s) => s.lowPower);
  const sleep = useGame((s) => s.hero.lastSleepAt);
  const now = useGame((s) => Math.floor(s.now / 60) * 60);
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const t = now - (23 - i) * 60;
    return t < sleep ? 100 : clamp(100 - (t - sleep) / dev.drain, 7, 100);
  }), [now, sleep, dev.drain]);
  return (
    <>
      <Group>
        <div className="px-4 py-4">
          <div className="text-[13px] text-white/50">Уровень заряда</div>
          <div className="num text-[34px] leading-tight font-semibold">{b}%</div>
          <div className="text-[13px] text-white/50">Последняя зарядка: {shortDT(sleep)}</div>
          <div className="mt-3 flex h-[70px] items-end gap-[3px]">
            {bars.map((v, i) => (
              <span key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${v}%`, background: low ? '#FFD60A' : v <= 20 ? '#FF453A' : '#30D158', opacity: i === 23 ? 1 : 0.75 }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-white/35"><span>24 ч назад</span><span>сейчас</span></div>
        </div>
      </Group>
      <Group foot="Снижает фоновую активность. Значок аккумулятора станет жёлтым.">
        <Row title="Режим энергосбережения" right={<Toggle on={low} onChange={(v) => useOS.getState().set({ lowPower: v })} />} />
      </Group>
      <Group foot={tier === 0 ? 'Ёмкость аккумулятора значительно снижена: телефон разряжается быстрее. Рекомендуется замена.' : undefined}>
        <Row title="Состояние аккумулятора" value={tier === 0 ? 'Обслуживание' : 'Нормальное'} />
        <Row title="Максимальная ёмкость" value={`${dev.health}%`} />
        <Row title="Циклы перезарядки" value={String([812, 46, 3][tier])} />
      </Group>
    </>
  );
}

const STORAGE: [string, number, string][] = [['Приложения', 0.36, '#0A84FF'], ['Фото', 0.27, '#FF9F0A'], ['iOS', 0.17, '#8E8E93'], ['Система', 0.2, '#BF5AF2']];

function About() {
  const tier = useTier();
  const dev = DEVICES[tier];
  const gb = (n: number) => `${n.toFixed(1).replace('.', ',')} ГБ`;
  return (
    <>
      <Group>
        <Row title="Имя" value="iPhone (Артём)" chevron />
        <Row title="Версия iOS" value={`iOS ${dev.ios}`} chevron />
        <Row title="Название модели" value={dev.model} />
        <Row title="Номер модели" value={dev.modelNo} />
        <Row title="Серийный номер" value={dev.serial} />
      </Group>
      <Group>
        <Row title="Чип" value={dev.chip} />
        <Row title="Дисплей" sub={dev.display} />
        <Row title="Цвет" value={dev.color} />
        <Row title="Аккумулятор" value={`${dev.health}%`} />
        {tier === 0 && <Row title="Состояние" value="Б/у, трещина на экране" />}
      </Group>
      <Group title="Хранилище">
        <div className="px-4 py-3">
          <div className="flex justify-between text-[14px]">
            <span>{dev.model}</span>
            <span className="text-white/50">Занято {gb(dev.used)} из {dev.storage} ГБ</span>
          </div>
          <div className="mt-2 flex h-[11px] overflow-hidden rounded-full bg-white/10">
            {STORAGE.map(([n, k, c]) => <span key={n} style={{ width: `${(dev.used / dev.storage) * k * 100}%`, background: c }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-white/60">
            {STORAGE.map(([n, , c]) => (
              <span key={n} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{n}</span>
            ))}
          </div>
        </div>
        <Row title="Доступно" value={gb(dev.storage - dev.used)} />
      </Group>
    </>
  );
}
