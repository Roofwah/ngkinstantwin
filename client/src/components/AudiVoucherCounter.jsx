import { useEffect, useState } from 'react';

import { AUDI_VOUCHER_MIN, AUDI_VOUCHER_MAX } from '../campaigns/audi';

export default function AudiVoucherCounter({
  value,
  min = AUDI_VOUCHER_MIN,
  max = AUDI_VOUCHER_MAX,
  duration = 2400,
}) {
  const target = Math.max(min, Math.min(max, Number(value) || max));
  const [display, setDisplay] = useState(min);

  useEffect(() => {
    let frame;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(min + (target - min) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    setDisplay(min);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, min, duration]);

  return (
    <div className="audi-voucher-amount" aria-live="polite" aria-label={`$${display} voucher`}>
      <span className="audi-voucher-amount__currency">$</span>
      <span className="audi-voucher-amount__value">{display.toLocaleString()}</span>
    </div>
  );
}
