const { randomBytes } = require('crypto');
const { resolveClientBaseUrl } = require('../lib/baseUrl');
const db = require('../db');
const { getStoreEmailPreview } = require('./winnerNotify');
const { redemptionStatusLabel } = require('./redemption');

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

db.exec(`
  CREATE TABLE IF NOT EXISTS lab_sessions (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
`);

const STAGE_META = {
  qualifying_purchase: { label: 'Qualifying purchase', component: null },
  access_point: { label: 'Access point', component: 'access_point' },
  entry_opened: { label: 'Customer joined', component: 'access_point' },
  otp_sent: { label: 'OTP sent', component: 'identity' },
  customer_verified: { label: 'Customer verified', component: 'identity' },
  receipt_received: { label: 'Receipt received', component: 'rri' },
  reading_receipt: { label: 'Reading receipt', component: 'rri' },
  purchase_validated: { label: 'Purchase details', component: 'purchase' },
  submitting: { label: 'Submitting claim', component: 'pure_random' },
  checking_instant_win: { label: 'Checking instant win', component: 'pure_random' },
  instant_win_outcome: { label: 'Instant win outcome', component: 'pure_random' },
  prize_allocated: { label: 'Prize allocated', component: 'prize' },
  store_email_sent: { label: 'Email notification sent to store', component: 'store_notify' },
  reporting: { label: 'Campaign reporting', component: 'reporting' },
  prize_fulfilled: { label: 'Journey complete', component: 'prize' },
  campaign_brief: { label: 'Campaign brief', component: 'catalog' },
  prize_catalog: { label: 'Prize catalog', component: 'catalog' },
  seed_published: { label: 'Seed published', component: 'seed' },
  generating_manifest: { label: 'Generating manifest', component: 'manifest' },
  manifest_ready: { label: 'Manifest ready', component: 'manifest' },
  audit_verified: { label: 'Audit verified', component: 'audit' },
  campaign_live: { label: 'Campaign live', component: null },
};

const MANIFEST_STAGE_ORDER = [
  'campaign_brief',
  'prize_catalog',
  'seed_published',
  'generating_manifest',
  'manifest_ready',
  'audit_verified',
  'campaign_live',
];

const STAGE_ORDER = [
  'qualifying_purchase',
  'access_point',
  'entry_opened',
  'otp_sent',
  'customer_verified',
  'receipt_received',
  'reading_receipt',
  'purchase_validated',
  'submitting',
  'checking_instant_win',
  'instant_win_outcome',
  'prize_allocated',
  'store_email_sent',
  'reporting',
  'prize_fulfilled',
];

const insertStmt = db.prepare(`
  INSERT INTO lab_sessions (id, payload, createdAt, updatedAt)
  VALUES (?, ?, ?, ?)
`);

const updateStmt = db.prepare(`
  UPDATE lab_sessions SET payload = ?, updatedAt = ? WHERE id = ?
`);

const selectStmt = db.prepare('SELECT payload, createdAt FROM lab_sessions WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM lab_sessions WHERE id = ?');

function makeSessionId() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function normalizeId(sessionId) {
  return String(sessionId || '').trim().toUpperCase();
}

function pruneExpired() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  db.prepare('DELETE FROM lab_sessions WHERE createdAt < ?').run(cutoff);
}

function loadSession(sessionId) {
  const id = normalizeId(sessionId);
  if (!id) return null;

  const row = selectStmt.get(id);
  if (!row) return null;

  if (Date.now() - row.createdAt > SESSION_TTL_MS) {
    deleteStmt.run(id);
    return null;
  }

  try {
    return JSON.parse(row.payload);
  } catch {
    deleteStmt.run(id);
    return null;
  }
}

function saveSession(session) {
  const payload = JSON.stringify(session);
  updateStmt.run(payload, session.updatedAt, session.id);
}

function buildPhoneBaseUrl(session) {
  const devPort = process.env.CLIENT_DEV_PORT || '5173';
  if (process.env.BASE_URL) {
    return resolveClientBaseUrl(process.env.BASE_URL);
  }
  if (process.env.NODE_ENV !== 'production') {
    return resolveClientBaseUrl(`http://localhost:${devPort}`);
  }
  let base = session.clientBaseUrl || resolveClientBaseUrl(null);
  if (/localhost|127\.0\.0\.1/.test(base)) {
    base = resolveClientBaseUrl(`http://localhost:${devPort}`);
  }
  return base;
}

const CAMPAIGN_PHONE_ENTRY_PATH = {
  'niterra-ngk-2026': '/enter/repco',
  'ford-2026': '/enter/ford',
  'audi-2026': '/enter/audi-instant-win',
  'hoka-2026': '/enter/hoka',
  'castrol-2026': '/enter/castrol',
};

function phoneEntryPathForSession(session) {
  if (session.entryPath) return session.entryPath;
  return CAMPAIGN_PHONE_ENTRY_PATH[session.campaignId] || '/enter';
}

function buildEntryUrl(session) {
  const base = buildPhoneBaseUrl(session);
  const path = phoneEntryPathForSession(session);
  const params = new URLSearchParams({ labSession: session.id });
  if (path === '/enter') {
    params.set('campaign', session.campaignId);
  }
  if (session.deviceCode) {
    params.set('device', session.deviceCode);
  }
  return `${base}${path}?${params.toString()}`;
}

function normalizePresentationStage(session) {
  const stage = session.stage;
  if (stage === 'session_created') return 'qualifying_purchase';
  const joined = session.events?.some((e) => e.stage === 'entry_opened');
  if (!joined && (stage === 'access_point' || stage === 'qualifying_purchase')) {
    return 'qualifying_purchase';
  }
  return stage;
}

function maskMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits.length >= 4 ? `${digits.slice(0, 4)}****` : null;
}

function serializeJourneyEvents(events = []) {
  const joined = events.some((e) => e.stage === 'entry_opened');
  const visible = joined
    ? events
    : events.filter((e) => e.stage !== 'access_point');
  return visible.map((event) => ({
    stage: event.stage,
    at: event.at,
    customerName: event.customerName || undefined,
    mobileMasked: event.mobile ? maskMobile(event.mobile) : undefined,
    receiptSource: event.receiptSource || undefined,
    selectedBrand: event.selectedBrand || undefined,
    spendAmount: event.spendAmount ?? undefined,
    fulfilledBy: event.fulfilledBy || undefined,
    fulfilledAt: event.fulfilledAt ?? undefined,
    redemptionStatus: event.redemptionStatus || undefined,
    redemptionStatusLabel: event.redemptionStatusLabel || undefined,
    emailStatus: event.emailStatus || undefined,
    result: event.result || undefined,
    prizeName: event.prizeName || undefined,
  }));
}

function formatAccessPointLabel(session) {
  if (session.storeId && session.storeLocation) {
    return `${session.storeId} ${session.storeLocation}`;
  }
  if (session.storeId) return String(session.storeId);
  if (session.storeLocation) return session.storeLocation;
  return session.accessPointId || null;
}

function claimFulfilmentFields(claimId) {
  if (!claimId) return {};
  const claim = db.prepare('SELECT redemptionStatus FROM claims WHERE claimId = ?').get(claimId);
  if (!claim?.redemptionStatus) return {};
  return {
    redemptionStatus: claim.redemptionStatus,
    redemptionStatusLabel: redemptionStatusLabel(claim.redemptionStatus),
  };
}

function serializeSession(session) {
  const stage = normalizePresentationStage(session);
  const meta = STAGE_META[stage] || STAGE_META[session.stage] || { label: stage, component: null };
  const joinedAt = session.journeyStartedAt
    || session.events?.find((e) => e.stage === 'entry_opened')?.at
    || null;
  const fulfilment = claimFulfilmentFields(session.claimId);
  let stageLabel = meta.label;
  if (session.result && session.isWinner === false && stage === 'prize_allocated') {
    stageLabel = 'Journey complete';
  }
  return {
    sessionId: session.id,
    labConfigId: session.labConfigId || null,
    campaignId: session.campaignId,
    campaignName: session.campaignName,
    retailer: session.retailer,
    store: session.store,
    accessPointType: session.accessPointType,
    accessPointId: session.accessPointId,
    storeId: session.storeId || null,
    storeLocation: session.storeLocation || null,
    accessPointLabel: formatAccessPointLabel(session),
    stage,
    stageLabel,
    activeComponent: session.activeComponent || meta.component,
    entryUrl: buildEntryUrl(session),
    clientBaseUrl: session.clientBaseUrl || null,
    mobileMasked: session.mobileMasked || null,
    customerName: session.customerName || null,
    claimId: session.claimId || null,
    result: session.result || null,
    isWinner: session.isWinner,
    prizeName: session.prizeName || null,
    rules: {
      minSpend: session.rules?.minSpend ?? 15,
      allowDuplicateReceipts: Boolean(session.rules?.allowDuplicateReceipts),
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    journeyStartedAt: joinedAt,
    journeyEvents: serializeJourneyEvents(session.events),
    labMode: session.labMode || 'customer',
    manifestInfo: session.manifestInfo || null,
    ...fulfilment,
  };
}

function createSession({
  campaignId,
  campaignName,
  retailer,
  store,
  accessPointType = 'static-qr',
  accessPointId = 'QR-REPCO-247',
  storeId = null,
  storeLocation = null,
  deviceCode = null,
  entryPath = null,
  clientOrigin = null,
  labConfigId = null,
  labMode = 'customer',
  rules = null,
}) {
  pruneExpired();

  const now = Date.now();
  const id = makeSessionId();
  const clientBaseUrl = resolveClientBaseUrl(clientOrigin);
  const session = {
    id,
    clientBaseUrl,
    labConfigId: labConfigId || null,
    labMode: labMode === 'manifest' ? 'manifest' : 'customer',
    campaignId,
    campaignName: campaignName || campaignId,
    retailer: retailer || null,
    store: store || null,
    accessPointType,
    accessPointId,
    storeId: storeId || null,
    storeLocation: storeLocation || null,
    deviceCode: deviceCode || null,
    entryPath: entryPath || CAMPAIGN_PHONE_ENTRY_PATH[campaignId] || null,
    stage: labMode === 'manifest' ? 'campaign_brief' : 'qualifying_purchase',
    activeComponent: labMode === 'manifest' ? 'catalog' : 'access_point',
    mobileMasked: null,
    customerName: null,
    claimId: null,
    result: null,
    isWinner: null,
    prizeName: null,
    journeyStartedAt: labMode === 'manifest' ? now : null,
    manifestInfo: null,
    rules: {
      minSpend: rules?.minSpend ?? 15,
      allowDuplicateReceipts: rules?.allowDuplicateReceipts !== undefined
        ? Boolean(rules.allowDuplicateReceipts)
        : true,
    },
    createdAt: now,
    updatedAt: now,
    events: [{
      stage: labMode === 'manifest' ? 'campaign_brief' : 'qualifying_purchase',
      at: now,
    }],
  };

  insertStmt.run(id, JSON.stringify(session), now, now);
  return serializeSession(session);
}

function getSession(sessionId) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;
  return serializeSession(session);
}

function stageOrderFor(session) {
  return session?.labMode === 'manifest' ? MANIFEST_STAGE_ORDER : STAGE_ORDER;
}

function stageRank(stage, session) {
  const idx = stageOrderFor(session).indexOf(stage);
  return idx === -1 ? -1 : idx;
}

function advanceSession(sessionId, stage, meta = {}) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;

  const stageMeta = STAGE_META[stage];
  if (!stageMeta) return null;

  const nextRank = stageRank(stage, session);
  const currentRank = stageRank(session.stage, session);
  if (nextRank >= 0 && currentRank >= 0 && nextRank < currentRank) {
    return serializeSession(session);
  }

  const now = Date.now();

  if (stage === 'entry_opened') {
    const hasAccessPoint = session.events.some((e) => e.stage === 'access_point');
    if (!hasAccessPoint) {
      session.events.push({ stage: 'access_point', at: now });
    }
    if (!session.journeyStartedAt) {
      session.journeyStartedAt = now;
    }
  }

  session.stage = stage;
  if (stageMeta.component) {
    session.activeComponent = stageMeta.component;
  }
  session.updatedAt = now;

  if (meta.mobile) {
    const digits = String(meta.mobile).replace(/\D/g, '');
    session.mobileMasked = digits.length >= 4
      ? `${digits.slice(0, 4)}****`
      : '****';
  }
  if (meta.customerName) {
    session.customerName = String(meta.customerName).trim().replace(/\s+/g, ' ');
  }
  if (meta.claimId) session.claimId = meta.claimId;
  if (meta.result) {
    session.result = meta.result;
    session.isWinner = meta.result !== 'NOT_WINNER';
  }
  if (meta.prizeName) session.prizeName = meta.prizeName;

  if (session.labMode === 'manifest' && (meta.prizeCount != null || meta.seedHash || meta.sampleAuditHash)) {
    session.manifestInfo = {
      ...(session.manifestInfo || {}),
      prizeCount: meta.prizeCount ?? session.manifestInfo?.prizeCount,
      windowHours: meta.windowHours ?? session.manifestInfo?.windowHours,
      seedHash: meta.seedHash ?? session.manifestInfo?.seedHash,
      sampleAuditHash: meta.sampleAuditHash ?? session.manifestInfo?.sampleAuditHash,
      generatedAt: stage === 'manifest_ready' ? now : session.manifestInfo?.generatedAt,
    };
  }

  session.events.push({ stage, at: now, ...meta });
  saveSession(session);
  return serializeSession(session);
}

function updateSessionAccessPoint(sessionId, patch = {}) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;

  if (patch.accessPointId !== undefined) {
    session.accessPointId = String(patch.accessPointId).trim() || session.accessPointId;
  }
  if (patch.storeId !== undefined) {
    session.storeId = patch.storeId ? String(patch.storeId).trim() : null;
  }
  if (patch.storeLocation !== undefined) {
    session.storeLocation = patch.storeLocation ? String(patch.storeLocation).trim() : null;
  }

  session.updatedAt = Date.now();
  saveSession(session);
  return serializeSession(session);
}

function updateSessionRules(sessionId, patch = {}) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;

  const allowedSpend = [15, 25, 50, 75, 100, 150, 200];
  const nextRules = { ...session.rules };

  if (patch.minSpend !== undefined) {
    const value = Number(patch.minSpend);
    if (!allowedSpend.includes(value)) return null;
    nextRules.minSpend = value;
  }

  if (patch.allowDuplicateReceipts !== undefined) {
    nextRules.allowDuplicateReceipts = Boolean(patch.allowDuplicateReceipts);
  }

  const now = Date.now();
  session.rules = nextRules;
  session.updatedAt = now;
  saveSession(session);
  return serializeSession(session);
}

function attachClaimToSession(sessionId, claimId) {
  const claim = db.prepare(
    'SELECT result, prizeName FROM claims WHERE claimId = ?'
  ).get(claimId);
  if (!claim) return null;

  return advanceSession(sessionId, 'instant_win_outcome', {
    claimId,
    result: claim.result,
    prizeName: claim.prizeName,
  });
}

function getSessionReport(sessionId) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;

  const sessionView = serializeSession(session);
  if (!session.claimId) {
    return { session: sessionView, report: null };
  }

  const claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(session.claimId);
  if (!claim) {
    return { session: sessionView, report: null };
  }

  const receiptUrl = claim.receiptFilename ? `/uploads/${claim.receiptFilename}` : null;

  return {
    session: sessionView,
    report: {
      customerName: claim.customerName || session.customerName || null,
      mobile: session.mobileMasked || maskMobile(claim.mobile),
      accessPointLabel: formatAccessPointLabel(session),
      accessPointId: session.accessPointId,
      storeId: session.storeId,
      storeLocation: session.storeLocation,
      retailer: session.retailer,
      receiptNumber: claim.receiptNumber,
      spendAmount: claim.spendAmount,
      selectedBrand: claim.selectedBrand,
      productDescription: claim.productDescription,
      purchaseDate: claim.purchaseDate,
      purchaseTime: claim.purchaseTime,
      storeName: claim.storeName,
      receiptSource: claim.receiptSource,
      verificationMethod: claim.verificationMethod,
      result: claim.result,
      prizeName: claim.prizeName,
      claimStatus: claim.claimStatus,
      claimId: claim.claimId,
      receiptUrl,
      receiptIsPdf: Boolean(receiptUrl && /\.pdf$/i.test(receiptUrl)),
      submittedAt: claim.createdAt,
      journeyStartedAt: session.journeyStartedAt,
      minSpend: session.rules?.minSpend ?? null,
      storeEmail: getStoreEmailPreview(claim),
      redemptionStatus: claim.redemptionStatus || null,
      redemptionStatusLabel: redemptionStatusLabel(claim.redemptionStatus),
      fulfilledBy: claim.fulfilledBy || null,
      fulfilledAt: claim.fulfilledAt || null,
    },
  };
}

function findSessionIdByClaimId(claimId) {
  if (!claimId) return null;
  pruneExpired();
  const cutoff = Date.now() - SESSION_TTL_MS;
  const rows = db.prepare('SELECT payload FROM lab_sessions WHERE createdAt >= ?').all(cutoff);
  for (const row of rows) {
    try {
      const session = JSON.parse(row.payload);
      if (session.claimId === claimId) return session.id;
    } catch {
      /* ignore corrupt session */
    }
  }
  return null;
}

function notifyClaimFulfilment(claimId, meta = {}) {
  const sessionId = findSessionIdByClaimId(claimId);
  if (!sessionId) return null;
  const status = meta.redemptionStatus || 'FULFILLED';
  return advanceSession(sessionId, 'prize_fulfilled', {
    fulfilledBy: meta.fulfilledBy || null,
    fulfilledAt: meta.fulfilledAt ?? null,
    redemptionStatus: status,
    redemptionStatusLabel: redemptionStatusLabel(status),
  });
}

function notifyStoreEmailSent(claimId, meta = {}) {
  const sessionId = findSessionIdByClaimId(claimId);
  if (!sessionId) return null;
  const session = loadSession(sessionId);
  if (!session) return null;
  const claim = db.prepare('SELECT redemptionStatus FROM claims WHERE claimId = ?').get(claimId);
  const status = claim?.redemptionStatus || 'AWAITING_FULFILMENT';
  return advanceSession(sessionId, 'store_email_sent', {
    emailStatus: meta.emailStatus || null,
    redemptionStatus: status,
    redemptionStatusLabel: redemptionStatusLabel(status),
  });
}

function generateSessionManifest(sessionId, windowHours = 24) {
  const session = loadSession(sessionId);
  if (!session || session.labMode !== 'manifest') return null;

  const { generateManifest } = require('./manifestGenerator');
  const seed = process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed';
  const hours = Math.max(1, Math.min(168, Number(windowHours) || 24));

  advanceSession(sessionId, 'generating_manifest');
  const prizes = generateManifest(seed, hours, session.campaignId);
  const sample = prizes[0] || {};

  return advanceSession(sessionId, 'manifest_ready', {
    prizeCount: prizes.length,
    windowHours: hours,
    seedHash: sample.seedHash || null,
    sampleAuditHash: sample.auditHash || null,
  });
}

module.exports = {
  STAGE_META,
  createSession,
  getSession,
  getSessionReport,
  advanceSession,
  updateSessionRules,
  updateSessionAccessPoint,
  attachClaimToSession,
  notifyClaimFulfilment,
  notifyStoreEmailSent,
  generateSessionManifest,
};
