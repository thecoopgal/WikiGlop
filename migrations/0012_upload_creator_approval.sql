-- Creator id (matches Cloudflare Stream creator) and moderation for /watch.
ALTER TABLE upload_sessions ADD COLUMN creator_id TEXT;
ALTER TABLE upload_sessions ADD COLUMN approval_status TEXT DEFAULT 'pending';
ALTER TABLE upload_sessions ADD COLUMN approved_at TEXT;
ALTER TABLE upload_sessions ADD COLUMN thumbnail_url TEXT;

CREATE INDEX IF NOT EXISTS idx_upload_sessions_creator_approval
  ON upload_sessions(creator_id, approval_status);
