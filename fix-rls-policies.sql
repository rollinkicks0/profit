-- =====================================================
-- FIX RLS POLICIES FOR PRICING TABLES
-- =====================================================
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON product_variants;

-- Create new policies that allow anonymous access (for anon key)
-- Since this is pricing data for your own store, not user-specific data

-- Products table: Allow all operations for everyone
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON products
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON products
  FOR DELETE USING (true);

-- Product Variants table: Allow all operations for everyone
CREATE POLICY "Enable read access for all users" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON product_variants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON product_variants
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON product_variants
  FOR DELETE USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies are correctly set
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('products', 'product_variants')
ORDER BY tablename, policyname;

-- Test count queries
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_variants FROM product_variants;

-- =====================================================
-- ALTERNATIVE: Disable RLS entirely (if you prefer)
-- =====================================================
-- Uncomment these lines if you want to disable RLS completely:

-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;

