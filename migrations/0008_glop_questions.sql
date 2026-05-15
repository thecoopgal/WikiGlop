-- Community questions asked on /search (even when no answers exist yet).
CREATE TABLE IF NOT EXISTS glop_questions (
  site_id TEXT NOT NULL,
  query_normalized TEXT NOT NULL,
  query_display TEXT NOT NULL,
  first_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
  ask_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (site_id, query_normalized)
);

CREATE INDEX IF NOT EXISTS idx_glop_questions_site_last_asked
  ON glop_questions(site_id, last_asked_at DESC);
