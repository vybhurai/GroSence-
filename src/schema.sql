-- =========================================================================
-- GroSence: Smart Grocery Sales and Stock Prediction System database DDL Schema
-- Dialect: PostgreSQL v15+
-- =========================================================================

-- Enable UUID Extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Account Tables
CREATE TABLE "users" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'usr_' || uuid_generate_v4()::text,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fast lookup indices
CREATE INDEX idx_users_email ON "users" ("email");

-- 2. Retail Shop Details
CREATE TABLE "shops" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'shp_' || uuid_generate_v4()::text,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(150) NOT NULL,
    "opening_time" VARCHAR(50) NOT NULL,
    "closing_time" VARCHAR(50) NOT NULL,
    "owner_id" VARCHAR(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shops_owner ON "shops" ("owner_id");

-- 3. SKU Product Properties
CREATE TABLE "products" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'prod_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "barcode" VARCHAR(100) UNIQUE NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "cost" DECIMAL(10, 2) NOT NULL, -- Core for profit analysis
    "category" VARCHAR(100) NOT NULL,
    "image_url" TEXT DEFAULT 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON "products" ("barcode");
CREATE INDEX idx_products_category ON "products" ("category");

-- 4. Stock Shelf Inventory
CREATE TABLE "inventory" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'inv_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL UNIQUE REFERENCES "products"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_product ON "inventory" ("product_id");
CREATE INDEX idx_inventory_shop ON "inventory" ("shop_id");

-- 5. Sales Transactions ledger
CREATE TABLE "sales" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'sale_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
    "quantity" INTEGER NOT NULL CHECK (quantity > 0),
    "amount" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_created ON "sales" ("created_at");
CREATE INDEX idx_sales_product ON "sales" ("product_id");

-- 6. Holiday & Promo Events Calendar
CREATE TABLE "calendar_events" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'evt_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "event_date" DATE NOT NULL,
    "is_holiday" BOOLEAN NOT NULL DEFAULT FALSE,
    "event_type" VARCHAR(100) NOT NULL DEFAULT 'promotional', -- holiday, promotional, special_sale
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_date ON "calendar_events" ("event_date");

-- 7. XGBoost Forecast Projections
CREATE TABLE "predictions" (
    "id" VARCHAR(255) PRIMARY KEY DEFAULT 'pred_' || uuid_generate_v4()::text,
    "shop_id" VARCHAR(255) NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "product_id" VARCHAR(255) NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "predicted_1_day" DECIMAL(10, 2) NOT NULL,
    "predicted_7_day" DECIMAL(10, 2) NOT NULL,
    "predicted_14_day" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_product ON "predictions" ("product_id");
CREATE INDEX idx_predictions_created ON "predictions" ("created_at");

-- Triggers for auto update timestamp field
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON "inventory" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
