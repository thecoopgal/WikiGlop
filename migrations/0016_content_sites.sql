-- Published sites/pages in D1 (self-serve; no deploy required).
-- YAML under content/sites remains fallback for platform + static sites.

CREATE TABLE IF NOT EXISTS content_sites (
	id TEXT PRIMARY KEY,
	name TEXT,
	owner_user_id TEXT,
	status TEXT NOT NULL DEFAULT 'published',
	config_json TEXT NOT NULL,
	source TEXT,
	source_ref TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_sites_owner
	ON content_sites(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_content_sites_status
	ON content_sites(status);

CREATE TABLE IF NOT EXISTS content_site_hosts (
	hostname TEXT PRIMARY KEY,
	site_id TEXT NOT NULL,
	FOREIGN KEY (site_id) REFERENCES content_sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_site_hosts_site
	ON content_site_hosts(site_id);

CREATE TABLE IF NOT EXISTS content_pages (
	id TEXT PRIMARY KEY,
	site_id TEXT NOT NULL,
	slug TEXT NOT NULL,
	path TEXT NOT NULL DEFAULT '/',
	page_json TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'published',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (site_id) REFERENCES content_sites(id) ON DELETE CASCADE,
	UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_content_pages_site
	ON content_pages(site_id, status);
