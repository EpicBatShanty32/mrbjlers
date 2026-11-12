import type { AudioSnapshot } from './index';

/** Observable audio snapshot shared by all audio modules (useSyncExternalStore-friendly). */
let snap: AudioSnapshot = { unlocked: false, track: null, manual: false, paused: false, speaking: false, ambience: null };
const subs = new Set<() => void>();

export const getSnap = (): AudioSnapshot => snap;

export function patchSnap(p: Partial<AudioSnapshot>): void {
  const keys = Object.keys(p) as (keyof AudioSnapshot)[];
  if (!keys.some((k) => snap[k] !== p[k])) return;
  snap = { ...snap, ...p };
  subs.forEach((f) => f());
}

export function subscribeSnap(fn: () => void): () => void {
  subs.add(fn);
  return () => void subs.delete(fn);
}
