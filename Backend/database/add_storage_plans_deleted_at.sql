-- Soft delete for storage_plans: deleted plans stay in DB for existing payments, but hidden from lists.
-- Run: psql -U postgres -d godrive -f database/add_storage_plans_deleted_at.sql
-- Or: node src/scripts/runAllMigrations.js

ALTER TABLE storage_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN storage_plans.deleted_at IS 'When set, plan is hidden from admin and public list; payments still reference it.';
