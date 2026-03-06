-- Create company_profiles table to store company data
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  website_url TEXT NOT NULL,
  about_company TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for company_profiles
CREATE POLICY "Users can view their own company profiles" ON company_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own company profiles" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company profiles" ON company_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own company profiles" ON company_profiles FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS company_profiles_user_id_idx ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS company_profiles_created_at_idx ON company_profiles(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_company_profiles_updated_at();