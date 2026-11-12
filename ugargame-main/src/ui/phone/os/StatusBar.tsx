import { Moon, Plane } from 'lucide-react';
import { useGame } from '../../../game/store';
import { useSettings } from '../../../game/settings';
import { clockStr } from '../../../game/util';
import { BatteryGlyph, SignalGlyph, WifiGlyph } from './kit';
import { DEVICES, useBattery, useOS, useTier } from './state';

/** iOS status bar; the middle gap leaves room for the notch / Dynamic Island. */
export function StatusBar({ light, carrier = false, hidden = false }: { light: boolean; carrier?: boolean; hidden?: boolean }) {
  const tier = useTier();
  const dev = DEVICES[tier];
  const now = useGame((s) => Math.floor(s.now));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const battery = useBattery();
  const dnd = useSettings((s) => s.dnd);
  const wifi = useOS((s) => s.wifi);
  const air = useOS((s) => s.air);
  const cell = useOS((s) => s.cell);
  const lowPower = useOS((s) => s.lowPower);
  const split = useOS((s) => s.split);
  const pad = { paddingTop: tier ? 4 : 1 };
  return (
    <div
      className="ios pointer-events-none absolute inset-x-0 top-0 z-[72] flex transition-[color,opacity] duration-300"
      style={{ height: dev.sb, color: light ? '#fff' : '#000', opacity: hidden ? 0 : 1 }}
    >
      <div className="flex flex-1 items-center justify-center gap-[5px] pl-[4%] text-[15.5px] font-semibold" style={pad}>
        {carrier ? <span className={'whitespace-nowrap ' + (tier ? 'text-[13.5px]' : 'text-[12px]')}>{air ? 'Авиарежим' : tier ? 'MTS RUS' : 'MTS'}</span> : <span className="tracking-[-0.02em]">{clockStr(now)}</span>}
        {dnd && <Moon size={13} fill="currentColor" strokeWidth={0} />}
      </div>
      <div className="shrink-0" style={{ width: tier === 0 ? '52%' : '34%' }} />
      <div className={'flex flex-1 items-center gap-[5px] ' + (split ? 'justify-end pr-[7%]' : 'justify-center pr-[4%]')} style={pad}>
        {!split && (air ? <Plane size={14} fill="currentColor" strokeWidth={0} /> : <SignalGlyph bars={!cell ? 0 : moscow ? 4 : 3} />)}
        {!split && !air && cell && !wifi && <span className="text-[12px] font-semibold">{dev.cell}</span>}
        {!split && wifi && <WifiGlyph />}
        <BatteryGlyph level={battery} power={lowPower} />
      </div>
    </div>
  );
}
