import { useEffect, useState } from 'react';
import { getLabCampaignDetails } from '../api';

function winningMomentsHint(details) {
  if (details?.claimedWinningMoments != null) {
    const parts = [
      `${details.claimedWinningMoments} claimed`,
      `${details.remainingWinningMoments} remaining`,
    ];
    if (details.unawardedWinningMoments != null) {
      const note = details.unawardedNote || 'online draw';
      parts.push(`${details.unawardedWinningMoments} unawarded (${note})`);
    }
    return parts.join(' · ');
  }
  if (details?.remainingWinningMoments != null) {
    return `${details.remainingWinningMoments} remaining in manifest`;
  }
  return null;
}

function Stat({ label, value, hint }) {
  return (
    <div className="lab-campaign-details__stat">
      <div className="lab-campaign-details__stat-label">{label}</div>
      <div className="lab-campaign-details__stat-value">{value}</div>
      {hint && <div className="lab-campaign-details__stat-hint">{hint}</div>}
    </div>
  );
}

export default function CampaignDetailsCard({ config }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getLabCampaignDetails(config.campaignId)
      .then((data) => { if (!cancelled) setDetails(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [config.campaignId]);

  const scheduleOverride = config.campaignSchedule;
  const startDate = scheduleOverride?.startDateLabel || details?.startDateLabel || '—';
  const endDate = scheduleOverride?.endDateLabel || details?.endDateLabel || '—';
  const winningMoments = details?.winningMoments ?? '—';
  const activationHours = scheduleOverride?.activationHoursLabel
    || details?.activationHoursLabel
    || '—';
  const qrActive = details?.qrActiveNow;

  return (
    <div className="lab-card lab-card--campaign-details">
      <div className="lab-campaign-details__header">
        <h3 className="lab-card__title">Campaign details</h3>
        {details && (
          <span
            className={`lab-campaign-details__badge${qrActive ? ' lab-campaign-details__badge--active' : ''}`}
          >
            {details.qrStatusLabel}
          </span>
        )}
      </div>
      <p className="lab-card__body lab-card__body--tight">
        PUK QR codes are only issued during general retail hours
        {activationHours !== '—' ? ` (${activationHours}).` : '.'}
      </p>
      <div className="lab-campaign-details__grid">
        <Stat label="Start date" value={startDate} />
        <Stat label="End date" value={endDate} />
        <Stat
          label="Winning moments"
          value={winningMoments}
          hint={details ? winningMomentsHint(details) : null}
        />
        <div className="lab-campaign-details__stat">
          <div className="lab-campaign-details__stat-label">Retail hours</div>
          <div className="lab-campaign-details__stat-value">{activationHours}</div>
          <div className="lab-campaign-details__timezone">
            <span>GMT</span>
            <span className="lab-campaign-details__edit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
