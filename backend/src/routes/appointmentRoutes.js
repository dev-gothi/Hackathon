const express = require('express');
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember } = require('../middleware/roleMiddleware');

router.get('/profiles/:id/appointments', requireAuth, requireProfileMember(), getAppointments);
router.post('/profiles/:id/appointments', requireAuth, requireProfileMember(['primary_caretaker', 'secondary_caretaker']), createAppointment);
router.put('/appointments/:id', requireAuth, updateAppointment);
router.delete('/appointments/:id', requireAuth, deleteAppointment);

module.exports = router;
