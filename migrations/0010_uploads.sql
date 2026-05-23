-- Staged uploads (R2 object key) before publishing to external destinations.
CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  client_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_site ON upload_sessions(site_id);

-- Google accounts linked via OAuth (YouTube upload scope).
CREATE TABLE IF NOT EXISTS google_oauth_accounts (
  google_sub TEXT PRIMARY KEY,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at INTEGER,
  scopes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Browser sessions linked to a Google account (signed cookie id).
CREATE TABLE IF NOT EXISTS google_oauth_browser_links (
  session_id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (google_sub) REFERENCES google_oauth_accounts(google_sub)
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_browser_links_sub
  ON google_oauth_browser_links(google_sub);

-- Per-upload publish jobs (YouTube, future destinations).
CREATE TABLE IF NOT EXISTS upload_destination_jobs (
  upload_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL,
  external_id TEXT,
  external_url TEXT,
  error_message TEXT,
  google_sub TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (upload_id, destination),
  FOREIGN KEY (upload_id) REFERENCES upload_sessions(id)
);
