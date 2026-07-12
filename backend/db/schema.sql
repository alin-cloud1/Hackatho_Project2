-- Anti-Kuddus Protocol — SQLite schema (node:sqlite).
-- Safe to re-run: drops and recreates all objects.
-- Booleans are stored as INTEGER 0/1; timestamps as epoch milliseconds.

DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS sos_alerts;
DROP TABLE IF EXISTS seat_profiles;
DROP TABLE IF EXISTS rulebook;
DROP TABLE IF EXISTS curriculum_topics;
DROP TABLE IF EXISTS students;

-- Class roster. Kuddus (roll 01) is kept only as the seat-planner target:
-- role is NULL and pin is NULL, so he can never authenticate.
CREATE TABLE students (
  roll_number      TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  height_cm        INTEGER NOT NULL,
  vision_impaired  INTEGER NOT NULL DEFAULT 0,
  hearing_impaired INTEGER NOT NULL DEFAULT 0,
  role             TEXT CHECK (role IN ('admin', 'student')),  -- NULL = no access (Kuddus)
  is_kuddus        INTEGER NOT NULL DEFAULT 0,
  is_teacher       INTEGER NOT NULL DEFAULT 0,
  pin              TEXT                                          -- NULL = login revoked
);

-- M1: anonymous complaints. submitter_hash is a one-way digest of the roll
-- number (salt + SHA-256); the raw roll number is never stored.
CREATE TABLE complaints (
  id                  TEXT PRIMARY KEY,
  category            TEXT NOT NULL,
  description         TEXT NOT NULL,
  submitter_hash      TEXT NOT NULL,
  has_photo           INTEGER NOT NULL DEFAULT 0,
  photo_stripped_meta INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL
);
CREATE INDEX idx_complaints_hash ON complaints (submitter_hash);
CREATE INDEX idx_complaints_created ON complaints (created_at DESC);

-- M2: student-entered seat attributes, keyed by roll number.
CREATE TABLE seat_profiles (
  roll_number      TEXT PRIMARY KEY REFERENCES students (roll_number) ON DELETE CASCADE,
  height_cm        INTEGER NOT NULL,
  vision_impaired  INTEGER NOT NULL DEFAULT 0,
  hearing_impaired INTEGER NOT NULL DEFAULT 0,
  updated_at       INTEGER NOT NULL
);

-- M4: corrupt-economy ledger. 'toll' entries carry amount_taka; 'food' carry calories.
CREATE TABLE ledger_entries (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('toll', 'food')),
  label       TEXT NOT NULL,
  amount_taka INTEGER NOT NULL DEFAULT 0,
  calories    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_ledger_created ON ledger_entries (created_at);

-- M5: SOS distress signals.
CREATE TABLE sos_alerts (
  id         TEXT PRIMARY KEY,
  location   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'acknowledged')),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sos_created ON sos_alerts (created_at DESC);

-- M6: the official school rulebook (fact-checker source of truth).
-- keywords + embedding are stored as JSON text.
CREATE TABLE rulebook (
  id        TEXT PRIMARY KEY,
  section   TEXT NOT NULL,
  body      TEXT NOT NULL,
  keywords  TEXT NOT NULL DEFAULT '[]',
  embedding TEXT
);

-- M3: official curriculum topics used as RAG retrieval context.
CREATE TABLE curriculum_topics (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  topic     TEXT NOT NULL,
  embedding TEXT
);
