import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { create } from 'zustand';
import { useGame } from '../../../game/store';
import { audio } from '../../../audio';
import { cn } from '../../common/kit';
import { matchCmd, useCommands, type Cmd } from '../commands';

export const useSpotlight = create<{ open: boolean }>(() => ({ open: false }));
export const toggleSpotlight = (v?: boolean) => useSpotlight.setState((s) => ({ open: v ?? !s.open }));

/** Ctrl/⌘+Space launcher for apps and actions (Mac shell only). */
export function Spotlight() {
  const open = useSpotlight((s) => s.open);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        audio.sfx('ui_open');
        toggleSpotlight();
      }
    };
    window.addEventListener('keydown', h);
    return () => {
      window.removeEventListener('keydown', h);
      useSpotlight.setState({ open: false });
    };
  }, []);
  return <AnimatePresence>{open && <Panel key="sp" />}</AnimatePresence>;
}

function Panel() {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const cmds = useCommands('mac');
  const list = cmds.filter((c) => matchCmd(c, q)).slice(0, q ? 9 : 8);
  const cur = Math.min(sel, Math.max(0, list.length - 1));
  const run = (c: Cmd) => {
    toggleSpotlight(false);
    audio.sfx('ui_select');
    const r = c.run();
    const g = useGame.getState();
    if (r && !r.ok) g.toast('error', r.error ?? 'Не получилось');
    else if (r && c.id === 'wait') g.toast('info', 'Прошёл час');
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((cur + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % Math.max(1, list.length));
    } else if (e.key === 'Enter' && list[cur]) run(list[cur]);
    else if (e.key === 'Escape') toggleSpotlight(false);
  };
  return (
    <motion.div className="absolute inset-0 z-[800]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.target === e.currentTarget && toggleSpotlight(false)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 520, damping: 36 }}
        className="absolute top-[15%] left-1/2 w-[640px] max-w-[90%] -translate-x-1/2 overflow-hidden rounded-[20px] bg-[#26262C]/80 text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,.9),inset_0_.5px_0_rgba(255,255,255,.2)] ring-1 ring-black/50 backdrop-blur-3xl backdrop-saturate-150"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Search size={22} className="text-white/45" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={key}
            placeholder="Поиск в Spotlight"
            className="flex-1 bg-transparent text-[22px] font-light outline-none placeholder:text-white/35"
          />
        </div>
        {list.length > 0 ? (
          <div className="border-t border-white/10 p-1.5">
            {list.map((c, i) => (
              <div key={c.id}>
                {(i === 0 || list[i - 1].kind !== c.kind) && <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold text-white/40">{c.kind === 'app' ? 'Программы' : 'Действия'}</div>}
                <button onMouseMove={() => setSel(i)} onClick={() => run(c)} className={cn('flex w-full items-center gap-3 rounded-[9px] px-2.5 py-1.5 text-left', i === cur ? 'bg-[#0A64D8]' : '')}>
                  {c.icon}
                  <span className="text-[14px]">{c.label}</span>
                  <span className={cn('ml-auto truncate pl-4 text-[12px]', i === cur ? 'text-white/75' : 'text-white/35')}>{c.sub}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-white/10 px-5 py-4 text-[13px] text-white/45">Нет результатов</div>
        )}
      </motion.div>
    </motion.div>
  );
}

const HELLO_KEY = 'p2p-s-nulya-mac-hello';
const WORDS = ['привет', 'hello', 'bonjour', 'こんにちは'];

/** One-time macOS-style «привет» greeting the first time the Mac shell appears. */
export function Hello() {
  const cutscene = useGame((s) => !!s.cutscene);
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(HELLO_KEY);
    } catch {
      return false;
    }
  });
  const [i, setI] = useState(0);
  const live = show && !cutscene;
  useEffect(() => {
    if (!live) return;
    audio.sfx('cine_reveal');
    const t = setInterval(() => setI((n) => (n < WORDS.length ? n + 1 : n)), 1800);
    return () => clearInterval(t);
  }, [live]);
  const done = () => {
    try {
      localStorage.setItem(HELLO_KEY, '1');
    } catch {
      /* private mode */
    }
    audio.sfx('ui_select');
    setShow(false);
  };
  const end = i >= WORDS.length;
  return (
    <AnimatePresence>
      {live && (
        <motion.div key="hello" className="absolute inset-0 z-[1500] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#0B0B12]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.6 } }} onClick={done}>
          <div className="hello-blob absolute -top-1/4 -left-1/4 h-[80%] w-[70%] rounded-full bg-[#7B2FF7] opacity-40 blur-[90px]" />
          <div className="hello-blob absolute -right-1/4 -bottom-1/4 h-[80%] w-[70%] rounded-full bg-[#FF7A3C] opacity-35 blur-[90px]" style={{ animationDelay: '-6s' }} />
          <div className="hello-blob absolute top-1/4 left-1/3 h-[50%] w-[40%] rounded-full bg-[#0A84FF] opacity-30 blur-[80px]" style={{ animationDelay: '-11s' }} />
          <AnimatePresence mode="wait">
            {!end ? (
              <motion.svg key={i} viewBox="0 0 900 260" className="relative w-[64%] max-w-[760px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }} transition={{ duration: 0.4 }}>
                <defs>
                  <linearGradient id="hello-g" x1="0" x2="1">
                    <stop offset="0" stopColor="#5AC8FA" />
                    <stop offset=".45" stopColor="#FFFFFF" />
                    <stop offset="1" stopColor="#FFB86B" />
                  </linearGradient>
                </defs>
                <motion.text
                  x="450"
                  y="175"
                  textAnchor="middle"
                  fontSize={WORDS[i].length > 6 ? 130 : 150}
                  fontFamily='"Snell Roundhand","Segoe Script","Brush Script MT","Apple Chancery","URW Chancery L",cursive'
                  fill="url(#hello-g)"
                  stroke="url(#hello-g)"
                  strokeWidth="1.6"
                  style={{ strokeDasharray: 1400 }}
                  initial={{ strokeDashoffset: 1400, fillOpacity: 0 }}
                  animate={{ strokeDashoffset: 0, fillOpacity: 1 }}
                  transition={{ strokeDashoffset: { duration: 1.3, ease: 'easeInOut' }, fillOpacity: { delay: 0.8, duration: 0.6 } }}
                >
                  {WORDS[i]}
                </motion.text>
              </motion.svg>
            ) : (
              <motion.div key="end" className="relative text-center" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-[34px] font-semibold tracking-tight text-white">Добро пожаловать на Mac</div>
                <div className="mt-2 text-[14px] text-white/60">Dock, Spotlight (Ctrl+Пробел) и ни одного лага. Внимательность +5.</div>
                <div className="mt-6 inline-flex rounded-full bg-white/90 px-6 py-2 text-[13px] font-semibold text-black">Начать работу</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute bottom-5 text-[11px] text-white/35">Нажмите, чтобы продолжить</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
