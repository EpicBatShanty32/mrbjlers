import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { audio } from '../../audio';
import { useGame } from '../../game/store';
import { useSettings } from '../../game/settings';
import { clamp } from '../../game/util';
import { cn } from '../common/kit';
import '../phone/os/os.css';
import { AppLayer } from '../phone/os/AppLayer';
import { Banner } from '../phone/os/Banner';
import { ControlCenter, NotificationCenter, TopZones } from '../phone/os/Centers';
import { Home } from '../phone/os/Home';
import { Island } from '../phone/os/Island';
import { LockScreen } from '../phone/os/LockScreen';
import { StatusBar } from '../phone/os/StatusBar';
import { Wallpaper } from '../phone/os/wallpapers';
import { CHROME, DEVICES, lightBottom, resetFace, showHud, unlock, useOS, useTier, type Device } from '../phone/os/state';

/** The smartphone: device frame per `hero.phoneTier` around an iOS-style shell. */
export default function Phone() {
  const tier = useTier();
  const dev = DEVICES[tier];
  const app = useGame((s) => s.ui.phoneApp);
  const locked = useGame((s) => s.ui.phoneLocked);
  const buzz = useGame((s) => s.ui.buzz);
  const reduce = useSettings((s) => s.reduceMotion);
  const bright = useSettings((s) => s.phoneBrightness);
  const wallpaper = useSettings((s) => s.phoneWallpaper);
  const cc = useOS((s) => s.cc);
  const nc = useOS((s) => s.nc);
  const aod = useOS((s) => s.aod);
  const torch = useOS((s) => s.torch);
  const screen = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(Date.now());
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!buzz) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 520);
    return () => clearTimeout(t);
  }, [buzz]);
  useEffect(() => {
    if (locked) resetFace();
    useOS.getState().set({ aod: false, cc: false, nc: false, island: '' });
  }, [locked]);
  // Auto-lock after inactivity; the Pro Max dims into Always-On while locked and idle.
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGame.getState(), o = useOS.getState();
      const idle = Date.now() - lastTouch.current;
      if (!s.ui.phoneLocked && idle > 150000 && !s.cutscene) s.phoneLock(true);
      else if (s.ui.phoneLocked && DEVICES[s.hero.phoneTier].aod && o.aodOn && !o.aod && !o.cc && o.face === 'idle' && idle > 15000) o.set({ aod: true });
    }, 2500);
    return () => clearInterval(id);
  }, []);
  const touch = () => {
    lastTouch.current = Date.now();
    if (useOS.getState().aod) useOS.getState().set({ aod: false });
  };

  const overlay = cc || nc || locked || !app;
  const light = overlay || CHROME[app].light;
  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
      <div className="flex h-full items-center justify-center">
        <div
          data-phone
          data-tier={tier}
          onPointerDownCapture={touch}
          className={cn('relative h-full select-none', shake && !reduce && 'os-buzz', reduce && 'os-reduce')}
          style={{ aspectRatio: String(dev.aspect), maxHeight: dev.maxH }}
        >
          <div className="pointer-events-none absolute -inset-20 transition-opacity duration-500" style={{ opacity: torch ? 1 : 0, background: 'radial-gradient(closest-side, rgba(255,247,220,.2), transparent)' }} />
          <SideButtons tier={tier} dev={dev} />
          <div
            className="absolute inset-0 z-10"
            style={{
              borderRadius: dev.screenR + dev.bezel + dev.frame,
              background: dev.metal,
              padding: dev.frame,
              boxShadow: '0 40px 70px -28px rgba(0,0,0,.92), 0 16px 30px -16px rgba(0,0,0,.7), inset 0 0 0 .5px rgba(255,255,255,.35), inset 0 1px 1.5px rgba(255,255,255,.5), inset 0 -1px 2px rgba(0,0,0,.45)',
            }}
          >
            <div className="h-full w-full bg-black" style={{ borderRadius: dev.screenR + dev.bezel, padding: dev.bezel, boxShadow: 'inset 0 0 0 1px #000, inset 0 0 0 2px rgba(255,255,255,.05)' }}>
              <div ref={screen} className="os-screen relative h-full w-full overflow-hidden bg-black" style={{ borderRadius: dev.screenR }}>
                <Wallpaper id={wallpaper} />
                <Home />
                <AppLayer app={app} screen={screen} />
                <AnimatePresence>{locked && <LockScreen key="lock" />}</AnimatePresence>
                <StatusBar light={light} carrier={locked || cc} hidden={aod} />
                <TopZones />
                <Island />
                <Banner />
                <NotificationCenter />
                <ControlCenter />
                <Hud tier={tier} />
                <HomeIndicator dark={!overlay && lightBottom(app)} visible={!!app || locked || cc || nc} />
                {tier === 0 && <Crack />}
                <div className="pointer-events-none absolute inset-0 z-[86]" style={{ background: 'linear-gradient(118deg, rgba(255,255,255,.075) 0%, rgba(255,255,255,.02) 24%, transparent 40%)' }} />
                <div className="pointer-events-none absolute inset-0 z-[90] bg-black transition-opacity duration-300" style={{ opacity: (1 - clamp(bright, 0.35, 1)) * 0.85 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function HomeIndicator({ dark, visible }: { dark: boolean; visible: boolean }) {
  const y0 = useRef<number | null>(null);
  const go = () => {
    y0.current = null;
    const s = useGame.getState(), o = useOS.getState();
    if (o.cc || o.nc) return o.set({ cc: false, nc: false });
    if (s.ui.phoneLocked) return unlock();
    audio.sfx('phone_home');
    s.phoneOpen(null);
  };
  return (
    <button
      type="button"
      title="Домой"
      className="absolute bottom-0 left-1/2 z-[75] flex h-[22px] w-[46%] -translate-x-1/2 touch-none items-center justify-center"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity .3s' }}
      onPointerDown={(e) => {
        y0.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => y0.current !== null && y0.current - e.clientY > 16 && go()}
      onClick={() => y0.current !== null && go()}
    >
      <span className="h-[5px] w-[36%] min-w-[104px] rounded-full transition-colors duration-300" style={{ background: dark ? 'rgba(0,0,0,.82)' : 'rgba(255,255,255,.88)' }} />
    </button>
  );
}

/** Hardware buttons: silent switch / Action button, volume, side (lock), Camera Control on the Pro Max. */
function SideButtons({ tier, dev }: { tier: number; dev: Device }) {
  const vol = (d: number) => {
    const st = useSettings.getState();
    st.set({ master: clamp(Math.round((st.master + d) * 16) / 16, 0, 1), muted: false });
    showHud('volume');
  };
  const silent = () => {
    const st = useSettings.getState();
    st.set({ muted: !st.muted });
    showHud('silent');
  };
  const power = () => {
    const s = useGame.getState(), o = useOS.getState();
    if (!s.ui.phoneLocked) return s.phoneLock(true);
    if (o.aod) o.set({ aod: false });
    else if (dev.aod && o.aodOn) o.set({ aod: true });
  };
  const btn = (key: string, side: 'left' | 'right', top: string, h: string, title: string, onClick: () => void) => (
    <button
      key={key}
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        audio.sfx('ui_click', { volume: 0.5 });
        onClick();
      }}
      className="absolute z-0 w-[6px] transition-transform active:scale-x-50"
      style={{ [side]: -4, top, height: h, background: dev.button, borderRadius: side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0', boxShadow: 'inset 0 1px 1px rgba(255,255,255,.35), inset 0 -1px 1px rgba(0,0,0,.35)' }}
    />
  );
  return (
    <>
      {btn('act', 'left', '17%', tier === 0 ? '3.4%' : '4.4%', tier === 0 ? 'Переключатель «Звонок/Бесшумно»' : 'Кнопка действия: бесшумный режим', silent)}
      {btn('up', 'left', '24.5%', '7.4%', 'Громкость +', () => vol(1 / 16))}
      {btn('down', 'left', '33.6%', '7.4%', 'Громкость −', () => vol(-1 / 16))}
      {btn('side', 'right', '27%', '11%', 'Боковая кнопка (блокировка)', power)}
      {tier === 2 && btn('cam', 'right', '58%', '7%', 'Управление камерой', () => audio.sfx('shutter'))}
    </>
  );
}

/** Volume slider by the buttons (iOS 26) and the silent-mode pill on the notch iPhone. */
function Hud({ tier }: { tier: number }) {
  const hud = useOS((s) => s.hud);
  const muted = useSettings((s) => s.muted);
  const v = useSettings((s) => (s.muted ? 0 : s.master));
  return (
    <AnimatePresence>
      {hud?.kind === 'volume' && (
        <motion.div key="vol" className="lg absolute top-[22%] left-[2.4cqw] z-[78] h-[26%] w-[10cqw] overflow-hidden rounded-full" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
          <div className="absolute inset-x-0 bottom-0 bg-white transition-[height] duration-150" style={{ height: `${v * 100}%` }} />
          <span className="absolute inset-x-0 bottom-[2.6cqw] flex justify-center" style={{ color: v > 0.12 ? '#555' : '#fff' }}>{v > 0 ? <Volume2 size={15} fill="currentColor" /> : <VolumeX size={15} />}</span>
        </motion.div>
      )}
      {hud?.kind === 'silent' && tier === 0 && (
        <motion.div key="silent" className="ios lg-dark absolute inset-x-0 top-[34px] z-[78] mx-auto flex w-max items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
          {muted ? <BellOff size={15} className="text-[#FF453A]" /> : <Bell size={15} />}
          {muted ? 'Бесшумный режим' : 'Звонок'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hairline crack spreading from an impact near the bottom-right corner (used iPhone 11).
const CRACK = (() => {
  let seed = 11;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ox = 336, oy = 776;
  const rays: number[][][] = [];
  let d = '';
  for (let i = 0; i < 10; i++) {
    let a = Math.PI * (0.94 + (i / 9) * 0.72) + (r() - 0.5) * 0.2;
    let x = ox, y = oy;
    const pts = [[x, y]];
    const len = i === 4 ? 190 : 40 + r() * 110;
    for (let l = 0; l < len; ) {
      const s = 10 + r() * 24;
      a += (r() - 0.5) * 0.5;
      x += Math.cos(a) * s;
      y += Math.sin(a) * s;
      l += s;
      pts.push([x, y]);
    }
    rays.push(pts);
    d += `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} `;
    if (pts.length > 3 && r() < 0.6) {
      let [bx, by] = pts[2];
      let ba = a + (r() < 0.5 ? 0.9 : -0.9);
      d += `M${bx.toFixed(1)} ${by.toFixed(1)} `;
      for (let k = 0; k < 3; k++) {
        ba += (r() - 0.5) * 0.4;
        bx += Math.cos(ba) * (8 + r() * 14);
        by += Math.sin(ba) * (8 + r() * 14);
        d += `L${bx.toFixed(1)} ${by.toFixed(1)} `;
      }
    }
  }
  for (const k of [1, 2]) d += `M${rays.filter((p) => p[k]).map((p) => `${p[k][0].toFixed(1)} ${p[k][1].toFixed(1)}`).join(' L')} `;
  return d;
})();

function Crack() {
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[85] h-full w-full" fill="none">
      <path d={CRACK} stroke="rgba(0,0,0,.4)" strokeWidth="1.5" transform="translate(.7 .7)" />
      <path d={CRACK} stroke="rgba(255,255,255,.62)" strokeWidth=".75" />
      <circle cx="336" cy="776" r="4" fill="rgba(255,255,255,.3)" />
    </svg>
  );
}
