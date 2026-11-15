const express = require('express');
const router = express.Router();
const {
  getTodayCheckin,
  submitCheckin,
  getCheckinHistory
} = require('../controllers/checkinController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember } = require('../middleware/roleMiddleware');

router.get('/profiles/:id/checkin/today', requireAuth, requireProfileMember(), getTodayCheckin);
router.post('/profiles/:id/checkin', requireAuth, requireProfileMember(), submitCheckin);
router.get('/profiles/:id/checkin/history', requireAuth, requireProfileMember(), getCheckinHistory);

module.exports = router;
