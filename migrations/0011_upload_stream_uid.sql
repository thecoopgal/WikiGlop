-- Cloudflare Stream video id (replaces R2 staging for new uploads).
ALTER TABLE upload_sessions ADD COLUMN stream_uid TEXT;
ALTER TABLE upload_sessions ADD COLUMN stream_playback_url TEXT;

CREATE INDEX IF NOT EXISTS idx_upload_sessions_stream_uid ON upload_sessions(stream_uid);
