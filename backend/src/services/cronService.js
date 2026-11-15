const cron = require('node-cron');
const { query, run, get } = require('../config/db');
const {
  sendUpcomingDoseReminder,
  sendMissedDoseEscalation,
  sendAppointmentReminder
} = require('./emailService');

/**
 * Generates dose_logs rows for all active medication schedules for a given date
 * @param {string} dateStr - 'YYYY-MM-DD' format (default today)
 */
const generateDailyDoseLogs = (dateStr = null) => {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat
  const formattedDate = targetDate.toISOString().split('T')[0];

  const activeSchedules = query(`
    SELECT ms.id as schedule_id, ms.time_of_day, ms.days_of_week, ms.grace_period_mins,
           m.id as medication_id, m.name as med_name, m.care_profile_id
    FROM medication_schedules ms
    JOIN medications m ON ms.medication_id = m.id
    WHERE m.is_active = 1
      AND date(m.start_date) <= date(?)
      AND (m.end_date IS NULL OR date(m.end_date) >= date(?))
  `, [formattedDate, formattedDate]);

  let generatedCount = 0;

  for (const sched of activeSchedules) {
    const activeDays = sched.days_of_week.split(',').map(d => parseInt(d.trim(), 10));
    if (!activeDays.includes(dayOfWeek)) continue;

    const scheduledTimestamp = `${formattedDate} ${sched.time_of_day}:00`;

    // Check if dose_log already exists
    const existing = get(`
      SELECT id FROM dose_logs 
      WHERE medication_schedule_id = ? AND scheduled_time = ?
    `, [sched.schedule_id, scheduledTimestamp]);

    if (!existing) {
      run(`
        INSERT INTO dose_logs (care_profile_id, medication_schedule_id, scheduled_time, status)
        VALUES (?, ?, ?, 'pending')
      `, [sched.care_profile_id, sched.schedule_id, scheduledTimestamp]);
      generatedCount++;
    }
  }

  return generatedCount;
};

/**
 * Checks for doses due in next 15 minutes and sends reminders
 */
const checkUpcomingReminders = async () => {
  const upcomingDoses = query(`
    SELECT dl.id as dose_id, dl.care_profile_id, dl.scheduled_time,
           m.name as med_name, m.dosage,
           cp.display_name as patient_name, cp.elderly_user_id
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    JOIN care_profiles cp ON dl.care_profile_id = cp.id
    WHERE dl.status = 'pending'
      AND datetime(dl.scheduled_time) >= datetime('now')
      AND datetime(dl.scheduled_time) <= datetime('now', '+15 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM notification_logs nl 
        WHERE nl.care_profile_id = dl.care_profile_id 
          AND nl.notification_type = 'upcoming_dose' 
          AND nl.subject LIKE '%' || m.name || '%'
          AND date(nl.sent_at) = date('now')
      )
  `);

  for (const dose of upcomingDoses) {
    // Notify primary caretaker and/or elderly user
    const recipients = query(`
      SELECT u.email, u.full_name, pm.role 
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? 
        AND (pm.role = 'primary_caretaker' OR pm.role = 'elderly')
        AND pm.notify_escalations = 1
    `, [dose.care_profile_id]);

    const timeFormatted = dose.scheduled_time.split(' ')[1].slice(0, 5);
    for (const rec of recipients) {
      await sendUpcomingDoseReminder(
        dose.care_profile_id,
        rec.email,
        dose.patient_name,
        dose.med_name,
        dose.dosage,
        timeFormatted
      );
    }
  }
};

/**
 * Checks for missed doses exceeding grace period and escalates through caretaker tiers
 */
const checkMissedDosesAndEscalate = async () => {
  // 1. Find pending doses that passed their grace period -> mark missed & trigger Tier 1
  const newlyMissed = query(`
    SELECT dl.id as dose_id, dl.care_profile_id, dl.scheduled_time,
           m.name as med_name, m.dosage, ms.grace_period_mins,
           cp.display_name as patient_name
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    JOIN care_profiles cp ON dl.care_profile_id = cp.id
    WHERE dl.status = 'pending'
      AND datetime('now') > datetime(dl.scheduled_time, '+' || ms.grace_period_mins || ' minutes')
  `);

  for (const dose of newlyMissed) {
    // Mark missed
    run(`
      UPDATE dose_logs 
      SET status = 'missed', escalation_level = 1, last_escalated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [dose.dose_id]);

    // Find Tier 1 caretaker (priority 1)
    const tier1Member = get(`
      SELECT u.email, u.full_name 
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? 
        AND pm.escalation_priority = 1
        AND pm.notify_escalations = 1
      LIMIT 1
    `, [dose.care_profile_id]);

    if (tier1Member) {
      await sendMissedDoseEscalation({
        careProfileId: dose.care_profile_id,
        email: tier1Member.email,
        recipientName: tier1Member.full_name,
        patientName: dose.patient_name,
        medName: dose.med_name,
        dosage: dose.dosage,
        scheduledTime: dose.scheduled_time,
        tier: 1
      });
    }
  }

  // 2. Find missed doses where Tier 1 was notified > 30 minutes ago and still unacknowledged -> escalate to Tier 2
  const unacknowledgedTier1 = query(`
    SELECT dl.id as dose_id, dl.care_profile_id, dl.scheduled_time, dl.last_escalated_at,
           m.name as med_name, m.dosage, cp.display_name as patient_name
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    JOIN care_profiles cp ON dl.care_profile_id = cp.id
    WHERE dl.status = 'missed'
      AND dl.acknowledged_by IS NULL
      AND dl.escalation_level = 1
      AND datetime('now') > datetime(dl.last_escalated_at, '+30 minutes')
  `);

  for (const dose of unacknowledgedTier1) {
    // Find Tier 2 caretaker (priority 2)
    const tier2Member = get(`
      SELECT u.email, u.full_name 
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? 
        AND pm.escalation_priority = 2
        AND pm.notify_escalations = 1
      LIMIT 1
    `, [dose.care_profile_id]);

    const tier1Member = get(`
      SELECT u.full_name FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? AND pm.escalation_priority = 1
      LIMIT 1
    `, [dose.care_profile_id]);

    if (tier2Member) {
      run(`
        UPDATE dose_logs 
        SET escalation_level = 2, last_escalated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [dose.dose_id]);

      await sendMissedDoseEscalation({
        careProfileId: dose.care_profile_id,
        email: tier2Member.email,
        recipientName: tier2Member.full_name,
        patientName: dose.patient_name,
        medName: dose.med_name,
        dosage: dose.dosage,
        scheduledTime: dose.scheduled_time,
        tier: 2,
        unresponsiveName: tier1Member?.full_name || 'Primary Caretaker'
      });
    } else {
      // No Tier 2 configured -> escalate to Terminal 99 (All Hands)
      run(`
        UPDATE dose_logs 
        SET escalation_level = 99, last_escalated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [dose.dose_id]);

      const allCaretakers = query(`
        SELECT u.email, u.full_name 
        FROM profile_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.care_profile_id = ? 
          AND pm.role IN ('primary_caretaker', 'secondary_caretaker')
          AND pm.notify_escalations = 1
      `, [dose.care_profile_id]);

      for (const ct of allCaretakers) {
        await sendMissedDoseEscalation({
          careProfileId: dose.care_profile_id,
          email: ct.email,
          recipientName: ct.full_name,
          patientName: dose.patient_name,
          medName: dose.med_name,
          dosage: dose.dosage,
          scheduledTime: dose.scheduled_time,
          tier: 99
        });
      }
    }
  }

  // 3. Find missed doses where Tier 2 was notified > 30 mins ago and still unacknowledged -> Terminal 99
  const unacknowledgedTier2 = query(`
    SELECT dl.id as dose_id, dl.care_profile_id, dl.scheduled_time,
           m.name as med_name, m.dosage, cp.display_name as patient_name
    FROM dose_logs dl
    JOIN medication_schedules ms ON dl.medication_schedule_id = ms.id
    JOIN medications m ON ms.medication_id = m.id
    JOIN care_profiles cp ON dl.care_profile_id = cp.id
    WHERE dl.status = 'missed'
      AND dl.acknowledged_by IS NULL
      AND dl.escalation_level = 2
      AND datetime('now') > datetime(dl.last_escalated_at, '+30 minutes')
  `);

  for (const dose of unacknowledgedTier2) {
    run(`
      UPDATE dose_logs 
      SET escalation_level = 99, last_escalated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [dose.dose_id]);

    const allCaretakers = query(`
      SELECT u.email, u.full_name 
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? 
        AND pm.role IN ('primary_caretaker', 'secondary_caretaker')
        AND pm.notify_escalations = 1
    `, [dose.care_profile_id]);

    for (const ct of allCaretakers) {
      await sendMissedDoseEscalation({
        careProfileId: dose.care_profile_id,
        email: ct.email,
        recipientName: ct.full_name,
        patientName: dose.patient_name,
        medName: dose.med_name,
        dosage: dose.dosage,
        scheduledTime: dose.scheduled_time,
        tier: 99
      });
    }
  }
};

/**
 * Checks for doctor appointments in the next 24 hours
 */
const checkUpcomingAppointments = async () => {
  const upcomingAppts = query(`
    SELECT a.*, cp.display_name as patient_name
    FROM appointments a
    JOIN care_profiles cp ON a.care_profile_id = cp.id
    WHERE a.reminder_sent = 0
      AND datetime(a.appointment_datetime) >= datetime('now')
      AND datetime(a.appointment_datetime) <= datetime('now', '+24 hours')
  `);

  for (const appt of upcomingAppts) {
    // Notify all profile members who have notify_appointments = 1 (including Family Viewers!)
    const members = query(`
      SELECT u.email, u.full_name
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? AND pm.notify_appointments = 1
    `, [appt.care_profile_id]);

    for (const mem of members) {
      await sendAppointmentReminder(
        appt.care_profile_id,
        mem.email,
        appt.patient_name,
        appt.doctor_name,
        appt.specialty,
        appt.appointment_datetime,
        appt.location,
        appt.notes
      );
    }

    run(`UPDATE appointments SET reminder_sent = 1 WHERE id = ?`, [appt.id]);
  }
};

/**
 * Full manual trigger cycle for demo / tests
 */
const triggerCronCycleManually = async () => {
  console.log('🔄 [CRON TRIGGER] Running manual check cycle...');
  const dosesGenerated = generateDailyDoseLogs();
  await checkUpcomingReminders();
  await checkMissedDosesAndEscalate();
  await checkUpcomingAppointments();
  return { success: true, dosesGenerated, timestamp: new Date().toISOString() };
};

/**
 * Start recurring cron jobs
 */
const startCronJobs = () => {
  // Midnight generation of daily doses: 00:01 AM every day
  cron.schedule('1 0 * * *', () => {
    console.log('⏰ [CRON] Nightly dose log generator running...');
    generateDailyDoseLogs();
  });

  // Run reminder & escalation evaluation every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      await checkUpcomingReminders();
      await checkMissedDosesAndEscalate();
      await checkUpcomingAppointments();
    } catch (err) {
      console.error('❌ [CRON ERROR]:', err.message);
    }
  });

  // Initial dose generation on boot
  generateDailyDoseLogs();
  console.log('✅ Cron scheduler initialized (nightly generator + 2-min escalation loops).');
};

module.exports = {
  startCronJobs,
  generateDailyDoseLogs,
  checkMissedDosesAndEscalate,
  checkUpcomingReminders,
  checkUpcomingAppointments,
  triggerCronCycleManually
};
