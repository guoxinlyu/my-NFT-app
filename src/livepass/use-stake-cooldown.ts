import { useEffect, useRef, useState } from 'react';
import { useLivePass } from './context';

export function useStakeCooldown(enabled = true) {
  const shop = useLivePass();
  const active = enabled && shop.identity !== null && shop.stake > 0n;
  const key = [shop.identity, shop.stakeSince, shop.cooldown, shop.timestamp].join(':');
  const [clock, setClock] = useState({ key, elapsed: 0n });
  const refreshed = useRef('');
  useEffect(() => {
    const started = Date.now();
    setClock({ key, elapsed: 0n });
    if (!active) return;
    const tick = () => setClock({ key, elapsed: BigInt(Math.floor((Date.now() - started) / 1000)) });
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [key, active]);
  const chainRemaining = active ? shop.stakeSince + shop.cooldown - shop.timestamp : 0n;
  const estimate = chainRemaining - (clock.key === key ? clock.elapsed : 0n);
  const remaining = estimate > 0n ? estimate : 0n;
  useEffect(() => {
    if (active && remaining === 0n && chainRemaining > 0n && refreshed.current !== key) {
      refreshed.current = key;
      void shop.reload();
    }
  }, [active, remaining, chainRemaining, key, shop.reload]);
  return { remaining, chainReady: chainRemaining <= 0n,
    label: `${(remaining / 60n).toString().padStart(2, '0')}:${(remaining % 60n).toString().padStart(2, '0')}` };
}
