-- Storage plans for billing / Welcome page. Run after schema.
-- Run: psql -U postgres -d godrive -f database/add_storage_plans.sql

CREATE TABLE IF NOT EXISTS storage_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  storage_bytes BIGINT NOT NULL,
  price_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  price_yearly DECIMAL(12,2),
  discount_percent INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_plans_sort ON storage_plans(sort_order);

-- Add new columns if table existed from old migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'storage_plans' AND column_name = 'billing_interval') THEN
    ALTER TABLE storage_plans ADD COLUMN billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly';
    ALTER TABLE storage_plans ADD CONSTRAINT storage_plans_billing_check CHECK (billing_interval IN ('monthly', 'yearly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'storage_plans' AND column_name = 'price_yearly') THEN
    ALTER TABLE storage_plans ADD COLUMN price_yearly DECIMAL(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'storage_plans' AND column_name = 'discount_percent') THEN
    ALTER TABLE storage_plans ADD COLUMN discount_percent INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Seed default plans only if empty
INSERT INTO storage_plans (id, name, storage_bytes, price_amount, price_currency, billing_interval, sort_order)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, 'Free', 1073741824, 0, 'IDR', 'monthly', 1
WHERE NOT EXISTS (SELECT 1 FROM storage_plans LIMIT 1);

INSERT INTO storage_plans (name, storage_bytes, price_amount, price_currency, billing_interval, price_yearly, discount_percent, sort_order)
SELECT '2TB', 2 * 1024::bigint * 1024 * 1024 * 1024, 50000, 'IDR', 'monthly', 500000, 17, 2
WHERE NOT EXISTS (SELECT 1 FROM storage_plans WHERE name = '2TB' LIMIT 1);

INSERT INTO storage_plans (name, storage_bytes, price_amount, price_currency, billing_interval, price_yearly, discount_percent, sort_order)
SELECT '6TB', 6 * 1024::bigint * 1024 * 1024 * 1024, 120000, 'IDR', 'monthly', 1200000, 17, 3
WHERE NOT EXISTS (SELECT 1 FROM storage_plans WHERE name = '6TB' LIMIT 1);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'storage_plans_updated_at') THEN
    CREATE TRIGGER storage_plans_updated_at BEFORE UPDATE ON storage_plans FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;
