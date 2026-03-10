-- Add email verification for register flow. Run after schema / add_role_to_users.
-- Run: psql -U postgres -d godrive -f database/add_verification_to_users.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE users ADD COLUMN verification_code VARCHAR(6);
    ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
    UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;
    COMMENT ON COLUMN users.verification_code IS '6-digit OTP sent via Fonnte/email';
    COMMENT ON COLUMN users.email_verified_at IS 'Set when user verifies email; login allowed only when set';
  END IF;
END $$;
