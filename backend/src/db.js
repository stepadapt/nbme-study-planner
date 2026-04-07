const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'nbme.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    exam TEXT,
    resources TEXT DEFAULT '[]',
    exam_date TEXT,
    hours_per_day INTEGER DEFAULT 8,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    form_name TEXT,
    scores TEXT NOT NULL DEFAULT '{}',
    sticking_points TEXT NOT NULL DEFAULT '[]',
    gap_types TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
    plan_data TEXT NOT NULL,
    profile_snapshot TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS class_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Archived cycle',
    assessment_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL,
    rating INTEGER,
    responses TEXT NOT NULL DEFAULT '{}',
    plan_day INTEGER,
    days_until_exam INTEGER,
    latest_score INTEGER,
    focus_system TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
  CREATE INDEX IF NOT EXISTS idx_plans_user ON study_plans(user_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_user ON class_schedule(user_id);
  CREATE INDEX IF NOT EXISTS idx_cycles_user ON study_cycles(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
  CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
`);

// ── Migrations (safe: no-op if column already exists) ────────────────
const addCol = (sql) => { try { db.exec(sql); } catch { /* already exists */ } };
addCol('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0');
addCol('ALTER TABLE users ADD COLUMN verify_token TEXT');
addCol('ALTER TABLE users ADD COLUMN verify_token_expires TEXT');
addCol('ALTER TABLE users ADD COLUMN reset_token TEXT');
addCol('ALTER TABLE users ADD COLUMN reset_token_expires TEXT');
addCol('ALTER TABLE user_profiles ADD COLUMN study_start_time TEXT DEFAULT "07:00"');
addCol('ALTER TABLE user_profiles ADD COLUMN study_end_time TEXT DEFAULT "17:00"');
addCol('ALTER TABLE user_profiles ADD COLUMN taken_assessments TEXT DEFAULT "[]"');
addCol('ALTER TABLE user_profiles ADD COLUMN sub_topic_progress TEXT DEFAULT "{}"');
addCol('ALTER TABLE assessments ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');
addCol('ALTER TABLE assessments ADD COLUMN taken_at TEXT'); // actual exam date (may differ from created_at for historical imports)
addCol('ALTER TABLE study_plans ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');

module.exports = db;
