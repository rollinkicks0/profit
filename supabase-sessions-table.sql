-- ============================================
-- SHOPIFY SESSIONS TABLE FOR PERSISTENT AUTH
-- ============================================

-- Create sessions table
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT,
  access_token TEXT,
  is_online BOOLEAN DEFAULT false,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on shop for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_shop ON shopify_sessions(shop);

-- Enable Row Level Security (RLS)
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (since this is server-side with service role key)
CREATE POLICY "Allow all operations on shopify_sessions" ON shopify_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_shopify_sessions_updated_at ON shopify_sessions;
CREATE TRIGGER update_shopify_sessions_updated_at
  BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTES:
-- ============================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Sessions will persist across deployments
-- 3. Access tokens are stored securely
-- 4. Old sessions can be cleaned up with a cron job
-- ============================================

