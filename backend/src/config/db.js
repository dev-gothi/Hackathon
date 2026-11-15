const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'elderly_care.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable foreign keys and high-performance WAL mode
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;
  PRAGMA temp_store = MEMORY;
`);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS care_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    elderly_user_id INTEGER,
    display_name TEXT NOT NULL,
    dob DATE,
    emergency_phone TEXT,
    passcode_hash TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS profile_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'primary_caretaker', 'secondary_caretaker', 'family_viewer', 'elderly'
    escalation_priority INTEGER NOT NULL DEFAULT 1,
    notify_escalations INTEGER DEFAULT 1,
    notify_appointments INTEGER DEFAULT 1,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(care_profile_id, user_id),
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    rxcui TEXT,
    dosage TEXT NOT NULL,
    instructions TEXT,
    is_active INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS medication_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    time_of_day TEXT NOT NULL, -- "08:00"
    days_of_week TEXT DEFAULT '0,1,2,3,4,5,6',
    grace_period_mins INTEGER DEFAULT 30,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dose_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    medication_schedule_id INTEGER NOT NULL,
    scheduled_time DATETIME NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'taken', 'missed', 'skipped'
    action_taken_at DATETIME,
    action_taken_by INTEGER,
    escalation_level INTEGER DEFAULT 0, -- 0=none, 1=tier1, 2=tier2, 99=critical
    last_escalated_at DATETIME,
    acknowledged_by INTEGER,
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (medication_schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (action_taken_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    doctor_name TEXT NOT NULL,
    specialty TEXT,
    location TEXT,
    appointment_datetime DATETIME NOT NULL,
    notes TEXT,
    reminder_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    checkin_date DATE NOT NULL,
    prompt TEXT NOT NULL,
    response_text TEXT NOT NULL,
    sentiment TEXT, -- 'positive', 'neutral', 'concerning'
    risk_level TEXT DEFAULT 'normal', -- 'normal', 'moderate', 'high'
    flagged_symptoms TEXT, -- JSON array string
    ai_summary TEXT,
    is_assisted INTEGER DEFAULT 0,
    submitted_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    care_profile_id INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (care_profile_id) REFERENCES care_profiles(id) ON DELETE CASCADE
  );

  -- Performance indices for rapid lookups and zero full-table scans
  CREATE INDEX IF NOT EXISTS idx_profile_members_user ON profile_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_profile_members_profile ON profile_members(care_profile_id);
  CREATE INDEX IF NOT EXISTS idx_dose_logs_status_time ON dose_logs(status, scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_dose_logs_profile_time ON dose_logs(care_profile_id, scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_dose_logs_schedule ON dose_logs(medication_schedule_id);
  CREATE INDEX IF NOT EXISTS idx_medications_profile ON medications(care_profile_id, is_active);
  CREATE INDEX IF NOT EXISTS idx_med_schedules_med ON medication_schedules(medication_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_profile_time ON appointments(care_profile_id, appointment_datetime);
  CREATE INDEX IF NOT EXISTS idx_daily_checkins_profile_date ON daily_checkins(care_profile_id, checkin_date);
  CREATE INDEX IF NOT EXISTS idx_notification_logs_profile ON notification_logs(care_profile_id, sent_at);
`);

module.exports = {
  db,
  // Convenience helper wrappers
  query: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },
  get: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },
  run: (sql, params = []) => {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },
  exec: (sql) => db.exec(sql)
};
