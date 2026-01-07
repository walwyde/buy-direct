-- User role enum
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'MANUFACTURER');

-- Manufacturer verification status enum
CREATE TYPE manufacturer_verification_status AS ENUM (
  'unverified',
  'pending',
  'verified'
);


create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null,
  status text default 'active',
  created_at timestamptz default now()
);



CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL UNIQUE
    REFERENCES users(id)
    ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  location TEXT,

  verification_status manufacturer_verification_status
    DEFAULT 'unverified',

  bio TEXT,
  logo_url TEXT,
  established_year INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- Indexes for performance optimization

CREATE INDEX idx_manufacturers_user_id ON manufacturers(user_id);
CREATE INDEX idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX idx_products_category ON products(category);



create table notifications (
  id uuid primary key,
  user_id uuid references users(id),
  title text,
  message text,
  is_read boolean default false,
  created_at timestamp default now()
);


create table complaints (
  id text primary key,
  from_user_id uuid references users(id),
  to_user_id uuid references users(id),
  order_id uuid references orders(id),
  subject text,
  message text,
  status text default 'open',
  created_at timestamp default now()
);

create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_manufacturer_id on public.orders(manufacturer_id);

create index idx_notifications_user_id on public.notifications(user_id);

create index idx_complaints_status on public.complaints(status);

create index if not exists idx_manufacturers_verification_status
on public.manufacturers (verification_status);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text check (role in ('customer','manufacturer','admin')) not null default 'customer',
  status text check (status in ('active','inactive')) not null default 'active',
  country text,
  kyc_verified boolean default false,
  created_at timestamp with time zone default now(),
  two_factor_enabled boolean default false
);


-- Add role column if it doesn't exist
alter table profiles
add column if not exists role text default 'customer';


-- Optionally, set default role for existing users
update profiles
set role = 'customer'
where role is null;


create table if not exists products (
    id text primary key,
    manufacturer_id uuid references manufacturers(id) on delete cascade,
    name text not null,
    description text,
    price numeric not null,
    retail_price_estimation numeric,
    category text default 'Home & Kitchen',
    stock int default 0,
    image_url text,
    specifications jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);


create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references profiles(id) on delete cascade,
    manufacturer_id uuid references manufacturers(id) on delete set null,
    items jsonb not null, -- array of product ids, quantity, price, etc.
    total_amount numeric not null,
    status text default 'awaiting_verification', -- awaiting_verification, processing, shipped, delivered, declined
    payment_method text,
    account_name text,
    transaction_id text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);


-- Enable UUID generation (usually already enabled)
create extension if not exists "pgcrypto";

-- Fix products.id
alter table products
alter column id set data type uuid using gen_random_uuid(),
alter column id set default gen_random_uuid();


-- Create cart_items table
CREATE TABLE cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cart items
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own cart items
CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cart items
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own cart items
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);


-- 1. Disable RLS temporarily (only for setup)
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
DROP POLICY IF EXISTS "Allow guest sessions" ON cart_items;

-- 3. Create proper policies
-- Policy for SELECT (viewing)
CREATE POLICY "select_own_cart_items" ON cart_items
FOR SELECT USING (auth.uid() = user_id);

-- Policy for INSERT (adding items)
CREATE POLICY "insert_own_cart_items" ON cart_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modifying items)
CREATE POLICY "update_own_cart_items" ON cart_items
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for DELETE (removing items)
CREATE POLICY "delete_own_cart_items" ON cart_items
FOR DELETE USING (auth.uid() = user_id);

-- 4. Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS retail_price_estimation DECIMAL(10,2);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER DEFAULT 1;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category VARCHAR(255);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

-- Make sure these columns exist too
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Function to get platform stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE(
  total_savings DECIMAL,
  active_factories BIGINT,
  completed_orders BIGINT,
  carbon_reduction DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total savings (40% of all orders)
    COALESCE(SUM(o.total_amount * 0.4), 0)::DECIMAL as total_savings,
    -- Active factories (with at least one order)
    COUNT(DISTINCT m.id)::BIGINT as active_factories,
    -- Completed orders
    COUNT(CASE WHEN o.status IN ('completed', 'shipped') THEN 1 END)::BIGINT as completed_orders,
    -- Carbon reduction (0.3 tons per order)
    (COUNT(o.id) * 0.3)::DECIMAL as carbon_reduction
  FROM manufacturers m
  LEFT JOIN orders o ON m.id = o.manufacturer_id
  WHERE o.id IS NOT NULL;
END;
$$;

-- Function to update manufacturer stats after order
CREATE OR REPLACE FUNCTION update_manufacturer_stats(
  manufacturer_id UUID,
  order_total DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE manufacturers 
  SET 
    total_sales = COALESCE(total_sales, 0) + 1,
    revenue = COALESCE(revenue, 0) + order_total,
    updated_at = NOW()
  WHERE id = manufacturer_id;
END;
$$;

-- Create a view for live orders
CREATE OR REPLACE VIEW live_orders_view AS
SELECT 
  o.id,
  o.customer_id,
  o.manufacturer_id,
  m.company_name as manufacturer_name,
  o.total_amount,
  o.status,
  o.payment_method,
  o.created_at,
  jsonb_array_length(o.items) as item_count
FROM orders o
LEFT JOIN manufacturers m ON o.manufacturer_id = m.id
WHERE o.status IN ('processing', 'awaiting_verification', 'shipped')
ORDER BY o.created_at DESC;