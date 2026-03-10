-- GoDrive PostgreSQL Schema
-- Run: psql -U postgres -d godrive -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users: quota in bytes (e.g. 1 TB = 1099511627776). role: user | admin | suspended
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'suspended')),
  verification_code VARCHAR(6),
  verification_code_expires_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  storage_quota BIGINT NOT NULL DEFAULT 1073741824,
  storage_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Folders: nesting via parent_id
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, parent_id, name)
);

CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);

-- Physical blobs (dedup): one row per unique content hash
CREATE TABLE file_blobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sha256 VARCHAR(64) UNIQUE NOT NULL,
  size_bytes BIGINT NOT NULL,
  encrypted_path VARCHAR(512) NOT NULL,
  ref_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_file_blobs_sha256 ON file_blobs(sha256);

-- Logical files (user-visible)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  blob_id UUID REFERENCES file_blobs(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT NOT NULL,
  is_video BOOLEAN NOT NULL DEFAULT FALSE,
  is_compressed BOOLEAN NOT NULL DEFAULT FALSE,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_folder ON files(user_id, folder_id);
CREATE INDEX idx_files_trashed ON files(user_id) WHERE trashed_at IS NULL;

-- File versions (history)
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  blob_id UUID NOT NULL REFERENCES file_blobs(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_versions_file ON file_versions(file_id);

-- Shares
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_shares_token ON shares(token);
CREATE INDEX idx_shares_file ON shares(file_id);

-- Activity log
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_user_created ON activities(user_id, created_at DESC);

-- Storage plans (billing / pricing page)
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

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER files_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS storage_plans_updated_at ON storage_plans;
CREATE TRIGGER storage_plans_updated_at BEFORE UPDATE ON storage_plans
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
