import { useEffect, useState } from 'react';

import {
  POLARIS_CASHBACK_MIN,
  POLARIS_CASHBACK_MAX,
  POLARIS_CASHBACK_STEP,
} from '../campaigns/polaris';

function parseTarget(value, min, max) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= min) {
    return Math.min(max, Math.round(parsed / POLARIS_CASHBACK_STEP) * POLARIS_CASHBACK_STEP);
  }
  return max;
}

export default function PolarisCashbackCounter({
  value,
  min = POLARIS_CASHBACK_MIN,
  max = POLARIS_CASHBACK_MAX,
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
        const stepped = Math.round(raw / POLARIS_CASHBACK_STEP) * POLARIS_CASHBACK_STEP;
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
      className={`polaris-voucher-amount${pulse ? ' polaris-voucher-amount--pulse' : ''}`}
      aria-live="polite"
      aria-label={`$${display} cashback`}
    >
      <span className="polaris-voucher-amount__currency">$</span>
      <span className="polaris-voucher-amount__value">{display.toLocaleString()}</span>
    </div>
  );
}
