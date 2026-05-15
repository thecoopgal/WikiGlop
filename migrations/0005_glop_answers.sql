CREATE TABLE IF NOT EXISTS glop_answers (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  query_normalized TEXT NOT NULL,
  query_display TEXT NOT NULL,
  answer_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_glop_answers_site_query
  ON glop_answers(site_id, query_normalized);

CREATE INDEX IF NOT EXISTS idx_glop_answers_site_created
  ON glop_answers(site_id, created_at DESC);
