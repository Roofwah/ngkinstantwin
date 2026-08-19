import AccessPoint from './access-points/AccessPoint';
import TurnstyleComponents from './TurnstyleComponents';
import JourneyTimeline from './JourneyTimeline';
import LabUrls from './LabUrls';
import QualifyingPurchaseControls from './QualifyingPurchaseControls';
import CampaignReportModal from './CampaignReportModal';

function outcomeCopy(session, config) {
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
}) {
  const currentStage = session?.stage || 'qualifying_purchase';
  const stageMeta = config.journeyStages.find((s) => s.id === currentStage);
  const activeComponent = session?.activeComponent || 'access_point';

  return (
    <div className="lab-shell lab-shell--present lab-shell--solo">
      <section className="lab-presenter">
        <div className="lab-presenter__body">
          <div className="lab-presenter__main">
            <header className="lab-header lab-header--compact">
              <div>
                <div className="lab-eyebrow">Turnstyle Lab</div>
                <h1 className="lab-title">{config.campaignName}</h1>
                <p className="lab-subtitle">
                  {config.brand} · {config.retailer}
                </p>
              </div>
              <div className="lab-header__stage-pill">
                {session?.stageLabel || stageMeta?.label || 'Starting…'}
              </div>
            </header>

            <div className="lab-status-card lab-status-card--compact">
              <div className="lab-status-card__label">Turnstyle response</div>
              <h2 className="lab-status-card__stage">
                {session?.stageLabel || stageMeta?.label || 'Starting…'}
              </h2>
              {stageMeta?.hint && (
                <p className="lab-status-card__hint">{stageMeta.hint}</p>
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

            <div className="lab-grid-2 lab-grid-2--compact">
              <div className="lab-card">
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

            <footer className="lab-session-footer lab-presenter__footer">
              <h3 className="lab-session-footer__title">Session information</h3>
              <LabUrls session={session} config={config} onNewSession={onNewSession} />
            </footer>
          </div>

          <aside className="lab-presenter__sidebar">
            <div className="lab-card lab-card--timeline">
              <h3 className="lab-card__title">Customer journey</h3>
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

      <CampaignReportModal
        open={reportOpen}
        report={report}
        session={session}
        onClose={onCloseReport}
      />
    </div>
  );
}
