-- Add allow_guest column to app_settings table
-- This column controls whether guest login (GUEST MODE) is available on the login page
-- Default is TRUE (guest access allowed)

ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS allow_guest BOOLEAN DEFAULT TRUE;
