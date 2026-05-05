CREATE TABLE IF NOT EXISTS push_subscriptions_v2 (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  creator_name TEXT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  UNIQUE(site_id, page_path, endpoint)
);

INSERT OR IGNORE INTO push_subscriptions_v2 (
  id, site_id, page_path, creator_name, endpoint, p256dh, auth, user_agent, created_at, last_seen_at, revoked_at
)
SELECT
  id, site_id, page_path, creator_name, endpoint, p256dh, auth, user_agent, created_at, last_seen_at, revoked_at
FROM push_subscriptions;

DROP TABLE push_subscriptions;

ALTER TABLE push_subscriptions_v2 RENAME TO push_subscriptions;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_site_page
  ON push_subscriptions(site_id, page_path);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON push_subscriptions(site_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);
