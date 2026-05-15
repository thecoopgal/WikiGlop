-- One manual "add a glop" per normalized question per anonymous browser id (see POST /api/glop-search).
CREATE TABLE IF NOT EXISTS glop_client_question_submissions (
  site_id TEXT NOT NULL,
  query_normalized TEXT NOT NULL,
  client_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, query_normalized, client_key)
);

CREATE INDEX IF NOT EXISTS idx_glop_client_q_submissions_site
  ON glop_client_question_submissions(site_id);
