# 📥 Supabase CSV Import Guide

## Step 1: Prepare Your Excel File

1. Open your Excel file
2. **Save As** → Choose **CSV (Comma delimited) (*.csv)**
3. Save it as: `shopify-products-import.csv`

---

## Step 2: Run the SQL Schema in Supabase

1. Go to your Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the SQL from `supabase-pricing-tables-v2-simplified.sql` (see below)
5. Click **Run**
6. ✅ Tables created!

---

## Step 3: Import CSV Data

### Option A: Using Supabase Table Editor (Easiest)

1. In Supabase Dashboard → Click **Table Editor**
2. You'll see two tables:
   - `products`
   - `product_variants`

#### **Import Products First:**

1. Click on `products` table
2. Click **Import data via spreadsheet** (top right)
3. Upload your `shopify-products-import.csv`
4. **Map columns:**
   - CSV `Handle` → `handle`
   - CSV `Title` → `title`
   - CSV `Vendor` → `vendor`
   - CSV `Type` → `product_type`
   - CSV `Tags` → `tags`
   - CSV `Status` → `status`
   - CSV `Image Src` → `image_url`
   - CSV `Option1 Name` → `option1_name`
   - CSV `Option2 Name` → `option2_name`
   - CSV `Option3 Name` → `option3_name`
5. Click **Import**

#### **Import Variants Second:**

1. Click on `product_variants` table
2. Click **Import data via spreadsheet**
3. Upload the same `shopify-products-import.csv`
4. **Map columns:**
   - CSV `Handle` → `handle`
   - CSV `Option1 Value` → `option1_value`
   - CSV `Option2 Value` → `option2_value`
   - CSV `Option3 Value` → `option3_value`
   - CSV `Variant SKU` → `sku`
   - CSV `Variant Price` → `price`
   - CSV `Cost per item` → `cost`
   - CSV `Variant Image` → `variant_image_url`
5. Click **Import**

---

### Option B: Using SQL INSERT (Advanced)

If the table editor import doesn't work well, you can use a CSV-to-SQL converter:

1. Go to: https://www.convertcsv.com/csv-to-sql.htm
2. Upload your CSV
3. Set table name to `products` or `product_variants`
4. Generate SQL INSERT statements
5. Run in Supabase SQL Editor

---

## Step 4: Verify Import

Run this query in SQL Editor:

```sql
-- Check products imported
SELECT COUNT(*) as total_products FROM products;

-- Check variants imported
SELECT COUNT(*) as total_variants FROM product_variants;

-- Check sample data
SELECT * FROM products LIMIT 5;
SELECT * FROM product_variants LIMIT 5;
```

---

## Step 5: Link Products to Variants

After import, run this to link variants to their parent products:

```sql
-- Update product_id in variants table
UPDATE product_variants pv
SET product_id = p.id
FROM products p
WHERE pv.handle = p.handle
  AND pv.product_id IS NULL;
```

---

## Troubleshooting

### Problem: "Column doesn't exist"
- Make sure you ran the SQL schema first
- Check column name spelling (case-sensitive!)

### Problem: "Duplicate key error"
- Your CSV has duplicate handles
- Clean duplicates in Excel first

### Problem: "NULL value in required field"
- Make sure `handle`, `title`, `price`, `cost` columns are not empty

---

## 🎯 **Expected Result:**

After successful import, you should see:
- ✅ All products in `products` table
- ✅ All variants in `product_variants` table
- ✅ Each variant linked to its product via `product_id`
- ✅ Prices and costs populated

**Now you're ready to sync with Shopify!** 🚀

