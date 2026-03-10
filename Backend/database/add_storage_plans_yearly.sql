-- Add yearly + discount columns to storage_plans if missing (run after add_storage_plans).
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

-- Seed default plans if table is empty (e.g. created by schema.sql)
INSERT INTO storage_plans (id, name, storage_bytes, price_amount, price_currency, billing_interval, sort_order)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, 'Free', 1073741824, 0, 'IDR', 'monthly', 1
WHERE NOT EXISTS (SELECT 1 FROM storage_plans LIMIT 1);

INSERT INTO storage_plans (name, storage_bytes, price_amount, price_currency, billing_interval, price_yearly, discount_percent, sort_order)
SELECT '2TB', 2 * 1024::bigint * 1024 * 1024 * 1024, 50000, 'IDR', 'monthly', 500000, 17, 2
WHERE NOT EXISTS (SELECT 1 FROM storage_plans WHERE name = '2TB' LIMIT 1);

INSERT INTO storage_plans (name, storage_bytes, price_amount, price_currency, billing_interval, price_yearly, discount_percent, sort_order)
SELECT '6TB', 6 * 1024::bigint * 1024 * 1024 * 1024, 120000, 'IDR', 'monthly', 1200000, 17, 3
WHERE NOT EXISTS (SELECT 1 FROM storage_plans WHERE name = '6TB' LIMIT 1);
