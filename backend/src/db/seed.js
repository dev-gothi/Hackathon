const bcrypt = require('bcryptjs');
const { run, query, exec } = require('../config/db');

const seed = () => {
  console.log('🌱 Seeding Elderly Care platform with realistic demo data...');

  // Clear existing data cleanly in reverse order of foreign keys
  exec(`
    DELETE FROM notification_logs;
    DELETE FROM daily_checkins;
    DELETE FROM appointments;
    DELETE FROM dose_logs;
    DELETE FROM medication_schedules;
    DELETE FROM medications;
    DELETE FROM profile_members;
    DELETE FROM care_profiles;
    DELETE FROM users;
  `);

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);
  const passcodeHash = bcrypt.hashSync('482910', salt); // Shared PIN: 482910

  // 1. Create Users
  run(`INSERT INTO users (id, email, password_hash, full_name, phone) VALUES 
    (1, 'john@example.com', ?, 'John Miller (Primary Caretaker)', '+1-555-0101'),
    (2, 'sarah@example.com', ?, 'Sarah Miller (Secondary Caretaker)', '+1-555-0102'),
    (3, 'emily@example.com', ?, 'Emily Miller (Family Viewer)', '+1-555-0103'),
    (4, 'grandma@example.com', ?, 'Rose Miller (Elderly Patient)', '+1-555-0104')
  `, [passwordHash, passwordHash, passwordHash, passwordHash]);

  // 2. Create Care Profile
  run(`INSERT INTO care_profiles (id, display_name, dob, emergency_phone, passcode_hash, created_by, elderly_user_id) VALUES
    (1, 'Rose Miller', '1946-04-12', '+1-555-9999', ?, 1, 4)
  `, [passcodeHash]);

  // 3. Link Profile Members
  run(`INSERT INTO profile_members (care_profile_id, user_id, role, escalation_priority, notify_escalations, notify_appointments) VALUES
    (1, 1, 'primary_caretaker', 1, 1, 1),
    (1, 2, 'secondary_caretaker', 2, 1, 1),
    (1, 3, 'family_viewer', 99, 0, 1),
    (1, 4, 'elderly', 99, 0, 0)
  `);

  // 4. Create Active Medications
  // Lisinopril (RxCUI 29046), Metformin (RxCUI 6809), Atorvastatin (RxCUI 83367), Aspirin (RxCUI 1191)
  run(`INSERT INTO medications (id, care_profile_id, name, rxcui, dosage, instructions, is_active, start_date) VALUES
    (1, 1, 'Lisinopril', '29046', '10mg', 'Take 1 tablet in the morning with a full glass of water.', 1, '2026-01-01'),
    (2, 1, 'Metformin', '6809', '500mg', 'Take with meals to minimize stomach upset.', 1, '2026-01-01'),
    (3, 1, 'Atorvastatin', '83367', '20mg', 'Take at bedtime for optimal cholesterol regulation.', 1, '2026-01-01'),
    (4, 1, 'Aspirin', '1191', '81mg', 'Low-dose enteric-coated tablet after breakfast.', 1, '2026-01-01')
  `);

  // 5. Medication Schedules
  run(`INSERT INTO medication_schedules (id, medication_id, time_of_day, days_of_week, grace_period_mins) VALUES
    (1, 1, '08:00', '0,1,2,3,4,5,6', 30),
    (2, 2, '08:00', '0,1,2,3,4,5,6', 30),
    (3, 2, '20:00', '0,1,2,3,4,5,6', 30),
    (4, 3, '21:00', '0,1,2,3,4,5,6', 30),
    (5, 4, '08:00', '0,1,2,3,4,5,6', 30)
  `);

  // 6. Generate 14 Days of Realistic Past Doses (giving ~88% adherence rate)
  const today = new Date();
  for (let i = 14; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Schedules 1 to 5
    const schedules = [
      { id: 1, time: '08:00:00' },
      { id: 2, time: '08:00:00' },
      { id: 3, time: '20:00:00' },
      { id: 4, time: '21:00:00' },
      { id: 5, time: '08:00:00' }
    ];

    for (const s of schedules) {
      // Intentionally mark 3 doses in the past 2 weeks as missed for realistic analytics
      const isMissed = (i === 3 && s.id === 3) || (i === 7 && s.id === 4) || (i === 11 && s.id === 1);
      const status = isMissed ? 'missed' : 'taken';
      const actionTime = isMissed ? null : `${dateStr} ${s.time}`;

      run(`INSERT INTO dose_logs (care_profile_id, medication_schedule_id, scheduled_time, status, action_taken_at, action_taken_by, escalation_level)
           VALUES (1, ?, ?, ?, ?, 4, ?)`,
        [s.id, `${dateStr} ${s.time}`, status, actionTime, isMissed ? 1 : 0]
      );
    }
  }

  // Generate today's doses
  const todayStr = today.toISOString().split('T')[0];
  const todaySchedules = [
    { id: 1, time: '08:00:00', status: 'taken' },
    { id: 2, time: '08:00:00', status: 'taken' },
    { id: 5, time: '08:00:00', status: 'taken' },
    { id: 3, time: '20:00:00', status: 'pending' },
    { id: 4, time: '21:00:00', status: 'pending' }
  ];

  for (const s of todaySchedules) {
    run(`INSERT INTO dose_logs (care_profile_id, medication_schedule_id, scheduled_time, status, action_taken_at, action_taken_by)
         VALUES (1, ?, ?, ?, ?, ?)`,
      [s.id, `${todayStr} ${s.time}`, s.status, s.status === 'taken' ? `${todayStr} 08:05:00` : null, s.status === 'taken' ? 4 : null]
    );
  }

  // 7. Appointments
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(14, 30, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  run(`INSERT INTO appointments (care_profile_id, doctor_name, specialty, location, appointment_datetime, notes) VALUES
    (1, 'Dr. Robert Vance', 'Cardiology', 'Memorial Heart Center, Suite 402', ?, 'Routine 6-month blood pressure and ECG follow-up.'),
    (1, 'Dr. Susan Lin', 'Optometry', 'Downtown Eye Associates', ?, 'Annual glaucoma screening and vision check.')
  `, [tomorrow.toISOString().replace('T', ' ').slice(0, 19), nextWeek.toISOString().replace('T', ' ').slice(0, 19)]);

  // 8. Past AI Check-ins
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

  run(`INSERT INTO daily_checkins (care_profile_id, checkin_date, prompt, response_text, sentiment, risk_level, flagged_symptoms, ai_summary, is_assisted, submitted_by) VALUES
    (1, ?, 'How are you feeling today?', 'Feeling pleasant today, went for a lovely stroll in the back garden after breakfast.', 'positive', 'normal', '[]', 'Patient reports positive mood and normal physical activity.', 0, 4),
    (1, ?, 'How are you feeling today?', 'I felt a bit dizzy when getting out of bed this morning, but rested a bit and it got better.', 'concerning', 'moderate', '["dizzy"]', 'ATTENTION: Patient reported dizziness upon standing. Caretaker follow-up recommended.', 1, 1)
  `, [yesterdayStr, threeDaysAgoStr]);

  console.log('✅ Demo database seeded successfully!');
  console.log('\n================ DEMO CREDENTIALS ================');
  console.log('Primary Caretaker:   john@example.com    / password123');
  console.log('Secondary Caretaker: sarah@example.com   / password123');
  console.log('Family Viewer:       emily@example.com   / password123');
  console.log('Elderly Patient:     grandma@example.com / password123');
  console.log('Shared Passcode:     482910');
  console.log('===================================================\n');
};

if (require.main === module) {
  seed();
}

module.exports = seed;
