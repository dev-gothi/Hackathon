const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember } = require('../middleware/roleMiddleware');

router.get('/profiles/:id/analytics', requireAuth, requireProfileMember(), getAnalytics);

module.exports = router;
