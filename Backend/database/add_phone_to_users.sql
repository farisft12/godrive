-- Add phone (WhatsApp) column to users for existing databases.
-- Run from Backend folder: psql -U postgres -d godrive -f database/add_phone_to_users.sql
-- Safe to run multiple times (checks if column exists first).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  END IF;
END $$;
