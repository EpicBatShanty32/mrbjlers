import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Image, Info, LayoutGrid, MessageCircle, RefreshCw, Settings2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import { cn } from '../common/kit';
import { useSize } from '../common/hooks';
import { audio } from '../../audio';
import { openSettings } from '../settings/store';
import { APP_IDS, AppIcon, useAppMeta } from '../os/apps';
import { osRefs, useDismiss, useSkin, type Skin } from '../os/shared';
import { WindowFrame } from './WindowFrame';
import BrowserApp from './BrowserApp';
import FilesApp from '../pc/FilesApp';
import CalcApp from '../pc/CalcApp';
import NotesApp from '../pc/NotesApp';

const BODY: Record<PcAppId, () => ReactNode> = {
  browser: () => <BrowserApp />,
  files: () => <FilesApp />,
  calc: () => <CalcApp />,
  notes: () => <NotesApp />,
};

export default function Desktop() {
  const [ref, size] = useSize<HTMLDivElement>();
  const skin = useSkin();
  const meta = useAppMeta();
  const lagging = useGame((s) => s.hero.pcTier === 0 && Object.values(s.ui.windows).filter((w) => w.open && !w.minimized).length > 3);
  const fileCount = useGame((s) => s.files.length);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [byName, setByName] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [sel, setSel] = useState<PcAppId | null>(null);
  useEffect(() => {
    osRefs.desk = ref.current;
  }, [ref]);
  const ids = byName ? [...APP_IDS].sort((a, b) => meta(a).short.localeCompare(meta(b).short, 'ru')) : APP_IDS;
  const mac = skin === 'mac';

  const onContext = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-window]')) return;
    e.preventDefault();
    const r = ref.current!.getBoundingClientRect();
    setMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const items: MenuItem[] = [
    { icon: <RefreshCw size={14} />, label: 'Обновить', hint: mac ? undefined : 'F5', run: () => setRefresh((n) => n + 1) },
    { icon: <LayoutGrid size={14} />, label: byName ? 'Упорядочить значки: как было' : 'Упорядочить значки по имени', run: () => setByName((v) => !v) },
    null,
    { icon: <Image size={14} />, label: mac ? 'Изменить обои…' : 'Персонализация', run: () => openSettings('screen', 'wallpaper') },
    { icon: <Settings2 size={14} />, label: 'Настройки игры', run: () => openSettings('sound') },
  ];

  return (
    <div ref={ref} className={cn('absolute inset-0 isolate overflow-hidden', lagging && 'lagging')} onContextMenu={onContext} onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
      <motion.div key={refresh} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className={cn('absolute top-3 z-[1] flex flex-col gap-1', mac ? 'right-3 items-center' : 'left-2')}>
        {ids.map((id) => (
          <motion.button
            layout
            key={id}
            onClick={() => {
              setSel(id);
              useGame.getState().openWindow(id);
            }}
            className={cn(
              'group relative flex w-[86px] flex-col items-center gap-1 rounded-[7px] px-1 pt-2 pb-1.5 text-center outline-none',
              !mac && (sel === id ? 'bg-sky-400/20 ring-1 ring-sky-300/40' : 'hover:bg-white/[.09] hover:ring-1 hover:ring-white/10'),
            )}
          >
            <div className={cn('relative transition-transform duration-200 group-active:scale-95', mac && sel === id && 'rounded-[10px] bg-white/15 p-0.5')}>
              <AppIcon id={id} skin={skin} size={mac ? 50 : 44} />
              {id === 'files' && fileCount > 0 && <span className="absolute -top-1 -right-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] leading-[18px] font-bold text-white shadow ring-2 ring-black/20">{fileCount}</span>}
            </div>
            <span className={cn('max-w-full leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,.95)]', mac ? cn('rounded-[4px] px-1 text-[11.5px] font-medium', sel === id && 'bg-[#0A64D8] [text-shadow:none]') : 'text-[11px]')}>{meta(id).short}</span>
          </motion.button>
        ))}
      </motion.div>
      {APP_IDS.map((id) => (
        <WindowFrame key={id} id={id} title={meta(id).title} icon={<AppIcon id={id} skin={skin} size={16} />} bounds={size}>
          {BODY[id]()}
        </WindowFrame>
      ))}
      <Toasts skin={skin} />
      <AnimatePresence>{menu && <ContextMenu at={menu} bounds={size} skin={skin} items={items} onClose={() => setMenu(null)} />}</AnimatePresence>
    </div>
  );
}

export type MenuItem = { icon?: ReactNode; label: string; hint?: string; run: () => void; disabled?: boolean } | null;

function ContextMenu({ at, bounds, skin, items, onClose }: { at: { x: number; y: number }; bounds: { w: number; h: number }; skin: Skin; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);
  const mac = skin === 'mac';
  const W = 236;
  const H = items.length * 30 + 10;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.14 }}
      style={{ left: Math.min(at.x, bounds.w - W - 6), top: Math.min(at.y, bounds.h - H - 6), width: W, zIndex: 100001, transformOrigin: 'top left' }}
      className={cn('absolute p-1 text-white/90 shadow-[0_18px_50px_-10px_rgba(0,0,0,.8)] backdrop-blur-2xl', mac ? 'rounded-[10px] bg-[#2A2A2F]/85 text-[13px] ring-1 ring-black/60' : 'rounded-lg bg-[#262A35]/90 text-[12.5px] ring-1 ring-white/10')}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it ? (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => {
              audio.sfx('ui_click');
              it.run();
              onClose();
            }}
            className={cn('flex w-full items-center gap-2.5 text-left disabled:opacity-40', mac ? 'rounded-[5px] px-2 py-[4px] hover:bg-[#0A64D8]' : 'rounded-md px-2.5 py-1.5 hover:bg-white/10')}
          >
            {!mac && <span className="text-white/65">{it.icon}</span>}
            <span className="flex-1">{it.label}</span>
            {it.hint && <span className="text-[11px] text-white/35">{it.hint}</span>}
          </button>
        ) : (
          <div key={i} className={cn('mx-2 my-1 h-px', mac ? 'bg-white/10' : 'bg-white/[.08]')} />
        ),
      )}
    </motion.div>
  );
}

const TONE = {
  success: { icon: <CircleCheck size={15} />, bg: 'bg-emerald-500/20 text-emerald-300', title: 'Готово' },
  error: { icon: <CircleX size={15} />, bg: 'bg-rose-500/20 text-rose-300', title: 'Ошибка' },
  warn: { icon: <TriangleAlert size={15} />, bg: 'bg-amber-500/20 text-amber-300', title: 'Внимание' },
  info: { icon: <Info size={15} />, bg: 'bg-sky-500/20 text-sky-300', title: 'Уведомление' },
  thought: { icon: <MessageCircle size={15} />, bg: 'bg-violet-500/25 text-violet-200', title: 'Артём думает' },
} as const;

function Toasts({ skin }: { skin: Skin }) {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  const mac = skin === 'mac';
  useEffect(() => {
    if (!toasts.length) return;
    const t = setInterval(() => {
      const now = Date.now();
      for (const x of useGame.getState().toasts) if (now - x.createdAt > (x.kind === 'thought' ? 8000 : 6500)) useGame.getState().dismissToast(x.id);
    }, 500);
    return () => clearInterval(t);
  }, [toasts.length]);
  return (
    <div className={cn('pointer-events-none absolute flex w-[370px] max-w-[60%] flex-col gap-2', mac ? 'top-2 right-2' : 'bottom-3 left-3 flex-col-reverse')} style={{ zIndex: 100000 }}>
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={mac ? { opacity: 0, x: 60 } : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={mac ? { opacity: 0, x: 80 } : { opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 p-2.5 text-xs text-white/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur-2xl',
                mac ? 'rounded-2xl bg-[#2B2B31]/80 ring-1 ring-white/10' : 'rounded-lg bg-[#1E2330]/90 ring-1 ring-white/10',
                t.kind === 'error' && !mac && 'ring-rose-400/30',
              )}
            >
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', tone.bg)}>{tone.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold tracking-wide text-white/45 uppercase">{tone.title}</div>
                <div className={cn('mt-0.5 leading-snug', t.kind === 'thought' && 'text-violet-100 italic')}>{t.kind === 'thought' ? `«${t.text}»` : t.text}</div>
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white">
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
