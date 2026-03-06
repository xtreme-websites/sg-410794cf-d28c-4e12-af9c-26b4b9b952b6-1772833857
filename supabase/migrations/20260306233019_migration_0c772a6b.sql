-- Create orders table to track PR package purchases
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pr_title TEXT NOT NULL,
  product_name TEXT NOT NULL,
  package_type TEXT CHECK (package_type IN ('Starter', 'Standard', 'Premium')),
  price DECIMAL(10,2) NOT NULL,
  stripe_payment_id TEXT,
  pr_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor_analysis table to store analysis results
CREATE TABLE IF NOT EXISTS competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  competitors JSONB NOT NULL,
  user_scores JSONB NOT NULL,
  competitive_intelligence TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for competitor_analysis
CREATE POLICY "Users can view their own analyses" ON competitor_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analyses" ON competitor_analysis FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS competitor_analysis_user_id_idx ON competitor_analysis(user_id);
CREATE INDEX IF NOT EXISTS competitor_analysis_created_at_idx ON competitor_analysis(created_at DESC);