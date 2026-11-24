/**
 * Checks the Smirnoff customer-QR redemption rules against a temporary database.
 * Does not send SMS or email.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(os.tmpdir(), `smirnoff-qr-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;
process.env.DEMO_MODE = 'true';
process.env.PUBLIC_APP_URL = 'http://localhost:5173';

const db = require('../db');
const { attachRedemption, markFulfilled } = require('../services/redemption');
const { winnerSmsBody } = require('../services/winnerNotify');
const {
  armRedemptionWindow,
  publicCustomerWin,
  publicStaffQrContext,
} = require('../lib/customerQr');

const failures = [];

function check(name, ok, detail) {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function insertClaim({ claimId, campaignId, storeName, prizeName, customerName }) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO claims (
      claimId, mobile, customerName, receiptNumber, spendAmount, selectedBrand,
      termsAccepted, result, claimStatus, createdAt, storeName, campaignId, prizeName
    ) VALUES (?, '0412345678', ?, ?, 0, 'Smirnoff', 1, 'TIER_1_INSTANT_WIN', 'VALIDATED', ?, ?, ?, ?)
  `).run(
    claimId,
    customerName,
    `${claimId}-receipt`,
    now,
    storeName,
    campaignId,
    prizeName,
  );
}

insertClaim({
  claimId: 'hoka-claim',
  campaignId: 'hoka-2026',
  storeName: 'Cotswold Outdoor Birmingham',
  prizeName: 'HOKA Run Cap',
  customerName: 'Alex Runner',
});
attachRedemption('hoka-claim');
const hoka = db.prepare('SELECT * FROM claims WHERE claimId = ?').get('hoka-claim');
const hokaSms = winnerSmsBody(hoka);
check('existing campaign SMS keeps the redemption code', hokaSms.includes(hoka.redemptionCode));
check('existing campaign SMS has no winning-page link', !hokaSms.includes('/win/'));
check('existing campaign has no redemption expiry', !hoka.redemptionExpiresAt);

const hokaResult = markFulfilled(hoka.fulfilmentToken, 'Sam Staff');
check('existing campaign fulfils without a redemption window', hokaResult.already === false && hokaResult.claim.redemptionStatus === 'FULFILLED');
const hokaAgain = markFulfilled(hoka.fulfilmentToken, 'Other Staff');
check('existing campaign cannot be fulfilled twice', hokaAgain.already === true);

insertClaim({
  claimId: 'smirnoff-claim',
  campaignId: 'smirnoff-2026',
  storeName: 'Thirsty Camel Coolum',
  prizeName: 'Smirnoff Limited Edition Cap',
  customerName: 'Stephen Smith',
});
attachRedemption('smirnoff-claim');
let smirnoff = armRedemptionWindow(db.prepare('SELECT * FROM claims WHERE claimId = ?').get('smirnoff-claim'));
const firstExpiry = smirnoff.redemptionExpiresAt;
smirnoff = armRedemptionWindow(smirnoff);
check('countdown start is stored once', smirnoff.redemptionExpiresAt === firstExpiry && firstExpiry > Date.now());

const sms = winnerSmsBody(smirnoff);
check('winner SMS includes the prize and venue', sms.includes('Smirnoff Limited Edition Cap') && sms.includes('Thirsty Camel Coolum'));
check('winner SMS includes the 30 minute instruction', sms.includes('within 30 minutes'));
check('winner SMS includes the winning page link', sms.includes(`http://localhost:5173/win/${smirnoff.fulfilmentToken}`));
check('winner SMS keeps the redemption code', sms.includes(`Redemption code: ${smirnoff.redemptionCode}`));

const page = publicCustomerWin(smirnoff, 'http://localhost:5173');
const reopened = publicCustomerWin(
  db.prepare('SELECT * FROM claims WHERE claimId = ?').get('smirnoff-claim'),
  'http://localhost:5173',
);
check('reopening the page does not restart the countdown', page.expiresAt === reopened.expiresAt && page.expiresAt === firstExpiry);
check('customer QR points at the existing fulfilment page', page.staffScanUrl === `http://localhost:5173/fulfil/${smirnoff.fulfilmentToken}`);
check('customer QR is available before redemption', page.qrAvailable === true && page.expired === false);

const staffBefore = publicStaffQrContext(smirnoff);
check('static demo flow does not invent a PUK QR time', staffBefore.pukQrGeneratedAt == null && staffBefore.eligiblePurchaseWindow == null);
check('prize awarded time is the claim time', staffBefore.prizeAwardedAt === smirnoff.createdAt);

db.prepare(`
  INSERT INTO issued_tokens (
    id, token, tokenHash, campaignId, deviceId, storeCode, issuedAt, expiresAt, status, claimId
  ) VALUES ('tok-1', 'PR-TESTTOK', 'hash', 'smirnoff-2026', 'device-demo-001', 'coolum', ?, ?, 'redeemed', 'smirnoff-claim')
`).run(smirnoff.createdAt - 60000, smirnoff.createdAt);
const staffWithToken = publicStaffQrContext(
  db.prepare('SELECT * FROM claims WHERE claimId = ?').get('smirnoff-claim'),
);
check(
  'real PUK issue time is shown with a purchase window',
  staffWithToken.pukQrGeneratedAt === smirnoff.createdAt - 60000
    && staffWithToken.eligiblePurchaseWindow.end === staffWithToken.pukQrGeneratedAt,
);

const fulfilled = markFulfilled(smirnoff.fulfilmentToken, 'Casey Counter');
check('staff confirmation fulfils the same claim', fulfilled.claim.redemptionStatus === 'FULFILLED' && fulfilled.claim.redeemedAfterExpiry === 0);
const duplicate = markFulfilled(smirnoff.fulfilmentToken, 'Casey Counter');
check('QR fulfilment blocks the email fulfilment path', duplicate.already === true);
const after = publicCustomerWin(
  db.prepare('SELECT * FROM claims WHERE claimId = ?').get('smirnoff-claim'),
  'http://localhost:5173',
);
check('customer page shows redeemed and hides the QR', after.redeemed === true && after.qrAvailable === false);

insertClaim({
  claimId: 'smirnoff-expired',
  campaignId: 'smirnoff-2026',
  storeName: 'Thirsty Camel Coolum',
  prizeName: 'Smirnoff Limited Edition Cap',
  customerName: 'Stephen Smith',
});
attachRedemption('smirnoff-expired');
db.prepare('UPDATE claims SET redemptionExpiresAt = ? WHERE claimId = ?').run(Date.now() - 1000, 'smirnoff-expired');
const expiredClaim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get('smirnoff-expired');
const expiredPage = publicCustomerWin(expiredClaim, 'http://localhost:5173');
check('expired page keeps the QR scannable', expiredPage.expired === true && expiredPage.qrAvailable === true);
const blocked = markFulfilled(expiredClaim.fulfilmentToken, 'Casey Counter');
check('expired redemption is blocked until staff verify', blocked.status === 409 && blocked.expired === true);
const overridden = markFulfilled(expiredClaim.fulfilmentToken, 'Casey Counter', 'fulfilled', { allowExpired: true });
check(
  'staff can redeem after expiry on the same claim',
  overridden.claim.redemptionStatus === 'FULFILLED' && overridden.claim.redeemedAfterExpiry === 1,
);
const expiredAgain = markFulfilled(expiredClaim.fulfilmentToken, 'Someone Else');
check('an expired override cannot be redeemed twice', expiredAgain.already === true);

check('other campaigns do not get a customer winning page', publicCustomerWin(hoka, 'http://localhost:5173') == null);

try { fs.unlinkSync(dbPath); } catch {}
try { fs.unlinkSync(`${dbPath}-wal`); } catch {}
try { fs.unlinkSync(`${dbPath}-shm`); } catch {}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll Smirnoff QR redemption checks passed');
