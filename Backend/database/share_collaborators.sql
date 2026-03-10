-- Share collaborators: who has access (view/edit) to a share
-- Run after schema.sql and shares_add_folder.sql
--   psql -U postgres -d godrive -f share_collaborators.sql

CREATE TABLE IF NOT EXISTS share_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (role IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(share_id, email)
);

CREATE INDEX idx_share_collaborators_share ON share_collaborators(share_id);
CREATE INDEX idx_share_collaborators_user ON share_collaborators(user_id);
