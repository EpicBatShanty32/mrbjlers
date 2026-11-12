import type { CSSProperties } from 'react';
import { Fog, Glow, Layer, Rain, Svg, px, py, rng } from '../fx';
import { Blurs, Grad, PanelBlock, Sky, Skyline } from './parts';

const RIPPLES = (() => {
  const R = rng(9);
  return Array.from({ length: 16 }, () => ({ x: 120 + R() * 1380, y: 745 + R() * 140, w: 26 + R() * 44, d: (R() * 1.6).toFixed(2), t: (1.2 + R() * 0.9).toFixed(2) }));
})();

const BODY = 'M828 730V654Q828 640 842 638L854 600Q856 594 864 594H1072Q1082 594 1086 602L1104 642L1160 646Q1174 648 1174 662L1176 724Q1176 736 1164 736H840Q828 736 828 730Z';

/** Чёрный внедорожник: headlights flash on mount, drives off on the `suv_leave` cue. */
function Suv() {
  return (
    <g>
      <defs>
        <Grad id="rs-suv" stops={[[0, '#262c38'], [0.3, '#0f1218'], [1, '#040506']]} />
        <Grad id="rs-glass" stops={[[0, '#3a4356'], [1, '#06080c']]} />
        <linearGradient id="rs-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(225,238,255,.55)" />
          <stop offset="1" stopColor="rgba(225,238,255,0)" />
        </linearGradient>
      </defs>
      <ellipse cx={1000} cy={742} rx={205} ry={13} fill="#000" opacity={0.8} />
      <g filter="url(#b7)">
        <rect x={824} y={744} width={12} height={130} fill="#ff2d2d" opacity={0.55} />
        <rect x={1160} y={744} width={18} height={150} fill="#e6f0ff" opacity={0.45} />
        <rect x={860} y={744} width={300} height={60} fill="#0a0d14" opacity={0.8} />
      </g>
      <path d="M856 736A44 44 0 0 1 944 736ZM1056 736A44 44 0 0 1 1144 736Z" fill="#020203" />
      <path d={BODY} fill="url(#rs-suv)" />
      <path d="M866 604H1066L1084 640H860Z" fill="url(#rs-glass)" />
      <path d="M1000 606L1040 606L1010 638L972 638Z" fill="#ffcf87" opacity={0.12} />
      <path d="M948 604V640M1028 604V640" stroke="#05060a" strokeWidth={7} />
      <path d="M950 644V728M1032 644V728" stroke="#000" strokeOpacity={0.75} strokeWidth={2} />
      <path d="M862 596H1070M1088 606L1104 642" stroke="#ffcf87" strokeOpacity={0.55} strokeWidth={2} />
      <path d="M834 648L1170 652" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} />
      <rect x={906} y={662} width={20} height={4} rx={2} fill="#2c323e" />
      <rect x={986} y={662} width={20} height={4} rx={2} fill="#2c323e" />
      {[900, 1100].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={736} r={35} fill="#060709" />
          <circle cx={cx} cy={736} r={19} fill="#151820" stroke="#2c313b" strokeWidth={2} />
          <path d={`M${cx - 27} 718A31 31 0 0 1 ${cx + 22} 710`} stroke="#ffcf87" strokeOpacity={0.3} strokeWidth={2} fill="none" />
        </g>
      ))}
      <ellipse cx={822} cy={684} rx={9} ry={30} fill="#0a0c10" stroke="#1f242d" strokeWidth={2} />
      <rect x={828} y={650} width={7} height={30} rx={2} fill="#ff3434" />
      <ellipse cx={832} cy={665} rx={26} ry={34} fill="#ff1f1f" opacity={0.55} filter="url(#b7)" />
      <g className="cs-headlights">
        <polygon points="1174,654 1174,678 1720,820 1720,540" fill="url(#rs-beam)" filter="url(#b12)" opacity={0.8} />
        <ellipse cx={1170} cy={666} rx={34} ry={24} fill="#dfeaff" opacity={0.65} filter="url(#b7)" />
        <circle cx={1170} cy={666} r={7} fill="#f6f9ff" />
        <rect x={1160} y={700} width={12} height={6} rx={2} fill="#ffe7b0" />
      </g>
    </g>
  );
}

/** Новозаровск, вечер, дождь: хрущёвка, фонарь, внедорожник, мокрый асфальт. */
export function RainStreet({ cue }: { cue?: string }) {
  const cone = `polygon(${px(1206)} ${py(308)}, ${px(1230)} ${py(308)}, ${px(1430)} ${py(800)}, ${px(1000)} ${py(800)})`;
  return (
    <>
      <Layer d={0.05}>
        <Svg>
          <Blurs />
          <Sky id="rs-sky" stops={[[0, '#03050a'], [0.4, '#0a1120'], [0.72, '#161d33'], [1, '#2b2433']]} />
          <ellipse cx={1150} cy={600} rx={760} ry={220} fill="#ff8f3f" opacity={0.13} filter="url(#b22)" />
          <g fill="#1a2234" filter="url(#b12)" opacity={0.85}>
            <ellipse cx={300} cy={120} rx={420} ry={70} />
            <ellipse cx={1100} cy={80} rx={520} ry={80} />
            <ellipse cx={800} cy={230} rx={380} ry={50} opacity={0.6} />
          </g>
          <g filter="url(#b2)" opacity={0.9}>
            <Skyline seed={4} base={660} h={[110, 250]} w={[110, 200]} fill="#0d121d" win={['#ffcf87', '#ffb766', '#9ec1ff']} litP={0.1} cell={[5, 6, 14, 18]} />
          </g>
        </Svg>
        <div className="cs-lightning absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(185,205,255,.5), transparent 65%)' }} />
      </Layer>

      <Layer d={0.3}>
        <Svg>
          <Blurs />
          <defs><Grad id="rs-wall" stops={[[0, '#1d2331'], [1, '#11151e']]} /></defs>
          <path d="M260 200V150M240 160H280M245 172H275M720 200V136M700 148H740M705 162H735M980 200V160M965 170H995" stroke="#0b0e15" strokeWidth={3} />
          <PanelBlock x={110} y={200} w={980} cols={12} seed={21} fill="url(#rs-wall)" balconies={[1, 4, 8, 11]} door={6} flicker={0.18} litP={0.36} />
          <rect x={600} y={590} width={110} height={92} fill="#07090d" />
          <rect x={614} y={606} width={44} height={76} fill="#0c0f15" stroke="#1d222d" />
          <rect x={590} y={582} width={132} height={13} fill="#232a38" />
          <rect x={590} y={595} width={132} height={3} fill="#ffcf87" opacity={0.4} />
          <circle cx={656} cy={604} r={4} fill="#fff1c9" />
          <g fill="#040507" stroke="#ffcf87" strokeOpacity={0.4} strokeWidth={1.2}>
            <path d="M672 634Q682 626 692 634L697 670H667Z" />
            <path d="M675 668h5v16h-5zM685 668h5v16h-5z" />
            <circle cx={682} cy={620} r={7.5} />
            <path d="M673 621Q682 604 691 621L694 640H670Z" />
          </g>
          <g fill="#070a10">
            <path d="M1112 690L1120 420H1130L1138 690Z" fill="#2f353f" />
            <ellipse cx={1126} cy={400} rx={92} ry={120} />
            <ellipse cx={1074} cy={474} rx={60} ry={82} />
            <ellipse cx={1182} cy={464} rx={62} ry={92} />
            <path d="M110 690Q140 650 170 690Q200 654 230 690Q260 650 290 690ZM860 690Q890 652 920 690Q950 656 980 690Q1010 650 1040 690Z" />
          </g>
        </Svg>
      </Layer>

      <Layer d={0.55}>
        <Svg>
          <Blurs />
          <defs>
            <Grad id="rs-road" stops={[[0, '#151a24'], [0.25, '#0b0f16'], [1, '#040508']]} />
            <Grad id="rs-cone" stops={[[0, 'rgba(255,205,130,.45)'], [1, 'rgba(255,205,130,0)']]} />
          </defs>
          <rect y={682} width={1600} height={218} fill="url(#rs-road)" />
          <rect y={682} width={1600} height={26} fill="#11151e" />
          <rect y={706} width={1600} height={3} fill="#2b313d" />
          <g filter="url(#b12)">
            <rect x={1186} y={712} width={50} height={190} fill="#ffc98a" opacity={0.5} />
            <ellipse cx={1215} cy={792} rx={250} ry={42} fill="#ffbf7a" opacity={0.3} />
            <rect x={640} y={712} width={24} height={110} fill="#ffe6b0" opacity={0.32} />
            {[230, 395, 480, 790, 1000].map((x, i) => <rect key={x} x={x} y={712} width={14} height={90 + i * 9} fill={i === 3 ? '#a8c6ff' : '#ffcf87'} opacity={0.16} />)}
          </g>
          <ellipse cx={420} cy={800} rx={170} ry={18} fill="#1a2233" opacity={0.75} />
          <ellipse cx={1010} cy={856} rx={240} ry={22} fill="#1d2536" opacity={0.6} />
          <path d="M300 800h240M840 856h300" stroke="#8b9ab5" strokeOpacity={0.16} strokeWidth={2} />
          <path d="M1286 880V300Q1286 282 1268 282H1232" stroke="#0c0f15" strokeWidth={10} fill="none" />
          <path d="M1196 296h44l-6 12h-32z" fill="#161b25" />
          <polygon points="1206,308 1230,308 1430,800 1000,800" fill="url(#rs-cone)" />
        </Svg>
        <Glow x={1218} y={306} w={200} color="rgba(255,214,150,.85)" className="cs-glow" />
        <Glow x={1218} y={306} w={34} color="#fff6e0" />
        <Glow x={656} y={606} w={120} color="rgba(255,214,150,.7)" className="cs-flicker" style={{ '--fd': '9s' } as CSSProperties} />
        <div className="absolute inset-0" style={{ clipPath: cone, maskImage: 'linear-gradient(180deg, transparent 32%, #000 40%, #000 76%, transparent 90%)' }}>
          <Rain color="#ffdcaa" depth={[0, 1]} />
        </div>
        {RIPPLES.map((r, i) => (
          <div key={i} className="cs-ripple absolute rounded-[50%] border border-[#a9bddc]/40" style={{ left: px(r.x), top: py(r.y), width: px(r.w), height: py(r.w * 0.24), animationDelay: `${r.d}s`, animationDuration: `${r.t}s` }} />
        ))}
        <div className={cue === 'suv_leave' ? 'cs-drive absolute inset-0' : 'absolute inset-0'}>
          <Svg><Blurs /><Suv /></Svg>
        </div>
      </Layer>

      <Fog y={700} h={210} color="rgba(140,160,190,.13)" />
      <Rain />
      <Layer d={0.9}>
        <Svg>
          <Blurs />
          <g filter="url(#b7)" fill="#020305">
            <path d="M-30 900V0H52Q40 300 66 900Z" />
            <path d="M30 130Q200 60 360-20H430Q260 96 50 180Z" />
            <ellipse cx={300} cy={6} rx={230} ry={72} />
            <ellipse cx={1570} cy={890} rx={270} ry={90} />
          </g>
        </Svg>
      </Layer>
    </>
  );
}
