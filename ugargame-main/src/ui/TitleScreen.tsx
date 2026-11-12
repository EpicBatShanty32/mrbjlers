import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronRight, Headphones, ShieldCheck, Swords, X } from 'lucide-react';
import { SAVE_KEY, useGame } from '../game/store';
import type { Difficulty } from '../game/types';
import { useSettings } from '../game/settings';
import { chapterDef } from '../game/story/chapters';
import { dateStr } from '../game/util';
import { audio } from '../audio';
import { cn } from './common/kit';
import { openSettings, useSettingsUi } from './settings/store';
import { HELP_ITEMS } from './settings/SettingsModal';
import { CityLayer, genCity, rng } from './os/skyline';

// The «press any key» splash is shown once per page load (it is also the audio-unlock gesture).
let splashDone = false;

export default function TitleScreen() {
  const [phase, setPhase] = useState<'splash' | 'menu'>(splashDone ? 'menu' : 'splash');
  const [flash, setFlash] = useState(0);
  const grain = useSettings((s) => s.filmGrain);
  useEffect(() => {
    if (phase !== 'splash') return;
    const go = (e: Event) => {
      if (splashDone || (e instanceof KeyboardEvent && e.repeat)) return;
      splashDone = true;
      audio.unlock();
      audio.sfx('title_hit');
      setFlash((n) => n + 1);
      setPhase('menu');
    };
    window.addEventListener('keydown', go);
    window.addEventListener('pointerdown', go);
    return () => {
      window.removeEventListener('keydown', go);
      window.removeEventListener('pointerdown', go);
    };
  }, [phase]);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      <Backdrop dim={phase === 'splash'} />
      <AnimatePresence mode="wait">{phase === 'splash' ? <Splash key="splash" /> : <Menu key="menu" />}</AnimatePresence>
      {flash > 0 && <motion.div key={flash} className="pointer-events-none absolute inset-0 z-50 bg-white mix-blend-overlay" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />}
      {grain && <div className="grain pointer-events-none absolute -inset-[60%] z-40 opacity-[.07]" />}
      <div className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.78))]" />
    </div>
  );
}

// ───────── cinematic background: rainy Новозаровск at night ─────────

function Backdrop({ dim }: { dim: boolean }) {
  const reduce = useSettings((s) => s.reduceMotion);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 30, damping: 16 });
  const sy = useSpring(my, { stiffness: 30, damping: 16 });
  useEffect(() => {
    if (reduce) return;
    const h = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', h);
    return () => window.removeEventListener('pointermove', h);
  }, [reduce, mx, my]);
  const far = useMemo(() => genCity(101, 'novo', 0), []);
  const mid = useMemo(() => genCity(202, 'novo', 1), []);
  const near = useMemo(() => genCity(303, 'novo', 2), []);
  const p = (k: number) => [useTransform(sx, (v) => v * -k), useTransform(sy, (v) => v * -k * 0.45)] as const;
  const [x0, y0] = p(8);
  const [x1, y1] = p(16);
  const [x2, y2] = p(30);
  const [x3, y3] = p(52);
  return (
    <motion.div className="absolute inset-0" animate={{ opacity: dim ? 0.5 : 1 }} transition={{ duration: 1.4 }}>
      <div className={cn('absolute inset-0', !reduce && 'cam-drift')}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#04050b_0%,#0a0f22_34%,#171936_58%,#33223f_76%,#552c34_100%)]" />
        <div className="absolute inset-x-0 bottom-[14%] h-[46%] bg-[radial-gradient(55%_75%_at_50%_100%,rgba(255,138,64,.32),transparent_70%)]" />
        <div className="absolute inset-0 overflow-hidden">
          {[
            [-12, 6, 62, 20, 0],
            [34, 0, 74, 24, -30],
            [58, 15, 58, 18, -60],
          ].map(([l, t, w, h, d], i) => (
            <div key={i} className="cloud absolute rounded-[50%] bg-[#262b4d] opacity-50 blur-3xl" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: `${d}s` }} />
          ))}
        </div>
        <motion.div style={{ x: x0, y: y0 }} className="absolute inset-0">
          <ChartLine />
        </motion.div>
        <div className="lightning absolute inset-0 bg-[#BFD0FF]" />
        <motion.div style={{ x: x1, y: y1 }} className="absolute -inset-x-[4%] bottom-[15%] h-[50%]">
          <CityLayer city={far} fill="#161c38" lit={0.2} className="h-full w-full opacity-80" />
        </motion.div>
        <motion.div style={{ x: x2, y: y2 }} className="absolute -inset-x-[5%] bottom-[10%] h-[44%]">
          <CityLayer city={mid} fill="#0c1124" lit={0.28} stripe={0.12} flicker={16} className="h-full w-full" />
        </motion.div>
        <motion.div style={{ x: x3, y: y3 }} className="absolute -inset-x-[6%] bottom-[5%] h-[38%]">
          <CityLayer city={near} fill="#05070f" lit={0.34} gold={0.22} flicker={26} glow className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-[6%] bg-gradient-to-b from-[#0b0e19] to-[#020308]" />
        <motion.div style={{ x: x3 }} className="absolute -inset-x-[6%] top-[95%] h-[38%] -scale-y-100 opacity-25 blur-[2px] [mask-image:linear-gradient(to_top,black,transparent_75%)]">
          <CityLayer city={near} fill="#05070f" lit={0.34} className="h-full w-full" />
        </motion.div>
        <div className="absolute inset-x-0 bottom-[5%] h-[22%] bg-gradient-to-t from-[#0d1020]/70 to-transparent" />
        {!reduce && <Rain />}
      </div>
    </motion.div>
  );
}

function ChartLine() {
  const { d, last } = useMemo(() => {
    const r = rng(9);
    let y = 330;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      y = Math.max(50, Math.min(350, y + (r() - 0.6) * 32));
      pts.push([60 + i * 21.5, y]);
    }
    return { d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1].toFixed(1)}`).join(''), last: pts[pts.length - 1] };
  }, []);
  const draw = { duration: 4.2, ease: [0.45, 0, 0.2, 1] as const, delay: 0.5 };
  return (
    <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-x-0 top-[9%] h-[36%] w-full">
      <defs>
        <linearGradient id="t-line" x1="0" x2="1">
          <stop offset="0" stopColor="#0ECB81" stopOpacity="0" />
          <stop offset=".4" stopColor="#0ECB81" stopOpacity=".55" />
          <stop offset="1" stopColor="#8BFFD0" />
        </linearGradient>
        <linearGradient id="t-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ECB81" stopOpacity=".14" />
          <stop offset="1" stopColor="#0ECB81" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[90, 170, 250, 330].map((y) => (
        <path key={y} d={`M0 ${y}H1600`} stroke="#A9B8FF" strokeOpacity=".05" strokeDasharray="4 10" />
      ))}
      <motion.path d={`${d}L${last[0]} 400L60 400Z`} fill="url(#t-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2, duration: 2.5 }} />
      <motion.path d={d} fill="none" stroke="url(#t-line)" strokeWidth="10" opacity=".35" style={{ filter: 'blur(7px)' }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw} />
      <motion.path d={d} fill="none" stroke="url(#t-line)" strokeWidth="2.4" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.6, duration: 0.6 }}>
        <circle cx={last[0]} cy={last[1]} r="14" fill="#0ECB81" opacity=".25" className="pulse-dot" style={{ transformOrigin: `${last[0]}px ${last[1]}px` }} />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill="#C9FFE6" />
        <text x={last[0] - 14} y={last[1] - 16} textAnchor="end" fill="#A7F3D0" fontSize="15" fontFamily="ui-monospace, monospace" opacity=".8">
          USDT/RUB 92,41 ▲
        </text>
      </motion.g>
    </svg>
  );
}

/** Canvas rain: three depth layers, one stroke per layer per frame. */
function Rain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const layers = [0, 1, 2].map((z) => ({ z, drops: Array.from({ length: [150, 90, 40][z] }, () => ({ x: Math.random() * 1.2 - 0.1, y: Math.random() })) }));
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (const { z, drops } of layers) {
        const speed = [0.9, 1.35, 1.9][z];
        const len = [12, 20, 34][z];
        ctx.strokeStyle = ['rgba(160,185,255,.16)', 'rgba(175,200,255,.24)', 'rgba(200,215,255,.32)'][z];
        ctx.lineWidth = [0.7, 1, 1.4][z];
        ctx.beginPath();
        for (const d of drops) {
          d.y += speed * dt;
          d.x += speed * dt * 0.1;
          if (d.y > 1.04) {
            d.y = -0.04;
            d.x = Math.random() * 1.2 - 0.1;
          }
          const x = d.x * W;
          const y = d.y * H;
          ctx.moveTo(x, y);
          ctx.lineTo(x - len * 0.1, y - len);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

// ───────── logo, splash, menu ─────────

const TITLE = 'С НУЛЯ'.split('');
const TINT = ['#FCD34D', '#E9D85A', '#C4DE6B', '#9BE07D', '#6EE7A0', '#34D399'];

function Logo({ center }: { center?: boolean }) {
  return (
    <div className={cn('select-none', center && 'text-center')}>
      <motion.div initial={{ opacity: 0, letterSpacing: '1.1em' }} animate={{ opacity: 1, letterSpacing: '0.55em' }} transition={{ duration: 1.8, ease: 'easeOut' }} className="text-[11px] font-semibold text-emerald-300/80 uppercase">
        симулятор P2P-трейдера
      </motion.div>
      <h1 className="mt-3 leading-[0.92] font-black tracking-tight [perspective:600px]" style={{ fontSize: center ? 'clamp(64px, 8.5vw, 124px)' : 'clamp(52px, 6.2vw, 96px)', filter: 'drop-shadow(0 0 28px rgba(240,185,11,.22))' }}>
        <motion.span initial={{ opacity: 0, y: 24, filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1, delay: 0.15 }} className="inline-block text-white">
          P2P:
        </motion.span>{' '}
        {TITLE.map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${TINT[i]}, ${TINT[Math.min(TINT.length - 1, i + 1)]})` }}
            initial={{ opacity: 0, y: 34, rotateX: -85 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 240, damping: 17 }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </h1>
      <motion.div className={cn('mt-5 h-px w-[min(440px,80%)] bg-gradient-to-r from-emerald-300/80 via-amber-200/50 to-transparent', center && 'mx-auto bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent')} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.1, duration: 1.3, ease: 'easeOut' }} style={{ transformOrigin: center ? 'center' : 'left' }} />
    </div>
  );
}

function Splash() {
  return (
    <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)', transition: { duration: 0.5 } }} transition={{ duration: 1 }}>
      <Logo center />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-16 animate-pulse-soft text-[13px] font-semibold tracking-[0.55em] text-white/85 uppercase">
        Нажмите любую клавишу
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} className="absolute bottom-10 flex items-center gap-2 text-[11px] tracking-wide text-white/40">
        <Headphones size={14} /> Лучше играть в наушниках
      </motion.div>
    </motion.div>
  );
}

type ItemId = 'continue' | 'new' | 'settings' | 'help' | 'about';
type Panel = 'new' | 'help' | 'about' | null;

function Menu() {
  const started = useGame((s) => s.started);
  const chapter = useGame((s) => s.chapter);
  const difficulty = useGame((s) => s.difficulty);
  const now = useGame((s) => s.now);
  const settingsOpen = useSettingsUi((s) => s.open);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState(false);
  const [sel, setSel] = useState(0);
  const hasSave = started && typeof localStorage !== 'undefined' && !!localStorage.getItem(SAVE_KEY);

  const items: { id: ItemId; label: string; sub?: string }[] = [
    ...(hasSave ? [{ id: 'continue' as const, label: 'Продолжить', sub: `Глава ${chapter} · ${chapterDef(chapter).title}` }] : []),
    { id: 'new', label: 'Новая игра', sub: hasSave ? 'Начать историю заново' : 'Новозаровск, 3 700 ₽ на карте' },
    { id: 'settings', label: 'Настройки', sub: 'Звук, озвучка, сцены, экран' },
    { id: 'help', label: 'Как играть' },
    { id: 'about', label: 'Об игре' },
  ];

  const start = (d: Difficulty) => {
    if (hasSave && !confirm) {
      audio.sfx('ui_error');
      setConfirm(true);
      return;
    }
    audio.sfx('ui_select');
    useGame.getState().newGame(d);
  };
  const activate = (id: ItemId) => {
    audio.sfx('ui_select');
    if (id === 'continue') useGame.getState().resume();
    else if (id === 'settings') openSettings();
    else {
      setPanel((p) => (p === id ? null : id));
      setConfirm(false);
    }
  };
  const back = () => {
    audio.sfx('ui_back');
    setPanel(null);
    setConfirm(false);
  };

  const live = useRef({ items, sel, panel, activate, back });
  live.current = { items, sel, panel, activate, back };
  useEffect(() => {
    if (settingsOpen) return;
    const k = (e: KeyboardEvent) => {
      const L = live.current;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        audio.sfx('ui_hover');
        setSel((L.sel + (e.key === 'ArrowDown' ? 1 : L.items.length - 1)) % L.items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        L.activate(L.items[L.sel].id);
      } else if (e.key === 'Escape' && L.panel) L.back();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [settingsOpen]);

  return (
    <motion.div className="absolute inset-0 z-20 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <div className="flex w-[min(600px,48vw)] shrink-0 flex-col justify-center pb-10 pl-[7vw]">
        <Logo />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }} className="mt-5 max-w-md text-[13.5px] leading-relaxed text-white/60">
          Новозаровск, 3 700 ₽ на карте и старый компьютер. Каждый перевод — руками через банк, каждый чек — в папку, каждое ФИО — сверить. Восемь глав, четыре концовки.
        </motion.p>
        <nav className="mt-8 flex flex-col">
          {items.map((it, i) => (
            <motion.button
              key={it.id}
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 26 }}
              onMouseEnter={() => {
                if (sel !== i) {
                  setSel(i);
                  audio.sfx('ui_hover');
                }
              }}
              onClick={() => activate(it.id)}
              className="group flex items-center gap-4 py-[7px] text-left outline-none"
            >
              <span className={cn('h-[2px] shrink-0 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-300', sel === i ? 'w-10 opacity-100' : 'w-3 opacity-25')} />
              <span className="min-w-0">
                <span className={cn('block text-[clamp(20px,2.1vw,27px)] leading-tight font-bold tracking-tight transition-all duration-300', sel === i ? 'translate-x-1 text-white [text-shadow:0_0_26px_rgba(14,203,129,.5)]' : 'text-white/50')}>
                  {it.label}
                  {(it.id === 'new' || it.id === 'help' || it.id === 'about') && panel === it.id && <ChevronRight size={18} className="ml-1 inline text-emerald-300" />}
                </span>
                {it.sub && <span className={cn('block truncate text-[12px] transition-colors duration-300', sel === i ? 'text-emerald-200/80' : 'text-white/30')}>{it.sub}</span>}
              </span>
              {it.id === 'continue' && (
                <span className={cn('ml-1 shrink-0 self-center rounded-md px-2 py-0.5 text-[10.5px] transition-colors', sel === i ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/5 text-white/40')}>
                  {difficulty === 'story' ? 'сюжетный' : 'реалистичный'} · {dateStr(now)}
                </span>
              )}
            </motion.button>
          ))}
        </nav>
      </div>
      <div className="relative flex min-w-0 flex-1 items-center justify-center pr-[5vw] pb-10">
        <AnimatePresence mode="wait">
          {panel && (
            <motion.div
              key={panel}
              initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 24, filter: 'blur(4px)', transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="relative max-h-[78vh] w-[min(560px,100%)] overflow-y-auto rounded-3xl bg-[#0b0e1a]/65 p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] ring-1 ring-white/10 backdrop-blur-2xl scroll-thin"
            >
              <button onClick={back} title="Назад (Esc)" className="absolute top-5 right-5 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
              {panel === 'new' && (
                <>
                  <PanelTitle kicker="Новая игра" title="Выберите режим" />
                  <div className="grid grid-cols-2 gap-3">
                    <DiffCard icon={<ShieldCheck size={18} />} title="Сюжетный" text="Меньше мошенников, мягче банки, длиннее таймеры и ниже цели. Чтобы спокойно пройти историю." onClick={() => start('story')} />
                    <DiffCard icon={<Swords size={18} />} title="Реалистичный" text="Таймер ордера 15 минут, жёсткий 115-ФЗ, больше скама, цель — миллион оборота. Как в жизни." onClick={() => start('realistic')} />
                  </div>
                  <AnimatePresence>
                    {confirm && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl bg-amber-400/10 p-3 text-center text-xs text-amber-200 ring-1 ring-amber-300/20">
                        Текущее сохранение будет перезаписано. Нажмите режим ещё раз, чтобы подтвердить.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {panel === 'help' && (
                <>
                  <PanelTitle kicker="Обучение" title="Как играть" />
                  <ul className="space-y-2.5 text-[13px] leading-relaxed text-white/75">
                    {HELP_ITEMS.map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">{i + 1}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {panel === 'about' && <About />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-[7vw] pb-6 text-[11px] text-white/30">
        <span>Все персонажи, банки-двойники и события вымышлены. Игра обучает финансовой и цифровой гигиене.</span>
        <span className="flex shrink-0 gap-5">
          <span>↑↓ — выбор · Enter — открыть · Esc — назад</span>
          <span>v1.0</span>
        </span>
      </motion.footer>
    </motion.div>
  );
}

function PanelTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <div className="text-[10.5px] font-bold tracking-[0.3em] text-emerald-300/80 uppercase">{kicker}</div>
      <div className="mt-1 text-[24px] font-bold tracking-tight">{title}</div>
    </div>
  );
}

function DiffCard({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onMouseEnter={() => audio.sfx('ui_hover')} onClick={onClick} className="group rounded-2xl bg-white/[.05] p-4 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-emerald-400/10 hover:ring-emerald-400/50">
      <div className="flex items-center gap-2 font-bold text-white">
        <span className="text-emerald-300">{icon}</span>
        {title}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-white/55">{text}</div>
    </button>
  );
}

function About() {
  const rows: [string, string][] = [
    ['Жанр', 'Симулятор P2P-трейдера с сюжетом: восемь глав и четыре концовки'],
    ['Музыка и звук', 'Процедурный синтез WebAudio — ни одного аудиофайла'],
    ['Озвучка', 'Синтез речи вашего браузера'],
    ['Графика', 'Процедурная: города, обои и иконки рисуются кодом'],
    ['Технологии', 'React, TypeScript, Tailwind, Framer Motion, Zustand'],
    ['Спасибо', 'Всем, кто сверяет ФИО отправителя перед переводом'],
  ];
  return (
    <>
      <PanelTitle kicker="Об игре" title="P2P: С НУЛЯ" />
      <dl className="space-y-3 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-3">
            <dt className="text-white/40">{k}</dt>
            <dd className="text-white/80">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-xl bg-white/[.04] p-3 text-[11.5px] leading-relaxed text-white/45 ring-1 ring-white/[.06]">Игра не является финансовой или юридической рекомендацией. Банки, биржи и люди в ней — вымышленные двойники.</div>
    </>
  );
}
