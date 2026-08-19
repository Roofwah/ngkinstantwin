import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createLabSession,
  getLabSessionReport,
  pollLabSession,
  setDemoCampaign,
  syncLabSessionAccessPoint,
  updateLabSessionRules,
} from '../api';
import { getLabCampaign } from '../config/labCampaigns';
import { resolveAccessPointFromConfig } from '../lab/accessPointLabel';
import LabCampaignPicker from '../lab/LabCampaignPicker';
import LabShell from '../lab/LabShell';
import '../lab/lab.css';

const POLL_MS = 2000;
const SESSION_ID_KEY = 'turnstyleLabSessionId';
const SESSION_CONFIG_KEY = 'turnstyleLabConfigId';

function campaignDefaultRules(config) {
  return {
    minSpend: config.qualifyingPurchaseRules?.defaultMinSpend ?? 15,
    allowDuplicateReceipts: config.qualifyingPurchaseRules?.defaultAllowDuplicateReceipts ?? false,
  };
}

function rulesMatchConfig(session, defaults) {
  return session?.rules?.minSpend === defaults.minSpend
    && Boolean(session?.rules?.allowDuplicateReceipts) === defaults.allowDuplicateReceipts;
}

export default function Lab() {
  const { configId } = useParams();
  const config = configId ? getLabCampaign(configId) : null;
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [bootKey, setBootKey] = useState(0);
  const [report, setReport] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const autoReportedRef = useRef(false);

  useEffect(() => {
    if (!config) return undefined;

    let cancelled = false;

    async function boot() {
      try {
        await setDemoCampaign(config.campaignId);

        const storedId = sessionStorage.getItem(SESSION_ID_KEY);
        const storedConfigId = sessionStorage.getItem(SESSION_CONFIG_KEY);
        const accessPoint = resolveAccessPointFromConfig(config);
        const defaultRules = campaignDefaultRules(config);

        if (storedId && storedConfigId === config.configId) {
          try {
            const existing = await pollLabSession(storedId);
            const needsAccessPointSync = existing.accessPointId !== accessPoint.accessPointId
              || existing.storeId !== accessPoint.storeId
              || existing.storeLocation !== accessPoint.storeLocation;
            let synced = needsAccessPointSync
              ? await syncLabSessionAccessPoint(storedId, accessPoint)
              : existing;
            if (!rulesMatchConfig(synced, defaultRules)) {
              synced = await updateLabSessionRules(storedId, defaultRules);
            }
            if (!cancelled) {
              setSession(synced);
              return;
            }
          } catch {
            sessionStorage.removeItem(SESSION_ID_KEY);
            sessionStorage.removeItem(SESSION_CONFIG_KEY);
          }
        }

        const created = await createLabSession({
          labConfigId: config.configId,
          campaignId: config.campaignId,
          campaignName: config.campaignName,
          retailer: config.retailer,
          accessPointType: config.accessPointType,
          accessPointId: accessPoint.accessPointId,
          storeId: accessPoint.storeId,
          storeLocation: accessPoint.storeLocation,
          clientOrigin: window.location.origin,
          rules: defaultRules,
        });
        if (!cancelled) {
          sessionStorage.setItem(SESSION_ID_KEY, created.sessionId);
          sessionStorage.setItem(SESSION_CONFIG_KEY, config.configId);
          setSession(created);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not start lab session');
      }
    }

    boot();
    return () => { cancelled = true; };
  }, [config, bootKey]);

  function startNewSession() {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_CONFIG_KEY);
    setSession(null);
    setReport(null);
    setReportOpen(false);
    autoReportedRef.current = false;
    setBootKey((k) => k + 1);
  }

  async function loadReport(sessionId) {
    try {
      const data = await getLabSessionReport(sessionId);
      setReport(data.report);
      return data.report;
    } catch {
      setReport(null);
      return null;
    }
  }

  async function openReport() {
    if (!session?.sessionId) return;
    await loadReport(session.sessionId);
    setReportOpen(true);
  }

  async function handleRulesChange(patch) {
    if (!session?.sessionId) return;
    try {
      const next = await updateLabSessionRules(session.sessionId, patch);
      setSession(next);
    } catch {
      /* ignore transient update errors */
    }
  }

  useEffect(() => {
    if (!session?.sessionId) return undefined;

    let cancelled = false;

    async function tick() {
      try {
        const next = await pollLabSession(session.sessionId);
        if (!cancelled) setSession(next);
      } catch {
        /* ignore transient poll errors */
      }
    }

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.sessionId]);

  useEffect(() => {
    if (session?.stage !== 'reporting' || !session?.claimId) return;

    loadReport(session.sessionId).then((data) => {
      if (data && !autoReportedRef.current) {
        autoReportedRef.current = true;
        setReportOpen(true);
      }
    });
  }, [session?.stage, session?.claimId, session?.sessionId]);

  if (!configId) {
    return <LabCampaignPicker />;
  }

  if (!config) {
    return (
      <div className="lab-loading">
        <p>Unknown lab program <code>{configId}</code>.</p>
        <p><Link to="/lab">Choose a campaign</Link></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lab-loading">
        <p>{error}</p>
      </div>
    );
  }

  if (!session) {
    return <div className="lab-loading">Starting Turnstyle Lab…</div>;
  }

  return (
    <LabShell
      config={config}
      session={session}
      onNewSession={startNewSession}
      onRulesChange={handleRulesChange}
      onViewReport={session?.claimId ? openReport : undefined}
      reportOpen={reportOpen}
      report={report}
      onCloseReport={() => setReportOpen(false)}
    />
  );
}
