import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { Cloud, CloudRain, Lightbulb, Music2, Navigation, Search, Smartphone } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { BankId, PhoneAppId } from '../../../game/types';
import { fmtRub } from '../../../game/util';
import { useSize } from '../../common/hooks';
import { cn } from '../../common/kit';
import { Cover } from './cover';
import { APP_NAMES, AppIcon, IconArt } from './icons';
import { useNowPlaying } from './Island';
import { DEVICES, calendar, homeScale, useBattery, useTier, weatherOf } from './state';

export function useBadges(): Record<PhoneAppId, number> {
  const tg = useGame((s) => Object.values(s.tg).reduce((a, c) => a + (c.visible ? c.unread : 0), 0));
  const avito = useGame((s) => s.avito.chats.reduce((a, c) => a + c.unread, 0));
  const sms = useGame((s) => s.sms.filter((m) => !m.read).length);
  const notif = useGame((s) => JSON.stringify(['sber', 'tbank', 'alfa', 'wallet'].map((a) => s.notifications.filter((n) => n.app === a && !n.read).length)));
  const [sber, tbank, alfa, wallet] = JSON.parse(notif) as number[];
  return { sber, tbank, alfa, wallet, telegram: tg, avito, auth: sms, settings: 0, music: 0 };
}

// Clicks right after a page swipe must not launch apps.
let swipedAt = 0;
const launch = (id: PhoneAppId) => () => {
  if (Date.now() - swipedAt > 120) useGame.getState().phoneOpen(id);
};
const DOCK: PhoneAppId[] = ['telegram', 'auth', 'music', 'settings'];
const BANK_SHORT: Record<BankId, string> = { sber: 'Сбер', tbank: 'Т-Банк', alfa: 'Альфа' };
const PAGES = 2;
const spring = { type: 'spring', stiffness: 300, damping: 34 } as const;

export function Home() {
  const tier = useTier();
  const walletOn = useGame((s) => s.wallet.unlocked);
  const badges = useBadges();
  const [ref, size] = useSize<HTMLDivElement>();
  const x = useMotionValue(0);
  const [page, setPage] = useState(0);
  const go = (p: number) => {
    setPage(p);
    animate(x, -p * size.w, spring);
  };
  useEffect(() => x.set(-page * size.w), [size.w]); // eslint-disable-line react-hooks/exhaustive-deps
  const icon = (id: PhoneAppId) => (
    <button key={id} type="button" onClick={launch(id)} className="flex flex-col items-center gap-[1.3cqw] transition-[filter] active:brightness-75">
      <AppIcon id={id} size="15.8cqw" badge={badges[id]} launch />
      <span className="ios-label max-w-full truncate text-[3cqw] font-medium text-white">{APP_NAMES[id]}</span>
    </button>
  );
  return (
    <motion.div className="ios absolute inset-0" style={{ scale: homeScale }}>
      <div ref={ref} className="absolute inset-x-0 overflow-hidden" style={{ top: DEVICES[tier].sb + 6, bottom: '36cqw' }}>
        <motion.div
          className="flex h-full"
          style={{ x, width: `${PAGES * 100}%` }}
          drag="x"
          dragConstraints={{ left: -(PAGES - 1) * size.w, right: 0 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => (swipedAt = Date.now() + 1e6)}
          onDragEnd={(_, i) => {
            swipedAt = Date.now();
            go(Math.max(0, Math.min(PAGES - 1, Math.round((-x.get() - i.velocity.x * 0.25) / Math.max(1, size.w)))));
          }}
        >
          <Page>
            <BalanceWidget />
            <WeatherWidget />
            {(['sber', 'tbank', 'alfa', 'avito'] as PhoneAppId[]).map(icon)}
            {walletOn && icon('wallet')}
            <CalendarWidget />
          </Page>
          <Page>
            <TipsWidget />
            <BatteryWidget />
            <MusicWidget />
          </Page>
        </motion.div>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: '28.6cqw' }}>
        <div className="lg-btn flex items-center gap-[1.8cqw] rounded-full px-[3.2cqw] py-[1.5cqw]">
          <Search size={12} className="text-white/85" strokeWidth={2.6} />
          {Array.from({ length: PAGES }, (_, i) => (
            <button key={i} type="button" onClick={() => go(i)} className={cn('h-[1.9cqw] w-[1.9cqw] rounded-full transition-colors', i === page ? 'bg-white' : 'bg-white/35')} />
          ))}
        </div>
      </div>
      <div className="lg absolute inset-x-[2.6cqw] bottom-[2.6cqw] flex h-[23.5cqw] items-center justify-around rounded-[9.4cqw] px-[2cqw]">
        {DOCK.map((id) => (
          <button key={id} type="button" onClick={launch(id)} className="transition-[filter] active:brightness-75">
            <AppIcon id={id} size="15.8cqw" badge={badges[id]} launch />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-full content-start px-[5.5cqw]" style={{ width: `${100 / PAGES}%`, gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '23.6cqw', gridAutoFlow: 'row dense' }}>
      {children}
    </div>
  );
}

/** Small (2×2) or medium (4×2) widget aligned to the icon grid. */
function Widget({ wide = false, className, style, onClick, children }: { wide?: boolean; className?: string; style?: CSSProperties; onClick?: () => void; children: ReactNode }) {
  return (
    <div className="flex justify-center" style={{ gridColumn: `span ${wide ? 4 : 2}`, gridRow: 'span 2' }}>
      <div
        role={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn('relative overflow-hidden rounded-[6.2cqw] text-left text-white transition-[filter]', onClick && 'cursor-pointer active:brightness-90', className)}
        style={{ width: wide ? '82.6cqw' : '38.4cqw', height: '39.4cqw', ...style }}
      >
        {children}
      </div>
    </div>
  );
}

function BalanceWidget() {
  const json = useGame((s) => JSON.stringify((['sber', 'tbank', 'alfa'] as BankId[]).filter((b) => s.banks[b].opened).map((b) => [b, Math.round(s.banks[b].balance)])));
  const list = useMemo(() => JSON.parse(json) as [BankId, number][], [json]);
  const total = list.reduce((a, [, v]) => a + v, 0);
  return (
    <Widget className="lg-dark p-[3.6cqw]" onClick={list[0] ? launch(list[0][0]) : undefined}>
      <div className="flex items-center gap-[1.6cqw] text-[3.1cqw] font-semibold text-white/70">
        <span className="flex h-[4.8cqw] w-[4.8cqw] items-center justify-center rounded-full bg-[#30D158] text-[3cqw] font-bold text-black">₽</span>
        Баланс
      </div>
      <div className="num mt-[1.4cqw] truncate font-semibold tracking-[-0.02em]" style={{ fontSize: total >= 1e6 ? '5.3cqw' : '6.3cqw' }}>
        {fmtRub(total)}
      </div>
      <div className="mt-[1.8cqw] space-y-[1.2cqw]">
        {list.length ? (
          list.map(([b, v]) => (
            <div key={b} className="flex items-center gap-[1.6cqw] text-[3.1cqw]">
              <span className="h-[4.6cqw] w-[4.6cqw] shrink-0 overflow-hidden rounded-[1.2cqw]"><IconArt id={b} /></span>
              <span className="truncate text-white/60">{BANK_SHORT[b]}</span>
              <span className="num ml-auto shrink-0 text-white/90">{fmtRub(v)}</span>
            </div>
          ))
        ) : (
          <div className="text-[3.1cqw] text-white/55">Счета ещё не открыты</div>
        )}
      </div>
    </Widget>
  );
}

function WeatherWidget() {
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const w = weatherOf(moscow);
  return (
    <Widget className="p-[3.6cqw]" style={{ background: w.rain ? 'linear-gradient(180deg,#4d5d78 0%,#222b3b 100%)' : 'linear-gradient(180deg,#5373a0 0%,#2a3d5a 100%)' }}>
      <div className="flex items-center gap-1 text-[3.6cqw] font-semibold">
        {w.city}
        <Navigation size={9} fill="#fff" strokeWidth={0} />
      </div>
      <div className="text-[11.5cqw] leading-none font-light tracking-[-0.04em]">{w.t}°</div>
      <div className="absolute inset-x-[3.6cqw] bottom-[3.2cqw]">
        {w.rain ? <CloudRain size={16} /> : <Cloud size={16} fill="#fff" />}
        <div className="mt-[0.8cqw] text-[3.2cqw] font-semibold">{w.cond}</div>
        <div className="text-[3cqw] text-white/80">Макс.: {w.hi}°, мин.: {w.lo}°</div>
      </div>
    </Widget>
  );
}

function AnalogClock({ h, m }: { h: number; m: number }) {
  return (
    <svg viewBox="0 0 100 100" className="h-[31cqw] w-[31cqw]">
      <circle cx="50" cy="50" r="48" fill="#fff" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="50" y1="6" x2="50" y2={i % 3 ? 10 : 12.5} stroke={i % 3 ? '#a1a1a6' : '#1c1c1e'} strokeWidth={i % 3 ? 1.6 : 2.6} strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
      ))}
      {[[12, 50, 25], [3, 77, 51.5], [6, 50, 79], [9, 23, 51.5]].map(([n, x, y]) => (
        <text key={n} x={x} y={y} dy=".35em" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1c1c1e" fontFamily="-apple-system, system-ui, sans-serif">{n}</text>
      ))}
      <line x1="50" y1="50" x2="50" y2="28" stroke="#1c1c1e" strokeWidth="4.2" strokeLinecap="round" transform={`rotate(${(h % 12) * 30 + m * 0.5} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="14" stroke="#1c1c1e" strokeWidth="2.8" strokeLinecap="round" transform={`rotate(${m * 6} 50 50)`} />
      <circle cx="50" cy="50" r="3.3" fill="#FF9F0A" stroke="#1c1c1e" strokeWidth="1.2" />
    </svg>
  );
}

function CalendarWidget() {
  const now = useGame((s) => Math.floor(s.now));
  const chapter = useGame((s) => s.chapter);
  const c = calendar(now);
  return (
    <Widget wide className="lg-dark flex p-[3.8cqw]">
      <div className="flex w-[46%] flex-col">
        <div className="text-[3.2cqw] font-bold tracking-wide text-[#FF453A] uppercase">{c.wd}</div>
        <div className="text-[13cqw] leading-[1.05] font-light tracking-[-0.03em]">{c.day}</div>
        <div className="mt-auto flex gap-[1.8cqw]">
          <span className="w-[0.9cqw] rounded-full bg-[#30D158]" />
          <div className="min-w-0">
            <div className="truncate text-[3.3cqw] font-semibold">Глава {chapter}</div>
            <div className="truncate text-[2.9cqw] text-white/55">{c.monthNom}, {c.year}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <AnalogClock h={c.h} m={c.m} />
      </div>
    </Widget>
  );
}

function TipsWidget() {
  return (
    <Widget wide className="lg-dark p-[3.8cqw]">
      <div className="flex items-center gap-[2cqw]">
        <span className="flex h-[7cqw] w-[7cqw] items-center justify-center rounded-[2cqw] bg-[#FFD60A] text-black"><Lightbulb size={15} /></span>
        <span className="text-[3.6cqw] font-semibold">Советы</span>
      </div>
      <div className="mt-[2.6cqw] text-[3.8cqw] font-semibold">Общий буфер обмена</div>
      <div className="mt-[1cqw] text-[3.4cqw] leading-snug text-white/75">
        Копируйте реквизиты на компьютере — они попадают в общий буфер. В банке на телефоне жмите «Вставить из буфера».
      </div>
    </Widget>
  );
}

function BatteryWidget() {
  const b = useBattery();
  const tier = useTier();
  const c = b <= 20 ? '#FF453A' : '#30D158';
  return (
    <Widget className="lg-dark flex flex-col items-center justify-center" onClick={launch('settings')}>
      <div className="relative h-[21cqw] w-[21cqw]">
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" fill="none">
          <circle cx="20" cy="20" r="17" stroke="rgba(255,255,255,.14)" strokeWidth="3.4" />
          <circle cx="20" cy="20" r="17" stroke={c} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${(b / 100) * 106.8} 200`} />
        </svg>
        <Smartphone className="absolute inset-0 m-auto" size={22} />
      </div>
      <div className="num mt-[2cqw] text-[5.4cqw] font-semibold">{b}%</div>
      <div className="text-[3cqw] text-white/55">{DEVICES[tier].model}</div>
    </Widget>
  );
}

function MusicWidget() {
  const { info, playing, snap } = useNowPlaying();
  return (
    <Widget className="p-[3.6cqw]" style={{ background: 'linear-gradient(180deg,#43202f,#170a10)' }} onClick={launch('music')}>
      {info ? <Cover id={info.id} size="17cqw" radius="18%" /> : <div className="flex h-[17cqw] w-[17cqw] items-center justify-center rounded-[3cqw] bg-white/10"><Music2 size={20} /></div>}
      <div className="absolute inset-x-[3.6cqw] bottom-[3.2cqw]">
        <div className="text-[2.8cqw] font-bold tracking-wide text-[#FF6482] uppercase">{playing ? 'Сейчас играет' : 'Музыка'}</div>
        <div className="truncate text-[3.6cqw] font-semibold">{info?.title ?? 'Не исполняется'}</div>
        <div className="truncate text-[3.1cqw] text-white/60">{info ? (snap.manual ? info.mood : 'Адаптивный саундтрек') : 'Откройте «Музыку»'}</div>
      </div>
    </Widget>
  );
}
