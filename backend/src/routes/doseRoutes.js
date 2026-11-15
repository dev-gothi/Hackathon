const express = require('express');
const router = express.Router();
const {
  getTodayDoses,
  recordDoseAction,
  acknowledgeDoseEscalation
} = require('../controllers/doseController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember, requireDoseAccess } = require('../middleware/roleMiddleware');

// Get today's doses for profile
router.get('/profiles/:id/doses/today', requireAuth, requireProfileMember(), getTodayDoses);

// Mark dose action (Elderly or Caretakers; Family Viewers blocked server-side)
router.post('/doses/:doseLogId/action', requireAuth, requireDoseAccess('action'), recordDoseAction);

// Acknowledge escalation alarm (Caretakers only)
router.post('/doses/:doseLogId/acknowledge', requireAuth, requireDoseAccess('acknowledge'), acknowledgeDoseEscalation);

module.exports = router;
