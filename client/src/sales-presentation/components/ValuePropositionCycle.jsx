import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PRESENTATION_CONTACT,
  PROPOSITION_HOLD_MS,
  VALUE_PROPOSITIONS,
} from '../content/valuePropositions';

const LAST = VALUE_PROPOSITIONS.length - 1;

function holdForIndex(index, reducedMotion) {
  if (reducedMotion) return 4500;
  const item = VALUE_PROPOSITIONS[index];
  return item?.holdMs ?? PROPOSITION_HOLD_MS;
}

/**
 * Looping explore sequence. Progress rail + chevron to skip.
 * Tap title / progress to pause; play resumes. Final slide shows contact CTA.
 */
export default function ValuePropositionCycle({ active, onClose }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('enter'); // enter | hold | exit
  const [progressKey, setProgressKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const runIdRef = useRef(0);
  const phaseRef = useRef('enter');
  const holdStartedAtRef = useRef(0);
  const remainingHoldRef = useRef(PROPOSITION_HOLD_MS);
  const pausedRef = useRef(false);
  const playFromRef = useRef(null);

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback((fn, ms, runId) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (runIdRef.current !== runId || pausedRef.current) return;
      fn();
    }, ms);
  }, [clearTimer]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const holdDuration = useCallback(
    () => holdForIndex(indexRef.current, reducedMotion),
    [reducedMotion],
  );

  const advanceAfterHold = useCallback((runId) => {
    setPhase('exit');
    phaseRef.current = 'exit';
    const exitMs = reducedMotion ? 16 : 550;
    const next = indexRef.current >= LAST ? 0 : indexRef.current + 1;
    schedule(() => {
      playFromRef.current?.(next, runId);
    }, exitMs, runId);
  }, [reducedMotion, schedule]);

  const beginHoldCountdown = useCallback((runId, remainingMs) => {
    const full = holdDuration();
    holdStartedAtRef.current = Date.now();
    remainingHoldRef.current = remainingMs;
    setPhase('hold');
    phaseRef.current = 'hold';
    if (remainingMs >= full - 30) {
      setProgressKey((k) => k + 1);
    }

    schedule(() => {
      advanceAfterHold(runId);
    }, remainingMs, runId);
  }, [advanceAfterHold, holdDuration, schedule]);

  const playFrom = useCallback((startIndex, runId) => {
    if (runIdRef.current !== runId) return;

    pausedRef.current = false;
    setPaused(false);
    indexRef.current = startIndex;
    setIndex(startIndex);
    setPhase('enter');
    phaseRef.current = 'enter';

    const enterMs = reducedMotion ? 0 : 700;
    const fullHold = holdForIndex(startIndex, reducedMotion);
    remainingHoldRef.current = fullHold;

    schedule(() => {
      beginHoldCountdown(runId, fullHold);
    }, enterMs || 16, runId);
  }, [beginHoldCountdown, reducedMotion, schedule]);

  playFromRef.current = playFrom;

  useEffect(() => {
    if (!active) {
      clearTimer();
      runIdRef.current += 1;
      indexRef.current = 0;
      pausedRef.current = false;
      setPaused(false);
      setIndex(0);
      setPhase('enter');
      phaseRef.current = 'enter';
      return undefined;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    playFrom(0, runId);

    return () => {
      runIdRef.current += 1;
      clearTimer();
    };
  }, [active, playFrom, clearTimer]);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    if (phaseRef.current === 'exit') return;

    clearTimer();

    if (phaseRef.current === 'hold') {
      const elapsed = Date.now() - holdStartedAtRef.current;
      remainingHoldRef.current = Math.max(120, remainingHoldRef.current - elapsed);
    } else {
      remainingHoldRef.current = holdDuration();
    }

    pausedRef.current = true;
    setPaused(true);
  }, [clearTimer, holdDuration]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    const runId = runIdRef.current;
    pausedRef.current = false;
    setPaused(false);

    if (phaseRef.current === 'enter') {
      beginHoldCountdown(runId, remainingHoldRef.current);
      return;
    }

    holdStartedAtRef.current = Date.now();
    schedule(() => {
      advanceAfterHold(runId);
    }, remainingHoldRef.current, runId);
  }, [advanceAfterHold, beginHoldCountdown, schedule]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'exit') return;
    if (pausedRef.current) resume();
    else pause();
  }, [pause, resume]);

  const goNext = useCallback(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    clearTimer();
    pausedRef.current = false;
    setPaused(false);
    const next = indexRef.current >= LAST ? 0 : indexRef.current + 1;
    setPhase('exit');
    phaseRef.current = 'exit';
    schedule(() => {
      playFrom(next, runId);
    }, reducedMotion ? 16 : 280, runId);
  }, [clearTimer, playFrom, reducedMotion, schedule]);

  if (!active) return null;

  const item = VALUE_PROPOSITIONS[index] || VALUE_PROPOSITIONS[0];
  const showPlay = paused && phase !== 'exit';
  const fullHold = holdForIndex(index, reducedMotion);
  const showContact = Boolean(item.showContact);

  return (
    <div className={`sp-vp${paused ? ' is-paused' : ''}${showContact ? ' is-cta' : ''}`} aria-live="polite">
      <button
        type="button"
        className="sp-vp__close"
        onClick={onClose}
        aria-label="Close presentation"
      >
        ✕
      </button>

      <div
        key={`${item.id}-${index}`}
        className={`sp-vp__card is-${phase}${reducedMotion ? ' is-reduced' : ''}`}
      >
        <div className="sp-vp__rail-wrap">
          {showPlay && (
            <button
              type="button"
              className="sp-vp__play"
              onClick={resume}
              aria-label="Play"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M6 3.8v10.4L15 9 6 3.8Z" fill="currentColor" />
              </svg>
            </button>
          )}

          <div className="sp-vp__rail">
            <button
              type="button"
              className="sp-vp__pause-hit"
              onClick={togglePause}
              aria-label={paused ? 'Resume' : 'Pause'}
            >
              <span className="sp-vp__number">{item.number}</span>
              <div className="sp-vp__track">
                {(phase === 'hold' || paused) && (
                  <div
                    key={progressKey}
                    className={`sp-vp__fill${reducedMotion ? ' is-reduced' : ''}${paused ? ' is-paused' : ''}`}
                    style={{
                      animationDuration: `${fullHold}ms`,
                      animationPlayState: paused ? 'paused' : 'running',
                    }}
                  />
                )}
              </div>
            </button>

            <button
              type="button"
              className="sp-vp__chevron"
              onClick={goNext}
              aria-label="Next"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M4.5 2.5L9.5 7L4.5 11.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="sp-vp__body">
          <button
            type="button"
            className="sp-vp__copy-hit"
            onClick={togglePause}
            aria-label={paused ? 'Resume presentation' : 'Pause presentation'}
          >
            <h2 className="sp-vp__heading">{item.heading}</h2>
            <p className="sp-vp__statement">{item.statement}</p>
          </button>

          {showContact && (
            <p className="sp-vp__cta-line">
              <a
                className="sp-vp__cta"
                href={PRESENTATION_CONTACT.mailto}
                onClick={(e) => e.stopPropagation()}
              >
                {PRESENTATION_CONTACT.ctaLabel}
              </a>
              {' '}
              <span className="sp-vp__cta-brand">{PRESENTATION_CONTACT.brandLabel}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
