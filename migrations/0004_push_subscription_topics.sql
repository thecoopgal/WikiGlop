CREATE TABLE IF NOT EXISTS push_subscription_topics (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  UNIQUE(subscription_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_push_topics_subscription
  ON push_subscription_topics(subscription_id);

CREATE INDEX IF NOT EXISTS idx_push_topics_topic
  ON push_subscription_topics(topic_id);
