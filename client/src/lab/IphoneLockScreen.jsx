import { useEffect, useState } from 'react';

function formatLockDate(now) {
  return now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatLockTime(now) {
  return now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** iOS-style lock screen — tap to open the customer journey in the Lab phone. */
export default function IphoneLockScreen({ onUnlock }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      className="lab-lock-screen"
      onClick={onUnlock}
      aria-label="Unlock phone to start customer journey"
    >
      <div className="lab-lock-screen__wallpaper" aria-hidden="true">
        <div className="lab-lock-screen__blob lab-lock-screen__blob--left" />
        <div className="lab-lock-screen__blob lab-lock-screen__blob--right" />
      </div>

      <div className="lab-lock-screen__status" aria-hidden="true">
        <span className="lab-lock-screen__status-spacer" />
        <span className="lab-lock-screen__status-icons">
          <span className="lab-lock-screen__signal">
            <i /><i /><i /><i />
          </span>
          <span className="lab-lock-screen__wifi" />
          <span className="lab-lock-screen__battery" />
        </span>
      </div>

      <div className="lab-lock-screen__clock">
        <div className="lab-lock-screen__date">{formatLockDate(now)}</div>
        <div className="lab-lock-screen__time">{formatLockTime(now)}</div>
      </div>

      <div className="lab-lock-screen__shortcuts" aria-hidden="true">
        <span className="lab-lock-screen__shortcut" title="Torch">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M11 2h2l1 4h-4l1-4zm-1 6h4l-1 2v9a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V10l-1-2zm2 11a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z" />
          </svg>
        </span>
        <span className="lab-lock-screen__shortcut" title="Camera">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M9.5 4h1.8l1.1-2h3.2l1.1 2H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4.5zm2.5 4.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
          </svg>
        </span>
      </div>

      <span className="lab-lock-screen__hint">Tap to open promotion</span>
    </button>
  );
}
