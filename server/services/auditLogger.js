const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function log(action, { claimId, prizeId, details } = {}) {
  const id = uuidv4();
  const timestamp = Date.now();
  const detailsStr = details ? JSON.stringify(details) : null;

  // Chain hash for tamper-evidence: each entry includes the previous entry's hash
  const lastLog = db.prepare('SELECT hash FROM audit_log ORDER BY timestamp DESC LIMIT 1').get();
  const prevHash = lastLog ? lastLog.hash : '0'.repeat(64);

  const hash = crypto
    .createHash('sha256')
    .update(`${id}:${timestamp}:${action}:${claimId || ''}:${prizeId || ''}:${detailsStr || ''}:${prevHash}`)
    .digest('hex');

  db.prepare(`
    INSERT INTO audit_log (id, timestamp, action, claimId, prizeId, details, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, timestamp, action, claimId || null, prizeId || null, detailsStr, hash);

  return { id, timestamp, action, claimId, prizeId, details, hash };
}

module.exports = { log };
