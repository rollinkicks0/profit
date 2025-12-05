-- =====================================================
-- PRICING MANAGEMENT TABLES FOR SUPABASE
-- =====================================================

-- Table 1: Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  shopify_product_id BIGINT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  status TEXT DEFAULT 'active',
  product_type TEXT,
  vendor TEXT,
  tags TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  shopify_product_id BIGINT NOT NULL,
  shopify_variant_id BIGINT UNIQUE NOT NULL,
  inventory_item_id BIGINT,
  title TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10, 2) DEFAULT 0.00,
  cost DECIMAL(10, 2) DEFAULT 0.00,
  compare_at_price DECIMAL(10, 2),
  position INTEGER DEFAULT 0,
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_product_id ON product_variants(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON product_variants(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_inventory_item_id ON product_variants(inventory_item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for authenticated users)
CREATE POLICY "Enable all access for authenticated users" ON products
  FOR ALL USING (true);

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
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at 
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for product summary with average prices
CREATE OR REPLACE VIEW product_pricing_summary AS
SELECT 
  p.id,
  p.shopify_product_id,
  p.title,
  p.status,
  p.product_type,
  p.vendor,
  p.image_url,
  p.last_synced_at,
  COUNT(pv.id) as variant_count,
  ROUND(AVG(pv.price), 2) as avg_selling_price,
  ROUND(AVG(pv.cost), 2) as avg_cost_price,
  ROUND(AVG(pv.price - pv.cost), 2) as avg_profit_per_unit,
  MIN(pv.price) as min_price,
  MAX(pv.price) as max_price
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id, p.shopify_product_id, p.title, p.status, p.product_type, p.vendor, p.image_url, p.last_synced_at
ORDER BY p.title;

-- =====================================================
-- NOTES:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. This creates the complete pricing management structure
-- 3. RLS is enabled but set to allow all (adjust based on your auth needs)
-- =====================================================

