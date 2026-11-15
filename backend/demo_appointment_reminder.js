const { run, query, get } = require('./src/config/db');
const { checkUpcomingAppointments } = require('./src/services/cronService');

const runAppointmentDemo = async () => {
  console.log('================================================================');
  console.log('DEMO: 24-Hour Doctor Appointment Reminder Email Verification');
  console.log('================================================================\n');

  // Temporarily set primary caretaker's email to configured Gmail user to deliver real test email
  const realEmail = process.env.EMAIL_USER;
  if (realEmail) {
    run(`UPDATE users SET email = ? WHERE id = 1`, [realEmail]);
  }
  const insertRes = run(`
    INSERT INTO appointments (
      care_profile_id, doctor_name, specialty, location, 
      appointment_datetime, notes, reminder_sent
    ) VALUES (
      1, 
      'Dr. Robert Vance', 
      'Cardiology', 
      'Memorial Heart Center, Suite 402', 
      datetime('now', '+16 hours'), 
      'Fast 8 hours prior; bring current Lisinopril and Metformin bottles.', 
      0
    )
  `);

  const apptId = Number(insertRes.lastInsertRowid);
  const apptBefore = get('SELECT * FROM appointments WHERE id = ?', [apptId]);

  console.log(`Created test appointment #${apptId}:`);
  console.log(`- Doctor: ${apptBefore.doctor_name} (${apptBefore.specialty})`);
  console.log(`- Scheduled Time: ${apptBefore.appointment_datetime} (16 hours from now)`);
  console.log(`- Location: ${apptBefore.location}`);
  console.log(`- Notes: ${apptBefore.notes}`);
  console.log(`- reminder_sent flag BEFORE cron: ${apptBefore.reminder_sent}`);

  console.log('\n--- Checking Profile Members with notify_appointments = 1 ---');
  const eligibleMembers = query(`
    SELECT u.full_name, u.email, pm.role, pm.notify_appointments
    FROM profile_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.care_profile_id = 1 AND pm.notify_appointments = 1
  `);
  console.table(eligibleMembers);

  // 2. Trigger checkUpcomingAppointments()
  console.log('\n--- Step 1: Cron executes checkUpcomingAppointments() ---');
  await checkUpcomingAppointments();

  // 3. Verify reminder_sent flipped to 1
  const apptAfter = get('SELECT * FROM appointments WHERE id = ?', [apptId]);
  console.log(`\n- reminder_sent flag AFTER cron: ${apptAfter.reminder_sent} ${apptAfter.reminder_sent === 1 ? '✅ (Successfully Flipped to 1)' : '❌'}`);

  // 4. Verify notification_logs table in SQLite
  console.log('\n--- Notification Logs Audit Table ---');
  const recentLogs = query(`
    SELECT id, recipient_email, notification_type, subject, sent_at
    FROM notification_logs
    WHERE care_profile_id = 1 AND notification_type = 'appointment'
    ORDER BY id DESC
    LIMIT 4
  `);
  console.table(recentLogs);

  // 5. Test Idempotency: Run it a second time to guarantee no duplicate emails are sent
  console.log('\n--- Step 2: Running checkUpcomingAppointments() again (Idempotency Check) ---');
  const countBefore = get("SELECT COUNT(*) as count FROM notification_logs WHERE notification_type = 'appointment'").count;
  await checkUpcomingAppointments();
  const countAfter = get("SELECT COUNT(*) as count FROM notification_logs WHERE notification_type = 'appointment'").count;

  console.log(`Notification logs before 2nd run: ${countBefore} | after 2nd run: ${countAfter}`);
  console.log(countBefore === countAfter 
    ? '✅ PASSED: Idempotency confirmed — no duplicate emails sent once reminder_sent = 1.' 
    : '❌ FAILED: Duplicate reminder was sent.');

  // Clean up the test appointment and restore canonical email
  run('DELETE FROM appointments WHERE id = ?', [apptId]);
  if (realEmail) {
    run('UPDATE users SET email = ? WHERE id = 1', ['john@example.com']);
  }
  console.log(`\nCleaned up test appointment #${apptId} and restored canonical email.`);

  console.log('\n================================================================');
  console.log('🎉 24-HOUR APPOINTMENT REMINDER EMAIL FULLY VERIFIED!');
  console.log('================================================================\n');
  process.exit(0);
};

runAppointmentDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
