-- Add folder_id to shares so folders can be shared
-- REQUIRED: Run the main schema first so table "shares" exists:
--   psql -U postgres -d godrive -f schema.sql
-- Then run this file (same database):
--   psql -U postgres -d godrive -f shares_add_folder.sql

-- If you get "relation shares does not exist", create the database and run schema.sql first:
--   createdb -U postgres godrive
--   psql -U postgres -d godrive -f schema.sql

ALTER TABLE shares ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE CASCADE;
ALTER TABLE shares ALTER COLUMN file_id DROP NOT NULL;
ALTER TABLE shares ADD CONSTRAINT shares_file_or_folder CHECK (file_id IS NOT NULL OR folder_id IS NOT NULL);
CREATE INDEX idx_shares_folder ON shares(folder_id);
