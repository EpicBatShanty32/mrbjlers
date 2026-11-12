import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clapperboard, CloudRain, Film, Gamepad2, Headphones, Keyboard, Lightbulb, Mic, Monitor, MousePointerClick, Play, RotateCcw, Sparkles, Target, Type, Volume2, VolumeX, X } from 'lucide-react';
import { useGame } from '../../game/store';
import { useSettings, type Settings } from '../../game/settings';
import { minuteOfDay } from '../../game/util';
import { audio, type VoiceHandle } from '../../audio';
import { cn } from '../common/kit';
import { WALLPAPERS, WallpaperView } from '../os/Wallpaper';
import { closeSettings, openSettings, SETTINGS_EVENT, useSettingsUi, type SettingsTab } from './store';
import { Row, Segmented, Slider, Toggle } from './controls';

export const HELP_ITEMS = [
  'Слева — компьютер Артёма: браузер с биржей Bybit, папка с чеками, калькулятор и блокнот. Окна можно двигать, сворачивать и разворачивать.',
  'Справа — телефон: банки, Telegram, Барахолка, кошелёк Tonkeeper, SMS и Authenticator.',
  'Покупка USDT: откройте сделку → «Скопировать номер» → телефон → банк → «Вставить из буфера» → сверьте ФИО → переведите → сохраните PDF-чек → прикрепите чек в ордере → «Я оплатил».',
  'Продажа: дождитесь оплаты → в банке «Обновить выписку» → проверьте сумму и ФИО → код из Authenticator → «Отпустить USDT». Не верьте чекам и SMS!',
  'Банки следят за транзитом, ночными операциями и отсутствием бытовых трат (115-ФЗ). Перевод от третьего лица — апелляция и возврат, иначе блокировка по 161-ФЗ.',
  'Время: пауза, 1x, 2x, 5x внизу справа. Во время сделок время замедляется. Сон — через «Пуск». Игра сохраняется автоматически.',
];

const TABS: [SettingsTab, string, ReactNode, string][] = [
  ['sound', 'Звук', <Volume2 size={14} />, 'from-[#FF6482] to-[#E0244A]'],
  ['scenes', 'Сцены', <Clapperboard size={14} />, 'from-[#BF8BFF] to-[#7A3CF0]'],
  ['screen', 'Экран', <Monitor size={14} />, 'from-[#5AB8FF] to-[#1A6FE8]'],
  ['game', 'Игра', <Gamepad2 size={14} />, 'from-[#4ADE94] to-[#14A35C]'],
];

/** Global settings modal: mounted once in App, opened via `openSettings()` from anywhere. */
export default function SettingsModal() {
  const open = useSettingsUi((s) => s.open);
  useEffect(() => {
    const h = (e: Event) => openSettings((e as CustomEvent<{ tab?: SettingsTab }>).detail?.tab);
    window.addEventListener(SETTINGS_EVENT, h);
    return () => window.removeEventListener(SETTINGS_EVENT, h);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      audio.sfx('ui_back');
      closeSettings();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open]);
  return <AnimatePresence>{open && <Panel key="settings" />}</AnimatePresence>;
}

function Panel() {
  const tab = useSettingsUi((s) => s.tab);
  const focus = useSettingsUi((s) => s.focus);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    if (!focus) return;
    const t = setTimeout(() => document.getElementById(`set-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
    return () => clearTimeout(t);
  }, [tab, focus]);
  const cur = TABS.find((t) => t[0] === tab)!;
  return (
    <motion.div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/55 backdrop-blur-[6px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && closeSettings()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="flex h-[min(640px,90vh)] w-[min(900px,94vw)] overflow-hidden rounded-[22px] bg-[#16171C]/92 text-white shadow-[0_50px_120px_-20px_rgba(0,0,0,.9),inset_0_.5px_0_rgba(255,255,255,.12)] ring-1 ring-white/10 backdrop-blur-3xl"
      >
        <aside className="flex w-[214px] shrink-0 flex-col gap-0.5 border-r border-white/[.07] bg-white/[.025] p-3">
          <div className="mb-4 px-2 pt-2">
            <div className="text-[18px] font-bold tracking-tight">Настройки</div>
            <div className="text-[11px] text-white/40">P2P: С НУЛЯ</div>
          </div>
          {TABS.map(([id, label, icon, grad]) => (
            <button
              key={id}
              onClick={() => {
                audio.sfx('ui_click');
                useSettingsUi.setState({ tab: id, focus: null });
              }}
              className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors', tab === id ? 'bg-white/[.12] text-white' : 'text-white/70 hover:bg-white/[.06]')}
            >
              <span className={cn('flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-gradient-to-b text-white shadow-[inset_0_.5px_0_rgba(255,255,255,.4)]', grad)}>{icon}</span>
              {label}
            </button>
          ))}
          <div className="mt-auto px-2 text-[10.5px] leading-snug text-white/30">Изменения сохраняются сразу и не влияют на сохранение игры.</div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[.07] px-6">
            <h2 className="text-[17px] font-semibold">{cur[1]}</h2>
            <button onClick={closeSettings} title="Закрыть (Esc)" className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </header>
          <div ref={scroller} className="scroll-thin min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {tab === 'sound' && <SoundTab />}
            {tab === 'scenes' && <ScenesTab />}
            {tab === 'screen' && <ScreenTab />}
            {tab === 'game' && <GameTab />}
          </div>
        </section>
      </motion.div>
    </motion.div>
  );
}

function Group({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4">
      <div className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{title}</div>
      <div className="divide-y divide-white/[.06] rounded-xl bg-white/[.045] ring-1 ring-white/[.06]">{children}</div>
    </div>
  );
}

type Vol = 'master' | 'music' | 'sfx' | 'ambience' | 'voice';
const VOLS: [Vol, string, ReactNode][] = [
  ['master', 'Общая громкость', <Volume2 size={16} />],
  ['music', 'Музыка', <Headphones size={16} />],
  ['sfx', 'Эффекты и интерфейс', <MousePointerClick size={16} />],
  ['ambience', 'Окружение', <CloudRain size={16} />],
  ['voice', 'Голоса', <Mic size={16} />],
];

function SoundTab() {
  const s = useSettings();
  const [voices, setVoices] = useState(() => audio.voices());
  const speaking = useRef<VoiceHandle | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setVoices(audio.voices()), 700);
    return () => {
      clearTimeout(t);
      speaking.current?.cancel();
    };
  }, []);
  const test = (key: string, speaker: string, text: string) => {
    speaking.current?.cancel();
    audio.unlock();
    setPlaying(key);
    speaking.current = audio.speak({ speaker, text, onEnd: () => setPlaying((p) => (p === key ? null : p)) });
  };
  const pick = (k: 'voiceMale' | 'voiceFemale', not: 'male' | 'female') => (
    <select value={s[k]} onChange={(e) => s.set({ [k]: e.target.value } as Partial<Settings>)} disabled={!voices.length} className="max-w-[230px] rounded-lg bg-black/35 px-2.5 py-1.5 text-[12px] text-white ring-1 ring-white/10 outline-none disabled:opacity-50">
      <option value="" className="bg-[#1D1F26]">
        Автоматически
      </option>
      {voices
        .filter((v) => v.gender !== not)
        .map((v) => (
          <option key={v.name} value={v.name} className="bg-[#1D1F26]">
            {v.name}
          </option>
        ))}
    </select>
  );
  const btn = (key: string, label: string, onClick: () => void) => (
    <button onClick={onClick} className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] ring-1 transition-colors', playing === key ? 'bg-emerald-400/20 text-emerald-200 ring-emerald-300/30' : 'bg-white/[.07] text-white/85 ring-white/10 hover:bg-white/[.12]')}>
      <Play size={12} /> {playing === key ? 'Звучит…' : label}
    </button>
  );
  return (
    <>
      <Group title="Громкость">
        {VOLS.map(([k, label, icon]) => (
          <Row key={k} icon={icon} label={label}>
            <div className="flex w-[280px] items-center gap-3">
              <Slider value={s[k]} onChange={(v) => s.set({ [k]: v } as Partial<Settings>)} disabled={s.muted} />
              <span className="w-10 text-right text-[12px] text-white/50 num">{Math.round(s[k] * 100)}%</span>
            </div>
          </Row>
        ))}
        <Row icon={<VolumeX size={16} />} label="Выключить весь звук">
          <Toggle on={s.muted} onChange={(v) => s.set({ muted: v })} />
        </Row>
      </Group>
      <Group title="Озвучка">
        <Row icon={<Mic size={16} />} label="Озвучивать сцены и голосовые" sub="Синтез речи браузера: реплики в катсценах и голосовые сообщения в Telegram">
          <Toggle on={s.voiceOver} onChange={(v) => s.set({ voiceOver: v })} />
        </Row>
        <Row label="Мужской голос" sub="Артём, Саня и другие">
          {pick('voiceMale', 'female')}
          {btn('m', 'Тест', () => test('m', 'sanya', 'Слушай, есть тема. Покупаешь дешевле, продаёшь дороже.'))}
        </Row>
        <Row label="Женский голос">
          {pick('voiceFemale', 'male')}
          {btn('f', 'Тест', () => test('f', 'lera', 'Артём, ты опять всю ночь за компьютером?'))}
        </Row>
        <Row label="Рассказчик" sub={voices.length ? `Доступно голосов: ${voices.length}` : 'Русские голоса не найдены — голос будет выбран автоматически'}>
          {btn('n', 'Проверить голос', () => test('n', 'narrator', 'Новозаровск. Три тысячи семьсот рублей на карте и старый компьютер.'))}
        </Row>
      </Group>
    </>
  );
}

function ScenesTab() {
  const s = useSettings();
  return (
    <>
      <Group title="Текст">
        <Row icon={<Type size={16} />} label="Скорость текста" sub="Как быстро печатаются реплики">
          <Segmented
            value={s.textSpeed}
            options={[
              ['slow', 'Медленно'],
              ['normal', 'Обычно'],
              ['fast', 'Быстро'],
              ['instant', 'Сразу'],
            ]}
            onChange={(v) => s.set({ textSpeed: v })}
          />
        </Row>
        <Row icon={<Sparkles size={16} />} label="Автопродолжение" sub="Сцена листается сама, когда реплика прочитана или озвучена">
          <Toggle on={s.autoAdvance} onChange={(v) => s.set({ autoAdvance: v })} />
        </Row>
      </Group>
      <Group title="Изображение">
        <Row icon={<Film size={16} />} label="Плёночное зерно" sub="Кинематографичный шум в сценах и главном меню">
          <Toggle on={s.filmGrain} onChange={(v) => s.set({ filmGrain: v })} />
        </Row>
      </Group>
    </>
  );
}

function ScreenTab() {
  const s = useSettings();
  const hour = useGame((st) => (st.started && !st.menu ? Math.floor(minuteOfDay(st.now) / 30) / 2 : 21));
  const moscow = useGame((st) => st.started && !st.menu && st.hero.location === 'moscow');
  const groups: [string, string[]][] = [
    ['Динамические', ['dynamic']],
    ['Коллекция VoronovOS', WALLPAPERS.filter((w) => w.group === 'win').map((w) => w.id)],
    ['Коллекция macOS', WALLPAPERS.filter((w) => w.group === 'mac').map((w) => w.id)],
  ];
  return (
    <>
      <Group title="Анимации">
        <Row icon={<Sparkles size={16} />} label="Меньше движения" sub="Отключает параллакс, дождь и большинство анимаций">
          <Toggle on={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
        </Row>
        <Row icon={<Monitor size={16} />} label="Загрузка компьютера" sub="Показывать запуск VoronovOS / macOS при входе в игру">
          <Toggle on={s.bootIntro} onChange={(v) => s.set({ bootIntro: v })} />
        </Row>
      </Group>
      <div id="set-wallpaper" className="scroll-mt-4 space-y-4">
        <div className="px-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase">Обои рабочего стола</div>
        {groups.map(([title, ids]) => (
          <div key={title}>
            <div className="mb-2 px-1 text-[12px] text-white/60">{title}</div>
            <div className="grid grid-cols-3 gap-3">
              {ids.map((id) => {
                const w = WALLPAPERS.find((x) => x.id === id)!;
                const on = s.pcWallpaper === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      audio.sfx('ui_select');
                      s.set({ pcWallpaper: id });
                    }}
                    className="group text-left"
                  >
                    <div className={cn('relative aspect-[16/10] overflow-hidden rounded-lg ring-2 transition', on ? 'ring-[#0A84FF]' : 'ring-white/10 group-hover:ring-white/30')}>
                      <WallpaperView id={id} hour={hour} moscow={moscow} label={false} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]" />
                    </div>
                    <div className={cn('mt-1.5 text-[12px]', on ? 'font-semibold text-white' : 'text-white/60')}>
                      {w.name}
                      {id === 'dynamic' && <span className="block text-[10.5px] font-normal text-white/40">меняется со временем суток</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function GameTab() {
  const s = useSettings();
  const inGame = useGame((st) => st.started && !st.menu);
  const hints = useGame((st) => st.ui.hints);
  const quest = useGame((st) => st.ui.questOpen);
  const g = useGame.getState;
  return (
    <>
      <Group title="Подсказки">
        <Row icon={<Lightbulb size={16} />} label="Подсказки в панели целей" sub={inGame ? 'Что делать дальше — прямо над панелью задач' : 'Доступно во время игры'}>
          <Toggle on={inGame && hints} disabled={!inGame} onChange={() => g().toggleHints()} />
        </Row>
        <Row icon={<Target size={16} />} label="Список целей главы открыт" sub={inGame ? undefined : 'Доступно во время игры'}>
          <Toggle on={inGame && quest} disabled={!inGame} onChange={() => g().toggleQuest()} />
        </Row>
      </Group>
      <Group title="Как играть">
        <ul className="list-disc space-y-1.5 py-3 pr-4 pl-8 text-[12.5px] leading-relaxed text-white/75">
          {HELP_ITEMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Group>
      <Group title="Управление">
        {[
          ['Ctrl / ⌘ + Пробел', 'Spotlight на Mac: запуск программ и действий'],
          ['Правый клик по рабочему столу', 'Обои, упорядочить значки, обновить'],
          ['Двойной клик по заголовку окна', 'Развернуть / вернуть размер'],
          ['Esc', 'Закрыть меню и настройки'],
        ].map(([k, v]) => (
          <Row key={k} icon={<Keyboard size={16} />} label={v}>
            <span className="rounded-md bg-black/35 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10">{k}</span>
          </Row>
        ))}
      </Group>
      <Group title="Сброс">
        <Row icon={<RotateCcw size={16} />} label="Вернуть настройки по умолчанию" sub="Сохранение игры не затрагивается">
          <button onClick={() => (audio.sfx('ui_click'), s.reset())} className="rounded-lg bg-white/[.07] px-3 py-1.5 text-[12px] ring-1 ring-white/10 hover:bg-white/[.12]">
            Сбросить
          </button>
        </Row>
      </Group>
    </>
  );
}
