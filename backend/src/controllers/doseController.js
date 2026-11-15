const { query, get, run } = require('../config/db');
const { generateDailyDoseLogs } = require('../services/cronService');

const getTodayDoses = (req, res) => {
  // Ensure today's doses exist via JIT generator
  generateDailyDoseLogs();

  const doses = query(`
    SELECT dl.id as dose_log_id, dl.care_profile_id, dl.scheduled_time, 
           dl.status, dl.action_taken_at, dl.action_taken_by,
           dl.escalation_level, dl.last_escalated_at, dl.acknowledged_by,
           m.name as medication_name, m.dosage, m.instructions,
           ms.grace_period_mins,
           u_act.full_name as action_by_name,
           u_ack.full_name as acknowledged_by_name
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    LEFT JOIN users u_act ON dl.action_taken_by = u_act.id
    LEFT JOIN users u_ack ON dl.acknowledged_by = u_ack.id
    WHERE dl.care_profile_id = ?
      AND date(dl.scheduled_time) = date('now')
    ORDER BY dl.scheduled_time ASC
  `, [req.careProfileId]);

  res.json({ doses });
};

const recordDoseAction = (req, res) => {
  const { status } = req.body;
  if (!['taken', 'skipped', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be taken, skipped, or pending.' });
  }

  run(`
    UPDATE dose_logs
    SET status = ?,
        action_taken_at = CURRENT_TIMESTAMP,
        action_taken_by = ?
    WHERE id = ?
  `, [status, req.user.id, req.dose.id]);

  const updated = get(`
    SELECT dl.*, m.name as medication_name, m.dosage 
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    WHERE dl.id = ?
  `, [req.dose.id]);

  res.json({
    message: `Dose marked as ${status}.`,
    dose: updated
  });
};

const acknowledgeDoseEscalation = (req, res) => {
  run(`
    UPDATE dose_logs
    SET acknowledged_by = ?
    WHERE id = ?
  `, [req.user.id, req.dose.id]);

  res.json({
    message: `Escalation alarm acknowledged by ${req.user.full_name}. Care circle alert cleared.`,
    acknowledged_by: req.user.full_name,
    acknowledged_at: new Date().toISOString()
  });
};

module.exports = {
  getTodayDoses,
  recordDoseAction,
  acknowledgeDoseEscalation
};
