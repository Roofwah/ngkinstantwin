import { useEffect, useState } from 'react';

import {
  AUDI_VOUCHER_MIN,
  AUDI_VOUCHER_MAX,
  AUDI_VOUCHER_STEP,
} from '../campaigns/audi';

function parseTarget(value, min, max) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= min) {
    return Math.min(max, Math.round(parsed / AUDI_VOUCHER_STEP) * AUDI_VOUCHER_STEP);
  }
  return max;
}

export default function AudiVoucherCounter({
  value,
  min = AUDI_VOUCHER_MIN,
  max = AUDI_VOUCHER_MAX,
  duration = 3200,
}) {
  const target = parseTarget(value, min, max);
  const [display, setDisplay] = useState(min);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let frame;
    let delayTimer;
    let pulseTimer;

    delayTimer = setTimeout(() => {
      const start = performance.now();

      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) ** 3;
        const raw = min + (target - min) * eased;
        const stepped = Math.round(raw / AUDI_VOUCHER_STEP) * AUDI_VOUCHER_STEP;
        const next = progress >= 1 ? target : Math.min(target, Math.max(min, stepped));

        setDisplay((prev) => {
          if (next !== prev) {
            setPulse(true);
            clearTimeout(pulseTimer);
            pulseTimer = setTimeout(() => setPulse(false), 120);
          }
          return next;
        });

        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      }

      setDisplay(min);
      frame = requestAnimationFrame(tick);
    }, 400);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(pulseTimer);
      cancelAnimationFrame(frame);
    };
  }, [target, min, duration]);

  return (
    <div
      className={`audi-voucher-amount${pulse ? ' audi-voucher-amount--pulse' : ''}`}
      aria-live="polite"
      aria-label={`$${display} voucher`}
    >
      <span className="audi-voucher-amount__currency">$</span>
      <span className="audi-voucher-amount__value">{display.toLocaleString()}</span>
    </div>
  );
}
