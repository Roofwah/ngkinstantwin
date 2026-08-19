import { useEffect, useMemo, useState } from 'react';
import { formatAccessPointLabel } from './accessPointLabel';

function stageIndex(stages, stageId) {
  return stages.findIndex((s) => s.id === stageId);
}

function formatClock(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatLapsed(ms) {
  if (ms == null || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `+${sec}s`;
  return `+${min}:${String(sec).padStart(2, '0')}`;
}

function eventMap(events = []) {
  const map = new Map();
  for (const event of events) {
    map.set(event.stage, event);
  }
  return map;
}

function stageDetail(stageId, { event, session, config, lapsedMs }) {
  const lapsed = formatLapsed(lapsedMs);
  const rules = session?.rules;

  switch (stageId) {
    case 'qualifying_purchase':
      if (rules?.minSpend) return `Min spend $${rules.minSpend}`;
      return config?.eligibleBrands?.join(' · ') || null;

    case 'access_point': {
      if (!event) return null;
      const label = session?.accessPointLabel
        || formatAccessPointLabel({
          storeId: session?.storeId || config?.accessPoint?.storeId,
          storeLocation: session?.storeLocation || config?.accessPoint?.location,
          accessPointId: session?.accessPointId || config?.accessPointId,
        });
      if (!label && !lapsed) return null;
      return [label, lapsed].filter(Boolean).join(' · ') || null;
    }

    case 'entry_opened': {
      const parts = [];
      const clock = formatClock(event?.at);
      if (clock) parts.push(clock);
      if (lapsed) parts.push(lapsed);
      if (session?.customerName) parts.push(session.customerName);
      if (session?.mobileMasked) parts.push(session.mobileMasked);
      return parts.length ? parts.join(' · ') : null;
    }

    case 'otp_sent':
      return lapsed || null;

    case 'customer_verified':
      return lapsed || null;

    case 'receipt_received': {
      const parts = [];
      if (lapsed) parts.push(lapsed);
      if (event?.receiptSource) parts.push(event.receiptSource);
      return parts.length ? parts.join(' · ') : null;
    }

    case 'reading_receipt':
    case 'purchase_validated':
    case 'submitting':
    case 'checking_instant_win':
    case 'prize_allocated':
    case 'reporting':
      return lapsed || null;

    case 'instant_win_outcome': {
      const parts = [];
      if (lapsed) parts.push(lapsed);
      if (session?.isWinner && session?.prizeName) parts.push(session.prizeName);
      else if (session?.result === 'NOT_WINNER') parts.push('No instant win');
      else if (session?.result) parts.push(session.result.replace(/_/g, ' '));
      return parts.length ? parts.join(' · ') : null;
    }

    default:
      return lapsed || null;
  }
}

export default function JourneyTimeline({ stages, currentStageId, session, config }) {
  const [now, setNow] = useState(Date.now());
  const currentIdx = stageIndex(stages, currentStageId);
  const startedAt = session?.journeyStartedAt;
  const eventsByStage = useMemo(
    () => eventMap(session?.journeyEvents),
    [session?.journeyEvents],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="lab-timeline">
      {stages.map((stage, idx) => {
        const accessPointEvent = eventsByStage.get('access_point');
        const customerJoined = Boolean(eventsByStage.get('entry_opened'));

        let state = 'pending';
        if (idx < currentIdx) state = 'done';
        if (idx === currentIdx) state = 'active';

        // Access point only lights up once the customer has scanned and loaded /enter
        if (stage.id === 'access_point') {
          state = customerJoined && accessPointEvent ? 'done' : 'pending';
        }

        const event = stage.id === 'access_point' && !customerJoined
          ? undefined
          : eventsByStage.get(stage.id);
        let lapsedMs = null;
        if (startedAt && stage.id !== 'qualifying_purchase') {
          if (state === 'active') {
            lapsedMs = now - startedAt;
          } else if (event?.at) {
            lapsedMs = event.at - startedAt;
          }
        }

        const detail = stageDetail(stage.id, {
          event,
          session,
          config,
          lapsedMs,
        });

        return (
          <div key={stage.id} className={`lab-timeline__row lab-timeline__row--${state}`}>
            <div className="lab-timeline__orb-col" aria-hidden="true">
              <span className={`lab-timeline__orb lab-timeline__orb--${state}`} />
            </div>
            <div className="lab-timeline__label-col">
              <div className="lab-timeline__label">{stage.label}</div>
              {state === 'active' && stage.hint && (
                <div className="lab-timeline__hint">{stage.hint}</div>
              )}
            </div>
            <div className="lab-timeline__detail-col">
              {detail ? (
                <span className="lab-timeline__detail">{detail}</span>
              ) : (
                <span className="lab-timeline__detail lab-timeline__detail--empty">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
