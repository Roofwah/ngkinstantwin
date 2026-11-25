const express = require('express');
const router = express.Router();
const { log } = require('../services/auditLogger');
const {
  getClaimByFulfilmentToken,
  markFulfilled,
  redemptionStatusLabel,
} = require('../services/redemption');
const { notifyClaimFulfilment } = require('../services/labSession');
const { HOKA_STORE_NAME, maskMobile } = require('../lib/hokaCampaign');
const { NITERRA_CAMPAIGN_ID, NITERRA_STORE_NAME } = require('../lib/niterraCampaign');
const { AUDI_STORE_NAME } = require('../lib/audiCampaign');
const {
  publicStaffQrContext,
  claimPrizeValue,
  publicPrizeLabel,
  customerQrSettings,
} = require('../lib/customerQr');

/** Never fall back to Cotswold — that was leaking onto every non-Niterra win. */
function defaultStoreName(claim) {
  const qr = customerQrSettings(claim);
  if (qr?.storeName) return qr.storeName;
  if (claim.campaignId === NITERRA_CAMPAIGN_ID
    || claim.verificationMethod === 'niterra_crossword') {
    return NITERRA_STORE_NAME;
  }
  if (claim.campaignId === 'hoka-2026') return HOKA_STORE_NAME;
  if (claim.campaignId === 'audi-2026') return AUDI_STORE_NAME;
  if (claim.campaignId === 'guinness-2026') return 'Shamrock Arms';
  if (claim.campaignId === 'loves-2026') return 'Loves Travel Stop Rock Falls IL';
  return 'Demo Store';
}

function publicFulfilment(claim) {
  if (!claim) return null;
  const prizeValue = claimPrizeValue(claim);
  return {
    campaignId: claim.campaignId || null,
    verificationMethod: claim.verificationMethod || null,
    storeName: claim.storeName || defaultStoreName(claim),
    winner: claim.customerName || '—',
    mobile: maskMobile(claim.mobile),
    purchase: claim.selectedBrand || '—',
    purchaseValue: Number(claim.spendAmount || 0),
    prize: publicPrizeLabel(claim),
    prizeValue,
    redemptionCode: claim.redemptionCode || '—',
    status: claim.redemptionStatus || 'AWAITING_FULFILMENT',
    statusLabel: redemptionStatusLabel(claim.redemptionStatus),
    fulfilledAt: claim.fulfilledAt || null,
    fulfilledBy: claim.fulfilledBy || null,
    ...publicStaffQrContext(claim),
  };
}

router.get('/:token', (req, res) => {
  const claim = getClaimByFulfilmentToken(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Fulfilment record not found' });
  res.json(publicFulfilment(claim));
});

router.post('/:token/complete', (req, res) => {
  const fulfilmentOutcome = req.body?.outcome === 'ship_to_store'
    ? 'ship_to_store'
    : 'fulfilled';
  const outcome = markFulfilled(
    req.params.token,
    req.body?.fulfilledBy,
    fulfilmentOutcome,
    { allowExpired: req.body?.overrideExpired === true },
  );
  if (outcome.error) return res.status(outcome.status || 400).json({ error: outcome.error });

  if (!outcome.already) {
    notifyClaimFulfilment(outcome.claim.claimId, {
      fulfilledBy: outcome.claim.fulfilledBy,
      fulfilledAt: outcome.claim.fulfilledAt,
      redemptionStatus: outcome.claim.redemptionStatus,
    });
    log(outcome.outcome === 'ship_to_store' ? 'prize_ship_to_store' : 'hoka_prize_fulfilled', {
      claimId: outcome.claim.claimId,
      details: {
        redemptionCode: outcome.claim.redemptionCode,
        redemptionStatus: outcome.claim.redemptionStatus,
        fulfilledAt: outcome.claim.fulfilledAt,
        fulfilledBy: outcome.claim.fulfilledBy,
        redeemedAfterExpiry: Boolean(outcome.claim.redeemedAfterExpiry),
      },
    });
  }

  res.json({
    ...publicFulfilment(outcome.claim),
    alreadyFulfilled: outcome.already,
  });
});

module.exports = router;
