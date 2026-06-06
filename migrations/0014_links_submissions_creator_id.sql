-- Fast lookup of approved creator pages by slug (creator_id).
CREATE INDEX IF NOT EXISTS idx_links_page_submissions_creator_approved
	ON links_page_submissions (site_id, creator_id, approval_status);
