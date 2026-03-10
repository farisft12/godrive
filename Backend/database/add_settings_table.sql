-- App settings (max upload, payment, etc.). Run: psql -U postgres -d godrive -f database/add_settings_table.sql
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults (optional; GET falls back to env anyway)
INSERT INTO settings (key, value) VALUES ('max_upload_mb', '500')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('payment_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('payment_gateway', 'manual')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('payment_instructions', '')
ON CONFLICT (key) DO NOTHING;
