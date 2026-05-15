-- When 1, the glop was submitted with "Gloop anonymously" (no public attribution).
ALTER TABLE glop_answers ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_glop_answers_site_query_url
  ON glop_answers(site_id, query_normalized, answer_url);
