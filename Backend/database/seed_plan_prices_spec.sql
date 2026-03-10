-- Optional: Set plan prices per spec (Free 1GB, 2TB Rp 180000/month, 6TB Rp 480000/month).
-- Run: psql -U postgres -d godrive -f database/seed_plan_prices_spec.sql

UPDATE storage_plans SET price_amount = 180000, updated_at = NOW() WHERE name = '2TB';
UPDATE storage_plans SET price_amount = 480000, updated_at = NOW() WHERE name = '6TB';
