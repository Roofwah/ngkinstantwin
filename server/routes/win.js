const express = require('express');
const router = express.Router();
const { getClaimByFulfilmentToken } = require('../services/redemption');
const { publicCustomerWin } = require('../lib/customerQr');
const { appBaseUrl } = require('../services/winnerNotify');

router.get('/:token', (req, res) => {
  const claim = getClaimByFulfilmentToken(req.params.token);
  const payload = claim ? publicCustomerWin(claim, appBaseUrl()) : null;
  if (!payload) return res.status(404).json({ error: 'Winning record not found' });
  res.json(payload);
});

module.exports = router;
