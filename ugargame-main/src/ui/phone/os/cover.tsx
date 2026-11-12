import { memo } from 'react';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const hues = (id: string) => {
  const h = hash(id + '·ost');
  return { h, a: h % 360, b: (h % 360) + 50 + ((h >> 9) % 110), kind: (h >> 5) % 4 };
};
export const coverTint = (id: string) => `hsl(${hues(id).a} 85% 66%)`;

/** Procedural album art per track id. */
export const Cover = memo(function Cover({ id, size, radius = '16%', className = '' }: { id: string; size: number | string; radius?: string; className?: string }) {
  const { h, a, b, kind } = hues(id);
  const c1 = `hsl(${a} 72% 52%)`, c2 = `hsl(${b % 360} 70% 18%)`, c3 = `hsl(${(a + 180) % 360} 90% 72%)`;
  return (
    <div className={'relative shrink-0 overflow-hidden ' + className} style={{ width: size, height: size, borderRadius: radius, background: `linear-gradient(${h % 360}deg, ${c1}, ${c2})` }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
        {kind === 0 && [14, 24, 34, 44].map((r, i) => <circle key={r} cx="66" cy="38" r={r} stroke="#fff" strokeOpacity={0.5 - i * 0.1} strokeWidth="1.6" />)}
        {kind === 1 &&
          [0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M-5 ${48 + i * 9} C 20 ${36 + i * 9} 40 ${62 + i * 9} 60 ${48 + i * 9} S 90 ${38 + i * 9} 105 ${50 + i * 9}`} stroke={i % 2 ? c3 : '#fff'} strokeOpacity={0.65 - i * 0.08} strokeWidth="2" />
          ))}
        {kind === 2 && Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${i * 11 - 20} -5 L${i * 11 + 10} 105`} stroke="#fff" strokeOpacity={0.12 + (i % 3) * 0.1} strokeWidth={1 + (i % 2)} />)}
        {kind === 3 && (
          <>
            <circle cx="50" cy="58" r="24" fill={c3} fillOpacity=".85" />
            <rect x="0" y="66" width="100" height="34" fill={c2} fillOpacity=".9" />
            <path d="M0 66 H100" stroke="#fff" strokeOpacity=".6" />
          </>
        )}
      </svg>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.22), transparent 45%, rgba(0,0,0,.25))' }} />
    </div>
  );
});
