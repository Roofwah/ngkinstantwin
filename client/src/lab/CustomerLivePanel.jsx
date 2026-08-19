const STAGE_SCREENS = {
  entry_opened: {
    title: 'Welcome',
    body: 'Enter your name and mobile number to begin',
    icon: '📱',
  },
  otp_sent: {
    title: 'Verify your number',
    body: 'We sent a one-time code to your mobile',
    icon: '💬',
  },
  customer_verified: {
    title: 'Verified',
    body: 'Your mobile number is confirmed',
    icon: '✓',
  },
  receipt_received: {
    title: 'Receipt upload',
    body: 'Capture or upload your purchase receipt',
    icon: '🧾',
  },
  reading_receipt: {
    title: 'Reading receipt',
    body: 'Extracting purchase details…',
    icon: '🔍',
  },
  purchase_validated: {
    title: 'Purchase validated',
    body: 'Eligible products and amount confirmed',
    icon: '✓',
  },
  submitting: {
    title: 'Submitting',
    body: 'Sending your claim to Turnstyle',
    icon: '⏳',
  },
  checking_instant_win: {
    title: 'Pure Random',
    body: 'Checking your instant win outcome…',
    icon: '🎰',
  },
  instant_win_outcome: {
    title: 'Result',
    body: null,
    icon: null,
  },
  prize_allocated: {
    title: 'Scratch card',
    body: 'Reveal your result on device',
    icon: '✨',
  },
  reporting: {
    title: 'Complete',
    body: 'Your result is on your phone',
    icon: '✓',
  },
};

function outcomeBody(session, config) {
  if (!session?.result) return 'Processing…';
  if (session.isWinner) {
    return session.prizeName || config?.customerMessages?.outcomeWin || 'You have an instant win!';
  }
  return config?.customerMessages?.outcomeNoWin || 'Draw entry confirmed';
}

export default function CustomerLivePanel({ session, config }) {
  const stage = session?.stage || 'entry_opened';
  const screen = STAGE_SCREENS[stage] || STAGE_SCREENS.entry_opened;
  const isOutcome = stage === 'instant_win_outcome' || (session?.result && stage !== 'reporting');

  return (
    <div className="lab-live-panel">
      <div className="lab-live-panel__status-bar">
        <span>9:41</span>
        <span className="lab-live-panel__signals">●●●</span>
      </div>
      <div className="lab-live-panel__content">
        {isOutcome && session?.result ? (
          <>
            <div className={`lab-live-panel__icon ${session.isWinner ? 'lab-live-panel__icon--win' : ''}`}>
              {session.isWinner ? '🎉' : '📋'}
            </div>
            <h3 className="lab-live-panel__title">
              {session.isWinner ? 'Instant win!' : 'Thanks for playing'}
            </h3>
            <p className="lab-live-panel__body">{outcomeBody(session, config)}</p>
          </>
        ) : (
          <>
            <div className="lab-live-panel__icon">{screen.icon}</div>
            <h3 className="lab-live-panel__title">{screen.title}</h3>
            <p className="lab-live-panel__body">{screen.body}</p>
          </>
        )}
        {session?.mobileMasked && (
          <p className="lab-live-panel__meta">{session.mobileMasked}</p>
        )}
      </div>
      <p className="lab-live-panel__badge">Live on participant phone</p>
    </div>
  );
}
