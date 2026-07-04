-- Site membership / roles (pages are not owned by a single user column).
-- Roles: owner | editor (extend later as needed).

CREATE TABLE IF NOT EXISTS content_site_members (
	site_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'editor',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (site_id, user_id),
	FOREIGN KEY (site_id) REFERENCES content_sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_site_members_user
	ON content_site_members(user_id);

CREATE INDEX IF NOT EXISTS idx_content_site_members_site
	ON content_site_members(site_id);

-- Backfill from legacy owner_user_id column.
INSERT OR IGNORE INTO content_site_members (site_id, user_id, role)
SELECT id, owner_user_id, 'owner'
FROM content_sites
WHERE owner_user_id IS NOT NULL AND trim(owner_user_id) != '';
