CREATE TABLE dashboard_notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  archive_reason TEXT NOT NULL DEFAULT '',
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX dashboard_notes_status_updated_index
  ON dashboard_notes (status, updated_at DESC, id DESC);
