-- =====================================================
-- PRICING MANAGEMENT TABLES V2 (Simplified for Your CSV)
-- =====================================================

-- Drop old tables if recreating (CAUTION: This deletes data!)
-- DROP TABLE IF EXISTS product_variants CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;

-- Table 1: Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,                    -- Shopify handle (unique identifier)
  shopify_product_id BIGINT UNIQUE,               -- Shopify ID (populated after sync)
  title TEXT NOT NULL,
  vendor TEXT,
  product_type TEXT,
  tags TEXT,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  option1_name TEXT,                              -- e.g., "Size", "Color"
  option2_name TEXT,
  option3_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Table 2: Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,                           -- Parent product handle
  shopify_variant_id BIGINT UNIQUE,               -- Shopify variant ID (populated after sync)
  shopify_product_id BIGINT,                      -- Shopify product ID
  inventory_item_id BIGINT,                       -- Shopify inventory item ID
  
  -- Variant identification
  option1_value TEXT,                             -- e.g., "Large", "Red"
  option2_value TEXT,
  option3_value TEXT,
  sku TEXT,
  
  -- Pricing (THE MOST IMPORTANT!)
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,     -- Selling price ⭐
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,      -- Cost price (COGS) ⭐
  
  -- Images
  variant_image_url TEXT,
  
  -- Metadata
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Change tracking
  needs_sync BOOLEAN DEFAULT FALSE,               -- Flag for modified records
  last_price_change TIMESTAMP WITH TIME ZONE,     -- When price last changed
  last_cost_change TIMESTAMP WITH TIME ZONE       -- When cost last changed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE INDEX IF NOT EXISTS idx_variants_handle ON product_variants(handle);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON product_variants(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_needs_sync ON product_variants(needs_sync);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON products;
CREATE POLICY "Enable all access for authenticated users" ON products
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON product_variants;
CREATE POLICY "Enable all access for authenticated users" ON product_variants
  FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at 
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to track price/cost changes
CREATE OR REPLACE FUNCTION track_price_cost_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    NEW.last_price_change = NOW();
    NEW.needs_sync = TRUE;
  END IF;
  
  IF OLD.cost IS DISTINCT FROM NEW.cost THEN
    NEW.last_cost_change = NOW();
    NEW.needs_sync = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_variant_changes ON product_variants;
CREATE TRIGGER track_variant_changes
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION track_price_cost_changes();

-- View for product summary with counts
CREATE OR REPLACE VIEW product_pricing_summary AS
SELECT 
  p.id,
  p.handle,
  p.shopify_product_id,
  p.title,
  p.vendor,
  p.product_type,
  p.status,
  p.image_url,
  p.last_synced_at,
  COUNT(pv.id) as variant_count,
  COUNT(CASE WHEN pv.needs_sync THEN 1 END) as variants_needing_sync,
  ROUND(AVG(pv.price), 2) as avg_selling_price,
  ROUND(AVG(pv.cost), 2) as avg_cost_price,
  ROUND(AVG(pv.price - pv.cost), 2) as avg_profit_per_unit,
  MIN(pv.price) as min_price,
  MAX(pv.price) as max_price
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id, p.handle, p.shopify_product_id, p.title, p.vendor, p.product_type, p.status, p.image_url, p.last_synced_at
ORDER BY p.title;

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_stats()
RETURNS TABLE(
  total_products BIGINT,
  total_variants BIGINT,
  synced_products BIGINT,
  synced_variants BIGINT,
  variants_needing_sync BIGINT,
  last_sync_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(pv.id),
    COUNT(DISTINCT CASE WHEN p.shopify_product_id IS NOT NULL THEN p.id END),
    COUNT(CASE WHEN pv.shopify_variant_id IS NOT NULL THEN pv.id END),
    COUNT(CASE WHEN pv.needs_sync THEN pv.id END),
    MAX(GREATEST(p.last_synced_at, pv.last_synced_at))
  FROM products p
  LEFT JOIN product_variants pv ON p.id = pv.product_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- READY FOR YOUR CSV IMPORT!
-- =====================================================
-- 
-- Your CSV columns map to:
-- 
-- PRODUCTS TABLE:
-- Handle          → handle
-- Title           → title
-- Vendor          → vendor
-- Type            → product_type
-- Tags            → tags
-- Status          → status
-- Image Src       → image_url
-- Option1 Name    → option1_name
-- Option2 Name    → option2_name
-- Option3 Name    → option3_name
--
-- PRODUCT_VARIANTS TABLE:
-- Handle          → handle (for linking)
-- Option1 Value   → option1_value
-- Option2 Value   → option2_value
-- Option3 Value   → option3_value
-- Variant SKU     → sku
-- Variant Price   → price ⭐
-- Cost per item   → cost ⭐
-- Variant Image   → variant_image_url
--
-- =====================================================

