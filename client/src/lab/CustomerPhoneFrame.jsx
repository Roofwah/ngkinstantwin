import { useEffect, useMemo, useState } from 'react';
import IphoneLockScreen from './IphoneLockScreen';

function customerHasJoined(session) {
  if (session?.journeyEvents?.some((e) => e.stage === 'entry_opened')) return true;
  const preJoin = new Set(['qualifying_purchase', 'access_point', 'session_created']);
  return Boolean(session?.stage && !preJoin.has(session.stage));
}

/**
 * Phone frame with the real customer journey embedded — lock screen until opened.
 */
export default function CustomerPhoneFrame({ entryUrl, session }) {
  const [unlocked, setUnlocked] = useState(false);
  const joined = useMemo(() => customerHasJoined(session), [session]);

  useEffect(() => {
    setUnlocked(false);
  }, [session?.sessionId]);

  useEffect(() => {
    if (joined) setUnlocked(true);
  }, [joined, session?.sessionId]);

  const showJourney = entryUrl && unlocked;

  return (
    <div className="lab-device-column">
      <div className="lab-device-column__header">
        <span className="lab-device-column__eyebrow">Customer experience</span>
        <span className="lab-device-column__title">
          {showJourney ? 'Live on device' : 'Lock screen'}
        </span>
      </div>

      <div className="lab-device-column__phone-slot">
        <div className="lab-phone" aria-label="Customer phone">
          <div className="lab-phone__bezel">
            <div className="lab-phone__island" />
            <div className="lab-phone__screen lab-phone__screen--app">
              {showJourney ? (
                <iframe
                  key={`${session?.sessionId}-${entryUrl}`}
                  className="lab-phone__iframe"
                  src={entryUrl}
                  title="Customer journey"
                />
              ) : entryUrl ? (
                <IphoneLockScreen onUnlock={() => setUnlocked(true)} />
              ) : (
                <div className="lab-phone__placeholder">
                  <p>Starting session…</p>
                </div>
              )}
            </div>
            <div className="lab-phone__home-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
