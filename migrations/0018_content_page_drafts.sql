-- One draft per page (site_id + slug). Live content stays in content_pages / content_sites.

CREATE TABLE IF NOT EXISTS content_page_drafts (
	site_id TEXT NOT NULL,
	slug TEXT NOT NULL DEFAULT 'index',
	page_json TEXT NOT NULL,
	theme_overrides_json TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (site_id, slug),
	FOREIGN KEY (site_id) REFERENCES content_sites(id) ON DELETE CASCADE
);
