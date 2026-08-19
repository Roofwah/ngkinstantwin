const { randomBytes } = require('crypto');
const { resolveClientBaseUrl } = require('../lib/baseUrl');
const db = require('../db');

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
  purchase_validated: { label: 'Purchase validated', component: 'rri' },
  submitting: { label: 'Submitting claim', component: 'pure_random' },
  checking_instant_win: { label: 'Checking instant win', component: 'pure_random' },
  instant_win_outcome: { label: 'Instant win outcome', component: 'pure_random' },
  prize_allocated: { label: 'Prize allocated', component: 'prize' },
  reporting: { label: 'Campaign reporting', component: 'reporting' },
};

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
  'reporting',
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

function buildEntryUrl(session) {
  const base = buildPhoneBaseUrl(session);
  return `${base}/enter?labSession=${session.id}&campaign=${encodeURIComponent(session.campaignId)}`;
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

function serializeSession(session) {
  const stage = normalizePresentationStage(session);
  const meta = STAGE_META[stage] || STAGE_META[session.stage] || { label: stage, component: null };
  const joinedAt = session.journeyStartedAt
    || session.events?.find((e) => e.stage === 'entry_opened')?.at
    || null;
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
    stageLabel: meta.label,
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
  clientOrigin = null,
  labConfigId = null,
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
    campaignId,
    campaignName: campaignName || campaignId,
    retailer: retailer || null,
    store: store || null,
    accessPointType,
    accessPointId,
    storeId: storeId || null,
    storeLocation: storeLocation || null,
    stage: 'qualifying_purchase',
    activeComponent: 'access_point',
    mobileMasked: null,
    customerName: null,
    claimId: null,
    result: null,
    isWinner: null,
    prizeName: null,
    journeyStartedAt: null,
    rules: {
      minSpend: rules?.minSpend ?? 15,
      allowDuplicateReceipts: rules?.allowDuplicateReceipts !== undefined
        ? Boolean(rules.allowDuplicateReceipts)
        : true,
    },
    createdAt: now,
    updatedAt: now,
    events: [{ stage: 'qualifying_purchase', at: now }],
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

function stageRank(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? -1 : idx;
}

function advanceSession(sessionId, stage, meta = {}) {
  pruneExpired();
  const session = loadSession(sessionId);
  if (!session) return null;

  const stageMeta = STAGE_META[stage];
  if (!stageMeta) return null;

  const nextRank = stageRank(stage);
  const currentRank = stageRank(session.stage);
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

  const allowedSpend = [15, 25, 50, 75, 100];
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
    },
  };
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
};
