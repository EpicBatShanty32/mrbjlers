import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BookOpen, FastForward, PlayCircle } from 'lucide-react';
import './cutscene.css';
import { audio, type SfxId } from '../../audio';
import { useGame } from '../../game/store';
import { useSettings } from '../../game/settings';
import { CUTSCENES, type CutLine, type Cutscene as CutDef, type LineSfx } from '../../game/story/cutscenes';
import type { CharacterId } from '../../game/types';
import { cn } from '../common/kit';
import { SceneBackdrop } from './Scenes';
import { PostFX } from './fx';
import { Staging } from './Portraits';
import { Subtitles } from './Subtitles';
import { ChoiceCards, Toasts, chooseWithDiff } from './Choices';
import { Backlog, type LogEntry } from './Backlog';
import { TitleCard } from './TitleCard';
import { useLineReveal } from './reveal';

export { ChapterCard } from './ChapterCard';
export { EndingScreen } from './Ending';

const SHAKE: Keyframe[] = [
  { transform: 'translate(0,0)' },
  { transform: 'translate(-14px,7px) rotate(-.5deg)' },
  { transform: 'translate(11px,-8px) rotate(.4deg)' },
  { transform: 'translate(-8px,4px) rotate(-.25deg)' },
  { transform: 'translate(5px,-3px)' },
  { transform: 'translate(0,0)' },
];

const BAR = '8.5vh';

export function Cutscene() {
  const id = useGame((s) => s.cutscene?.id ?? null);
  const rm = useSettings((s) => s.reduceMotion);
  return (
    <MotionConfig reducedMotion={rm ? 'always' : 'never'}>
      <Toasts />
      <AnimatePresence>{id && <CutsceneView key={id} id={id} />}</AnimatePresence>
    </MotionConfig>
  );
}

function sfxList(s: LineSfx | LineSfx[] | undefined): [SfxId, number][] {
  if (!s) return [];
  if (typeof s === 'string') return [[s, 0]];
  if (typeof s[1] === 'number') return [s as [SfxId, number]];
  return (s as LineSfx[]).map((x) => (typeof x === 'string' ? [x, 0] : x));
}

/** Current speaker in focus, the previous one dimmed (lookback stops at a location change). */
function staging(def: CutDef, idx: number): { cur: CharacterId | null; prev: CharacterId | null } {
  const isChar = (w: string) => w !== 'narrator' && w !== 'thought';
  const cur = def.lines[idx].who;
  if (!isChar(cur)) return { cur: null, prev: null };
  let prev: CharacterId | null = null;
  for (let i = idx - 1; i >= 0 && !prev; i--) {
    const w = def.lines[i].who;
    if (isChar(w) && w !== cur) prev = w as CharacterId;
    if (def.lines[i].bg) break;
  }
  return { cur: cur as CharacterId, prev };
}

function CutsceneView({ id }: { id: string }) {
  const def = CUTSCENES[id];
  const live = useGame((s) => (s.cutscene?.id === id ? s.cutscene.line : -1));
  const closing = live < 0;
  const idxRef = useRef(0);
  if (!closing) idxRef.current = live;
  const lineIdx = idxRef.current;
  const line: CutLine = def.lines[lineIdx];

  // while the exit animation runs the store no longer holds this cutscene: reuse the last frame
  const frozen = useRef({ text: '', choices: '[]' });
  const text = useGame((s) => (s.cutscene?.id !== id ? frozen.current.text : typeof line.text === 'function' ? line.text(s) : line.text));
  const choicesJson = useGame((s) => (s.cutscene?.id !== id ? frozen.current.choices : JSON.stringify((line.choices ?? []).filter((c) => !c.if || c.if(s)).map((c) => ({ text: c.text, hint: c.hint })))));
  frozen.current = { text, choices: choicesJson };
  const choices = useMemo(() => JSON.parse(choicesJson) as { text: string; hint?: string }[], [choicesJson]);

  const bg = useMemo(() => {
    for (let i = lineIdx; i >= 0; i--) if (def.lines[i].bg) return def.lines[i].bg!;
    return def.bg;
  }, [def, lineIdx]);
  const st = useMemo(() => staging(def, lineIdx), [def, lineIdx]);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const grain = useSettings((s) => s.filmGrain);
  const rm = useSettings((s) => s.reduceMotion);

  const [titleOn, setTitleOn] = useState(!!def.title);
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [skipTo, setSkipTo] = useState(-1);
  const [flash, setFlash] = useState(0);
  const chosen = useRef<Record<number, string>>({});
  const cam = useRef<HTMLDivElement>(null);

  const reveal = useLineReveal({ text, who: line.who, emotion: line.emotion, run: !titleOn && !closing, instant: skipTo === lineIdx });
  const showChoices = reveal.done && choices.length > 0 && !closing;

  // audio direction: scene claim, cutscene-level music/ambience, per-line cues
  useEffect(() => {
    const release = audio.claimScene(`cutscene:${id}`);
    if (def.music) audio.music(def.music);
    if (def.ambience) audio.ambience(def.ambience);
    return release;
  }, [id, def]);
  useEffect(() => {
    if (titleOn || closing) return;
    if (line.music) audio.music(line.music);
    if (line.ambience) audio.ambience(line.ambience);
    const cues = sfxList(line.sfx ?? (line.who === 'thought' ? 'thought' : undefined));
    const timers: number[] = [];
    for (const [sid, at] of cues) {
      if (at) timers.push(window.setTimeout(() => audio.sfx(sid), at));
      else audio.sfx(sid);
    }
    if (line.shake && !rm) cam.current?.animate(SHAKE, { duration: 720, easing: 'cubic-bezier(.36,.07,.19,.97)' });
    return () => timers.forEach(clearTimeout);
  }, [lineIdx, titleOn, closing, line, rm]);

  const L = useRef({ closing, titleOn, log, choices, reveal });
  L.current = { closing, titleOn, log, choices, reveal };
  const advance = useCallback(() => {
    const s = L.current;
    if (s.closing || s.log) return;
    if (s.titleOn) return setTitleOn(false);
    if (!s.reveal.isRevealed()) return s.reveal.finish();
    if (s.choices.length) return;
    audio.stopVoice();
    useGame.getState().cutsceneNext();
  }, []);

  /** Fast-forward to the next decision or the end; never picks for the player. */
  const skip = useCallback(() => {
    audio.stopVoice();
    setTitleOn(false);
    for (let guard = 0; guard < 120; guard++) {
      const s = useGame.getState();
      const cs = s.cutscene;
      if (!cs || cs.id !== id) return;
      if (CUTSCENES[id].lines[cs.line].choices?.some((c) => !c.if || c.if(s))) return setSkipTo(cs.line);
      s.cutsceneNext();
    }
  }, [id]);

  const pick = useCallback((i: number) => {
    chosen.current[idxRef.current] = L.current.choices[i].text;
    chooseWithDiff(i);
  }, []);

  const openLog = useCallback(() => {
    const s = useGame.getState();
    setLog(def.lines.slice(0, idxRef.current + 1).map((l, i) => ({ who: l.who, text: typeof l.text === 'function' ? l.text(s) : l.text, chosen: chosen.current[i] })));
  }, [def]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && L.current.log) return setLog(null);
      if (e.repeat || !(e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [advance]);

  useEffect(() => {
    if (!autoAdvance || !reveal.done || choices.length || titleOn || closing || log) return;
    const t = window.setTimeout(advance, 1200);
    return () => clearTimeout(t);
  }, [autoAdvance, reveal.done, choices.length, titleOn, closing, log, lineIdx, advance]);

  const hud = 'flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-white/70 transition hover:bg-white/15 hover:text-white';
  const hudProps = { tabIndex: -1, onMouseDown: (e: React.MouseEvent) => e.preventDefault() };
  const stop = (f: () => void) => (e: React.MouseEvent) => (e.stopPropagation(), f());

  return (
    <motion.div className={cn('fixed inset-0 z-[1000] overflow-hidden bg-black select-none', rm && 'cs-reduce')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.7 } }} transition={{ duration: 0.5 }} onClick={advance}>
      <div ref={cam} className="absolute inset-0">
        <SceneBackdrop bg={bg} cue={line.cue} />
        <Staging cur={st.cur} prev={st.prev} emotion={line.emotion} talking={reveal.talking && !titleOn} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <PostFX grain={grain} />

      <div className="absolute inset-x-0 z-10 flex flex-col items-center gap-7 px-4" style={{ bottom: `calc(${BAR} + 24px)` }}>
        <AnimatePresence>{showChoices && <ChoiceCards key={lineIdx} choices={choices} onPick={pick} onFlash={() => setFlash((n) => n + 1)} />}</AnimatePresence>
        {!titleOn && (
          <motion.div key={lineIdx} className="flex w-full justify-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Subtitles who={line.who} text={text} reveal={reveal} showPrompt={reveal.done && !choices.length && !closing} />
          </motion.div>
        )}
      </div>

      <motion.div className="absolute inset-x-0 top-0 z-20 origin-top bg-black" style={{ height: BAR }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      <motion.div className="absolute inset-x-0 bottom-0 z-20 origin-bottom bg-black" style={{ height: BAR }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      <motion.div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6" style={{ height: BAR }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        <div className="text-[11px] font-medium tracking-[0.22em] text-white/40 uppercase">{!titleOn && def.place}</div>
        <div className="flex items-center gap-2">
          <button {...hudProps} onClick={stop(() => useSettings.getState().set({ autoAdvance: !autoAdvance }))} className={cn(hud, autoAdvance && 'border-amber-200/50 bg-amber-200/15 text-amber-100')} aria-pressed={autoAdvance}>
            <PlayCircle size={14} /> Авто
          </button>
          <button {...hudProps} onClick={stop(openLog)} className={hud}>
            <BookOpen size={14} /> Журнал
          </button>
          <button {...hudProps} onClick={stop(skip)} className={hud}>
            <FastForward size={14} /> Пропустить
          </button>
        </div>
      </motion.div>

      <AnimatePresence>{titleOn && def.title && <TitleCard key="title" title={def.title} place={def.place} onDone={() => setTitleOn(false)} />}</AnimatePresence>
      <AnimatePresence>{log && <Backlog entries={log} onClose={() => setLog(null)} />}</AnimatePresence>
      {flash > 0 && <motion.div key={flash} className="pointer-events-none absolute inset-0 z-30 bg-white" initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.55 }} />}
    </motion.div>
  );
}
