-- Add unique payment code and expiration for static QRIS flow.
-- Run: psql -U postgres -d godrive -f database/add_payments_unique_code_expiry.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'base_price') THEN
    ALTER TABLE payments ADD COLUMN base_price DECIMAL(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'unique_code') THEN
    ALTER TABLE payments ADD COLUMN unique_code INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'expires_at') THEN
    ALTER TABLE payments ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'admin_note') THEN
    ALTER TABLE payments ADD COLUMN admin_note TEXT;
  END IF;
END $$;

COMMENT ON COLUMN payments.base_price IS 'Plan base price (before unique code)';
COMMENT ON COLUMN payments.unique_code IS 'Unique code 100-999 for manual identification';
COMMENT ON COLUMN payments.expires_at IS 'Order expires after 24h; expired orders cannot be verified';
COMMENT ON COLUMN payments.admin_note IS 'Admin note when rejecting payment';
