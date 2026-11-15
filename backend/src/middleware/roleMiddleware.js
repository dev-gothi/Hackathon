const { get } = require('../config/db');

/**
 * Middleware to verify user is a member of the requested care_profile
 * and optionally checks if their role is permitted.
 * @param {string[]} allowedRoles - optional list of allowed roles e.g. ['primary_caretaker', 'secondary_caretaker']
 */
const requireProfileMember = (allowedRoles = []) => {
  return (req, res, next) => {
    const profileId = req.params.id || req.params.profileId || req.body.care_profile_id || req.query.care_profile_id;
    if (!profileId) {
      return res.status(400).json({ error: 'Care profile ID is required.' });
    }

    const membership = get(
      `SELECT pm.*, cp.display_name as profile_name, cp.elderly_user_id
       FROM profile_members pm
       JOIN care_profiles cp ON pm.care_profile_id = cp.id
       WHERE pm.care_profile_id = ? AND pm.user_id = ?`,
      [profileId, req.user.id]
    );

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this care circle.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      if (membership.role === 'family_viewer') {
        return res.status(403).json({ error: 'Access denied: Family Viewers have read-only permissions.' });
      }
      return res.status(403).json({ error: `Access denied: Action requires one of: ${allowedRoles.join(', ')}.` });
    }

    req.membership = membership;
    req.careProfileId = Number(profileId);
    next();
  };
};

/**
 * Middleware to check dose access specifically
 * Handles /api/doses/:doseLogId/...
 */
const requireDoseAccess = (actionType = 'action') => {
  return (req, res, next) => {
    const doseLogId = req.params.doseLogId || req.params.id;
    if (!doseLogId) {
      return res.status(400).json({ error: 'Dose log ID is required.' });
    }

    const dose = get(
      `SELECT dl.*, cp.display_name as profile_name, cp.elderly_user_id, pm.role as user_role
       FROM dose_logs dl
       JOIN care_profiles cp ON dl.care_profile_id = cp.id
       LEFT JOIN profile_members pm ON pm.care_profile_id = cp.id AND pm.user_id = ?
       WHERE dl.id = ?`,
      [req.user.id, doseLogId]
    );

    if (!dose || !dose.user_role) {
      return res.status(403).json({ error: 'Access denied: You do not have access to this dose schedule.' });
    }

    if (actionType === 'action') {
      // family_viewer cannot mark doses
      if (dose.user_role === 'family_viewer') {
        return res.status(403).json({ error: 'Access denied: Family viewers cannot record or modify dose actions.' });
      }
      // elderly can only act on their own care profile
      if (dose.user_role === 'elderly' && dose.elderly_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: You can only record doses for your own profile.' });
      }
    } else if (actionType === 'acknowledge') {
      // only caretakers can acknowledge escalation alarms
      if (!['primary_caretaker', 'secondary_caretaker'].includes(dose.user_role)) {
        return res.status(403).json({ error: 'Access denied: Only Primary or Secondary Caretakers can acknowledge escalations.' });
      }
    }

    req.dose = dose;
    next();
  };
};

module.exports = {
  requireProfileMember,
  requireDoseAccess
};
