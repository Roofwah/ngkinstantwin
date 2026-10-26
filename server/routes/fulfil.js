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
const { publicStaffQrContext } = require('../lib/customerQr');

function defaultStoreName(claim) {
  if (claim.campaignId === NITERRA_CAMPAIGN_ID
    || claim.verificationMethod === 'niterra_crossword') {
    return NITERRA_STORE_NAME;
  }
  return HOKA_STORE_NAME;
}

function publicFulfilment(claim) {
  if (!claim) return null;
  return {
    campaignId: claim.campaignId || null,
    verificationMethod: claim.verificationMethod || null,
    storeName: claim.storeName || defaultStoreName(claim),
    winner: claim.customerName || '—',
    mobile: maskMobile(claim.mobile),
    purchase: claim.selectedBrand || '—',
    purchaseValue: Number(claim.spendAmount || 0),
    prize: claim.prizeName || '—',
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
