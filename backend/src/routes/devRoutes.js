const express = require('express');
const router = express.Router();
const { triggerCronCycleManually } = require('../services/cronService');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/trigger-cron', requireAuth, async (req, res) => {
  try {
    const result = await triggerCronCycleManually();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
