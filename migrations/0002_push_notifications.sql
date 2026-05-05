CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  creator_name TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_site_page
  ON push_subscriptions(site_id, page_path);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON push_subscriptions(site_id, revoked_at);
