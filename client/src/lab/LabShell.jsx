import AccessPoint from './access-points/AccessPoint';
import CustomerPhoneFrame from './CustomerPhoneFrame';
import TurnstyleComponents from './TurnstyleComponents';
import JourneyTimeline from './JourneyTimeline';
import LabUrls from './LabUrls';
import QualifyingPurchaseControls from './QualifyingPurchaseControls';
import ManifestSetupControls from './ManifestSetupControls';
import CampaignDetailsCard from './CampaignDetailsCard';
import CampaignReportModal from './CampaignReportModal';
import StoreEmailPreview from './StoreEmailPreview';
import LabNav from './LabNav';
import { resolveLabPhoneEntryUrl } from './resolveLabPhoneEntryUrl';

function presenterStage(session, config) {
  const currentStage = session?.stage || 'qualifying_purchase';
  const stageMeta = config.journeyStages.find((s) => s.id === currentStage);
  const sweepstakesDone = Boolean(
    session?.result && !session?.isWinner && currentStage === 'prize_allocated',
  );
  if (sweepstakesDone) {
    return {
      label: 'Journey complete',
      hint: 'Weekly draw entry confirmed',
    };
  }
  return {
    label: session?.stageLabel || stageMeta?.label || 'Starting…',
    hint: stageMeta?.hint,
  };
}

function outcomeCopy(session, config) {
  if (session?.isWinner && session?.stage === 'prize_fulfilled') {
    const evt = session.journeyEvents?.find((e) => e.stage === 'prize_fulfilled');
    const status = evt?.redemptionStatusLabel || session?.redemptionStatusLabel;
    const by = evt?.fulfilledBy;
    const at = evt?.fulfilledAt || evt?.at;
    const when = at
      ? new Date(at).toLocaleString('en-AU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      : null;
    const parts = ['Journey complete'];
    if (status) parts.push(status);
    if (by) parts.push(by);
    if (when) parts.push(when);
    return parts.join(' · ');
  }
  if (session?.isWinner && session?.redemptionStatusLabel
    && (session.stage === 'store_email_sent' || session.stage === 'prize_allocated')) {
    return `Store notified · ${session.redemptionStatusLabel}`;
  }
  if (!session?.result) return null;
  if (session.isWinner) {
    return session.prizeName || config.customerMessages?.outcomeWin;
  }
  return config.customerMessages?.outcomeNoWin;
}

export default function LabShell({
  config,
  session,
  onNewSession,
  onRulesChange,
  onViewReport,
  reportOpen,
  report,
  onCloseReport,
  storeEmail,
  onSessionUpdate,
}) {
  const isManifest = config.labMode === 'manifest';
  const currentStage = session?.stage || (isManifest ? 'campaign_brief' : 'qualifying_purchase');
  const presenter = presenterStage(session, config);
  const activeComponent = session?.activeComponent || (isManifest ? 'catalog' : 'access_point');

  const embedPhone = config.embedCustomerPhone === true;
  const phoneEntryUrl = resolveLabPhoneEntryUrl(session, config) || session?.entryUrl;

  return (
    <div className={`lab-shell lab-shell--present${embedPhone ? '' : ' lab-shell--solo'}`}>
      <section className="lab-presenter">
        <div className="lab-presenter__body">
          <div className="lab-presenter__main">
            <div className="lab-presenter__toolbar">
              <LabNav currentConfigId={config.configId} />
              <div className="lab-presenter__toolbar-actions">
                {onNewSession && (
                  <button type="button" className="lab-new-session" onClick={onNewSession}>
                    New session
                  </button>
                )}
              </div>
            </div>
            <header className="lab-header lab-header--compact">
              <div>
                <div className="lab-eyebrow">Turnstyle Lab</div>
                <h1 className="lab-title">{config.campaignName}</h1>
                <p className="lab-subtitle">
                  {config.brand} · {config.retailer}
                </p>
              </div>
              <div className="lab-header__stage-pill">
                {presenter.label}
              </div>
            </header>

            <div className="lab-presenter__stack">
            <div className="lab-status-card lab-status-card--compact">
              <div className="lab-status-card__label">
                {isManifest ? 'Setup progress' : 'Turnstyle response'}
              </div>
              <h2 className="lab-status-card__stage">
                {presenter.label}
              </h2>
              {presenter.hint && (
                <p className="lab-status-card__hint">{presenter.hint}</p>
              )}
              {session?.customerName && (
                <p className="lab-status-card__hint">Participant {session.customerName}</p>
              )}
              {!session?.customerName && session?.mobileMasked && (
                <p className="lab-status-card__hint">Participant {session.mobileMasked}</p>
              )}
              {session?.customerName && session?.mobileMasked && (
                <p className="lab-status-card__hint">{session.mobileMasked}</p>
              )}
              {outcomeCopy(session, config) && (
                <div className={`lab-outcome ${session.isWinner ? 'lab-outcome--win' : 'lab-outcome--lose'}`}>
                  {outcomeCopy(session, config)}
                </div>
              )}
              {onViewReport && (
                <button type="button" className="lab-report-trigger" onClick={onViewReport}>
                  View entry summary
                </button>
              )}
            </div>

            <div className="lab-card lab-card--components">
              <h3 className="lab-card__title">Turnstyle components</h3>
              <TurnstyleComponents
                components={config.turnstyleComponents}
                activeId={activeComponent}
              />
            </div>

            {session?.isWinner && storeEmail && (
              <div className="lab-card lab-card--store-email">
                <h3 className="lab-card__title">Store notification email</h3>
                <p className="lab-card__body lab-card__body--tight">
                  Email the store receives when a customer wins — tap Fulfil Prize to confirm handover.
                </p>
                <StoreEmailPreview email={storeEmail} compact />
              </div>
            )}

            {isManifest ? (
              <ManifestSetupControls
                config={config}
                session={session}
                onSessionUpdate={onSessionUpdate}
              />
            ) : (
              <>
                <div className="lab-grid-2 lab-grid-2--journey">
                  <div className="lab-card lab-card--access-point">
                    <h3 className="lab-card__title">Access point</h3>
                    <AccessPoint
                      type={config.accessPointType}
                      entryUrl={session?.entryUrl}
                      config={config}
                    />
                  </div>
                  <div className="lab-card lab-card--qualifying">
                    <h3 className="lab-card__title">Qualifying purchase</h3>
                    <QualifyingPurchaseControls
                      config={config}
                      rules={session?.rules}
                      onRulesChange={onRulesChange}
                    />
                  </div>
                </div>
                <CampaignDetailsCard config={config} />
              </>
            )}
            </div>

            <footer className="lab-session-footer lab-presenter__footer">
              <h3 className="lab-session-footer__title">Session information</h3>
              <LabUrls session={session} config={config} />
            </footer>
          </div>

          <aside className="lab-presenter__sidebar">
            <div className="lab-card lab-card--timeline">
              <h3 className="lab-card__title">{config.timelineTitle || 'Customer journey'}</h3>
              <JourneyTimeline
                stages={config.journeyStages}
                currentStageId={currentStage}
                session={session}
                config={config}
              />
            </div>
          </aside>
        </div>
      </section>

      {embedPhone && (
        <CustomerPhoneFrame entryUrl={phoneEntryUrl} session={session} />
      )}

      <CampaignReportModal
        open={reportOpen}
        report={report}
        session={session}
        onClose={onCloseReport}
      />
    </div>
  );
}
