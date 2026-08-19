const express = require('express');
const router = express.Router();
const { log } = require('../services/auditLogger');
const { getClaimByFulfilmentToken, markFulfilled } = require('../services/redemption');
const { HOKA_STORE_NAME, maskMobile } = require('../lib/hokaCampaign');

function publicFulfilment(claim) {
  if (!claim) return null;
  return {
    storeName: claim.storeName || HOKA_STORE_NAME,
    winner: claim.customerName || '—',
    mobile: maskMobile(claim.mobile),
    purchase: claim.selectedBrand || '—',
    purchaseValue: Number(claim.spendAmount || 0),
    prize: claim.prizeName || '—',
    redemptionCode: claim.redemptionCode || '—',
    status: claim.redemptionStatus || 'AWAITING_FULFILMENT',
    fulfilledAt: claim.fulfilledAt || null,
    fulfilledBy: claim.fulfilledBy || null,
  };
}

router.get('/:token', (req, res) => {
  const claim = getClaimByFulfilmentToken(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Fulfilment record not found' });
  res.json(publicFulfilment(claim));
});

router.post('/:token/complete', (req, res) => {
  const outcome = markFulfilled(req.params.token, req.body?.fulfilledBy);
  if (outcome.error) return res.status(outcome.status || 400).json({ error: outcome.error });

  if (!outcome.already) {
    log('hoka_prize_fulfilled', {
      claimId: outcome.claim.claimId,
      details: {
        redemptionCode: outcome.claim.redemptionCode,
        fulfilledAt: outcome.claim.fulfilledAt,
        fulfilledBy: outcome.claim.fulfilledBy,
      },
    });
  }

  res.json({
    ...publicFulfilment(outcome.claim),
    alreadyFulfilled: outcome.already,
  });
});

module.exports = router;
