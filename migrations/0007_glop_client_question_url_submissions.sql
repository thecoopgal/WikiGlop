-- One manual "add a glop" per (normalized question, url, browser client id).
-- This prevents spam of the exact same link, while still allowing multiple different urls
-- for the same question.
CREATE TABLE IF NOT EXISTS glop_client_question_url_submissions (
  site_id TEXT NOT NULL,
  query_normalized TEXT NOT NULL,
  client_key TEXT NOT NULL,
  answer_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, query_normalized, client_key, answer_url)
);

CREATE INDEX IF NOT EXISTS idx_glop_client_quick_submissions_site
  ON glop_client_question_url_submissions(site_id);

