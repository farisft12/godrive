-- Add role to users (admin vs user). Default 'user'.
-- Allowed: 'user', 'admin', 'suspended'. Run after schema.sql.
-- Run: psql -U postgres -d godrive -f database/add_role_to_users.sql

-- 1) Add column + index if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
    CREATE INDEX idx_users_role ON users(role);
    COMMENT ON COLUMN users.role IS 'user=normal, admin=full access, suspended=blocked';
  END IF;
END $$;

-- 2) Add check constraint if column exists but constraint missing (e.g. old migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'admin', 'suspended'));
  END IF;
END $$;
