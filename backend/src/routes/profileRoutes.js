const express = require('express');
const router = express.Router();
const {
  createProfile,
  joinProfile,
  getProfile,
  getMembers,
  updatePriorities,
  updatePasscode
} = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireProfileMember } = require('../middleware/roleMiddleware');

router.post('/', requireAuth, createProfile);
router.post('/join', requireAuth, joinProfile);

router.get('/:id', requireAuth, requireProfileMember(), getProfile);
router.get('/:id/members', requireAuth, requireProfileMember(), getMembers);

// Only Primary Caretaker can reorder priorities or update shared passcode
router.put('/:id/members/priority', requireAuth, requireProfileMember(['primary_caretaker']), updatePriorities);
router.put('/:id/passcode', requireAuth, requireProfileMember(['primary_caretaker']), updatePasscode);

module.exports = router;
