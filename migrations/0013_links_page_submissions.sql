-- Creator links page submissions (create flow → moderation → publish).
CREATE TABLE IF NOT EXISTS links_page_submissions (
	id TEXT PRIMARY KEY,
	site_id TEXT NOT NULL,
	client_key TEXT,
	creator_id TEXT,
	display_name TEXT NOT NULL,
	approval_status TEXT NOT NULL DEFAULT 'pending',
	payload_json TEXT NOT NULL,
	approved_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_links_page_submissions_client
	ON links_page_submissions (site_id, client_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_links_page_submissions_approval
	ON links_page_submissions (site_id, approval_status, created_at DESC);
