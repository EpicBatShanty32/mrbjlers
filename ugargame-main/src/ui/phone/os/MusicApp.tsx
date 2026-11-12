import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { Check, Pause, Play, Radio, SkipBack, SkipForward, Volume1, Volume2 } from 'lucide-react';
import { audio } from '../../../audio';
import { getSettings, useSettings } from '../../../game/settings';
import { cn } from '../../common/kit';
import { Cover, coverTint } from './cover';
import { Eq, useNowPlaying } from './Island';
import { Slider } from './kit';

const stop = (f: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  f();
};

function usePlayPause() {
  const { snap, playing } = useNowPlaying();
  return () => (!snap.track ? audio.player.play(audio.tracks()[0].id) : playing ? audio.player.pause() : audio.player.resume());
}

/** Apple-Music-like player over the procedural soundtrack. */
export default function MusicApp() {
  const { snap, info, playing } = useNowPlaying();
  const [full, setFull] = useState(false);
  const toggle = usePlayPause();
  const tracks = audio.tracks();
  const adaptive = !snap.manual;
  return (
    <div className="ios relative h-full w-full overflow-hidden bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28">
        <div className="pt-2 text-[31px] font-bold tracking-tight">Музыка</div>
        <div className="text-[13px] text-white/45">Медиатека · P2P: С НУЛЯ</div>
        <button
          type="button"
          onClick={() => audio.player.auto()}
          className={cn('relative mt-4 w-full overflow-hidden rounded-[22px] p-4 text-left transition-shadow', adaptive && 'shadow-[0_12px_40px_-12px_rgba(255,45,85,.7)]')}
          style={{ background: adaptive ? 'linear-gradient(135deg,#ff2d55 0%,#bf5af2 55%,#5e5ce6 100%)' : '#1c1c1e' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20"><Radio size={22} /></span>
            <div className="min-w-0">
              <div className="text-[17px] font-semibold">Адаптивный саундтрек</div>
              <div className="text-[12.5px] leading-snug text-white/75">Музыка сама подстраивается под игру: день, ночь, сделки, Москва</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold', adaptive ? 'bg-white text-black' : 'bg-white/15')}>
              {adaptive ? <><Check size={14} strokeWidth={3} /> Включён</> : 'Включить'}
            </span>
            {adaptive && info && (
              <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-white/90">
                <Eq on={playing} n={3} h={11} />
                <span className="truncate">{info.title}</span>
              </span>
            )}
          </div>
        </button>

        <div className="mt-6 flex items-center gap-3">
          <Cover id="album" size={70} radius="12%" />
          <div className="min-w-0">
            <div className="text-[18px] font-semibold">P2P: С НУЛЯ</div>
            <div className="text-[14px] text-[#FF375F]">Original Soundtrack</div>
            <div className="text-[12px] text-white/45">{tracks.length} треков · 2026 · Lossless</div>
          </div>
        </div>
        <div className="mt-3">
          {tracks.map((t, i) => {
            const cur = snap.track === t.id;
            return (
              <button key={t.id} type="button" onClick={() => (cur && snap.manual ? toggle() : audio.player.play(t.id))} className="flex w-full items-center gap-3 py-[5px] text-left active:opacity-60">
                <Cover id={t.id} size={46} radius="14%" />
                <div className="min-w-0 flex-1 border-b border-white/10 py-1.5">
                  <div className={cn('truncate text-[15px]', cur && 'font-semibold text-[#FF375F]')}>{t.title}</div>
                  <div className="truncate text-[12.5px] text-white/50">{t.artist} · {t.mood}</div>
                </div>
                <span className="flex w-6 justify-center text-[13px] text-white/30">{cur ? <Eq color="#FF375F" on={playing} n={3} h={12} /> : i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="button" onClick={() => setFull(true)} className="lg-dark absolute inset-x-3 bottom-3 z-10 flex cursor-pointer items-center gap-3 rounded-[20px] p-2 pr-3.5">
        {info ? <Cover id={info.id} size={42} radius="22%" /> : <div className="h-[42px] w-[42px] rounded-[9px] bg-white/10" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{info?.title ?? 'Не исполняется'}</div>
          <div className="truncate text-[12px] text-white/55">{info ? (snap.manual ? info.artist : 'Адаптивный саундтрек') : 'Выберите трек'}</div>
        </div>
        <button type="button" onClick={stop(toggle)} title={playing ? 'Пауза' : 'Играть'}>{playing ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}</button>
        <button type="button" onClick={stop(() => audio.player.next())} title="Далее"><SkipForward size={22} fill="#fff" /></button>
      </div>
      <AnimatePresence>{full && <NowPlaying key="np" onClose={() => setFull(false)} />}</AnimatePresence>
    </div>
  );
}

function NowPlaying({ onClose }: { onClose: () => void }) {
  const { snap, info, playing } = useNowPlaying();
  const toggle = usePlayPause();
  const vol = useSettings((s) => s.music);
  const drag = useDragControls();
  const tint = info ? coverTint(info.id) : '#777';
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col px-6 pt-2 pb-5"
      style={{ background: `linear-gradient(180deg, ${tint} -30%, #1a1a1c 62%, #0b0b0c 100%)` }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(_, i) => i.offset.y > 90 && onClose()}
    >
      <button type="button" onPointerDown={(e) => drag.start(e)} onClick={onClose} className="mx-auto mb-5 flex h-5 w-16 touch-none items-center justify-center" title="Свернуть">
        <span className="h-[5px] w-10 rounded-full bg-white/45" />
      </button>
      <motion.div className="aspect-square w-full overflow-hidden rounded-[14px] shadow-[0_26px_50px_-10px_rgba(0,0,0,.6)]" animate={{ scale: playing ? 1 : 0.84 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
        <Cover id={info?.id ?? 'silence'} size="100%" radius="0" />
      </motion.div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[21px] font-semibold">{info?.title ?? 'Не исполняется'}</div>
          <div className="truncate text-[16px] text-white/60">{info ? `${info.artist}` : '—'}</div>
        </div>
        {!snap.manual && <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">Адаптивный</span>}
      </div>
      <Visualizer playing={playing} color={tint} />
      <div className="mt-auto flex items-center justify-between px-5">
        <button type="button" onClick={() => audio.player.prev()} title="Назад"><SkipBack size={34} fill="#fff" /></button>
        <button type="button" onClick={toggle} title={playing ? 'Пауза' : 'Играть'}>{playing ? <Pause size={52} fill="#fff" /> : <Play size={52} fill="#fff" />}</button>
        <button type="button" onClick={() => audio.player.next()} title="Далее"><SkipForward size={34} fill="#fff" /></button>
      </div>
      <div className="mt-6">
        <Slider value={vol} onChange={(v) => useSettings.getState().set({ music: v })} tint="#fff" left={<Volume1 size={16} className="text-white/60" />} right={<Volume2 size={18} className="text-white/80" />} />
      </div>
      <button type="button" onClick={() => audio.player.auto()} className={cn('mx-auto mt-4 rounded-full px-4 py-1.5 text-[13px] font-semibold', !snap.manual ? 'bg-white text-black' : 'bg-white/15')}>
        Адаптивный саундтрек
      </button>
    </motion.div>
  );
}

/** Bars driven by audio.level() with direct DOM writes (no React state per frame). */
function Visualizer({ playing, color }: { playing: boolean; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bars = Array.from(ref.current?.children ?? []) as HTMLElement[];
    if (getSettings().reduceMotion) return;
    let raf = 0;
    const loop = (t: number) => {
      const lv = audio.level();
      const base = lv > 0.002 ? lv : playing ? 0.3 + 0.15 * Math.sin(t / 420) : 0;
      bars.forEach((b, i) => {
        const v = base > 0 ? Math.min(1, Math.max(0.07, base * 1.7 * (0.5 + 0.5 * Math.abs(Math.sin(t / (150 + i * 19) + i * 1.3))))) : 0.07;
        b.style.transform = `scaleY(${v.toFixed(3)})`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <div ref={ref} className="mt-5 flex h-11 items-end gap-[3px]">
      {Array.from({ length: 30 }, (_, i) => (
        <span key={i} className="h-full flex-1 rounded-full" style={{ background: color, opacity: 0.85, transformOrigin: '50% 100%', transform: 'scaleY(.07)' }} />
      ))}
    </div>
  );
}
