const { run, query, get } = require('./src/config/db');
const { triggerCronCycleManually, checkMissedDosesAndEscalate } = require('./src/services/cronService');

const runDemo = async () => {
  console.log('================================================================');
  console.log('DEMO 1: Calling triggerCronCycleManually() (simulating /api/dev/trigger-cron)');
  console.log('================================================================\n');

  // Ensure database has fresh state
  require('./src/db/seed');

  // Trigger manual cron cycle
  const cronResult = await triggerCronCycleManually();
  console.log('\n[API Response /api/dev/trigger-cron]:', JSON.stringify(cronResult, null, 2));

  console.log('\n================================================================');
  console.log('DEMO 2: Tier 1 -> Tier 2 -> Terminal Tier 99 (All-Hands) Escalation');
  console.log('================================================================\n');

  // Insert a test scheduled dose that was scheduled 45 minutes ago (grace period is 30 mins)
  const doseInsert = run(`
    INSERT INTO dose_logs (care_profile_id, medication_schedule_id, scheduled_time, status, escalation_level)
    VALUES (1, 1, datetime('now', '-45 minutes'), 'pending', 0)
  `);
  const testDoseId = Number(doseInsert.lastInsertRowid);
  console.log(`Created test dose #${testDoseId} (scheduled 45 mins ago, status='pending', grace_period=30m).`);

  // Step 1: Cron runs -> Dose is past grace period -> Escalates to Tier 1
  console.log('\n--- Step 1: Cron evaluates overdue dose ---');
  await checkMissedDosesAndEscalate();

  let doseState = get('SELECT * FROM dose_logs WHERE id = ?', [testDoseId]);
  console.log(`Dose state: status="${doseState.status}", escalation_level=${doseState.escalation_level}, last_escalated_at="${doseState.last_escalated_at}"`);

  // Step 2: 30 minutes pass, Tier 1 has NOT acknowledged.
  console.log('\n--- Step 2: 31 minutes pass without acknowledgment from Tier 1 ---');
  run(`
    UPDATE dose_logs 
    SET last_escalated_at = datetime('now', '-31 minutes') 
    WHERE id = ?
  `, [testDoseId]);

  await checkMissedDosesAndEscalate();

  doseState = get('SELECT * FROM dose_logs WHERE id = ?', [testDoseId]);
  console.log(`Dose state: status="${doseState.status}", escalation_level=${doseState.escalation_level}, last_escalated_at="${doseState.last_escalated_at}"`);

  // Step 3: Another 30 minutes pass, Tier 2 has ALSO NOT acknowledged.
  console.log('\n--- Step 3: Another 31 minutes pass without acknowledgment from Tier 2 ---');
  run(`
    UPDATE dose_logs 
    SET last_escalated_at = datetime('now', '-31 minutes') 
    WHERE id = ?
  `, [testDoseId]);

  await checkMissedDosesAndEscalate();

  doseState = get('SELECT * FROM dose_logs WHERE id = ?', [testDoseId]);
  console.log(`Dose state: status="${doseState.status}", escalation_level=${doseState.escalation_level} (CRITICAL TERMINAL LEVEL), last_escalated_at="${doseState.last_escalated_at}"`);

  // Show the notification audit logs in database
  const logs = query(`
    SELECT recipient_email, notification_type, subject, sent_at 
    FROM notification_logs 
    WHERE care_profile_id = 1 
    ORDER BY id DESC 
    LIMIT 6
  `);

  console.log('\n--- Notification Audit Table (notification_logs) ---');
  console.table(logs);

  console.log('\n✅ Terminal All-Hands escalation and cron cycle successfully demonstrated!\n');
  process.exit(0);
};

runDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
