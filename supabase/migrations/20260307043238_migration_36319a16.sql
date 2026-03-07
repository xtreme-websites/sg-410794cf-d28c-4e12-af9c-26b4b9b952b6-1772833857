-- Add missing columns to company_profiles table
ALTER TABLE company_profiles 
ADD COLUMN quote_attribution text NULL,
ADD COLUMN list_of_services text NULL;