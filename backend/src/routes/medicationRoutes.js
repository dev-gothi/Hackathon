const express = require('express');
const router = express.Router();
const {
  getMedications,
  checkInteractionEndpoint,
  addMedication,
  updateMedication,
  deleteMedication
} = require('../controllers/medicationController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember } = require('../middleware/roleMiddleware');

// Profile-scoped routes
router.get('/profiles/:id/medications', requireAuth, requireProfileMember(), getMedications);
router.post('/profiles/:id/medications/check-interactions', requireAuth, requireProfileMember(), checkInteractionEndpoint);
router.post('/profiles/:id/medications', requireAuth, requireProfileMember(['primary_caretaker', 'secondary_caretaker']), addMedication);

// Direct medication item updates
router.put('/medications/:medId', requireAuth, updateMedication);
router.delete('/medications/:medId', requireAuth, deleteMedication);

module.exports = router;
