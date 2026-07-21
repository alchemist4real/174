-- SQL Schema for OAuth 2.0 Authorization Server in Supabase

-- 1. OAuth Clients Table (Dynamic Client Registration - RFC 7591)
CREATE TABLE IF NOT EXISTS public.oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_secret TEXT,
    client_name TEXT,
    redirect_uris JSONB NOT NULL DEFAULT '[]'::jsonb,
    grant_types JSONB NOT NULL DEFAULT '["authorization_code", "refresh_token"]'::jsonb,
    response_types JSONB NOT NULL DEFAULT '["code"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. OAuth Authorization Codes Table (PKCE S256 & RFC 8707 Resource)
CREATE TABLE IF NOT EXISTS public.oauth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    resource TEXT,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL DEFAULT 'S256',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add resource column if table already exists
ALTER TABLE public.oauth_codes ADD COLUMN IF NOT EXISTS resource TEXT;
ALTER TABLE public.oauth_codes ALTER COLUMN user_id TYPE TEXT;

-- 3. OAuth Tokens Table (Access Tokens & Refresh Tokens with Rotation & Audience)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    access_token TEXT PRIMARY KEY,
    refresh_token TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    resource TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add resource column if table already exists
ALTER TABLE public.oauth_tokens ADD COLUMN IF NOT EXISTS resource TEXT;
ALTER TABLE public.oauth_tokens ALTER COLUMN user_id TYPE TEXT;

-- Enable Row Level Security (Service role bypasses RLS)
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access oauth_clients" ON public.oauth_clients FOR ALL USING (true);
CREATE POLICY "Service role full access oauth_codes" ON public.oauth_codes FOR ALL USING (true);
CREATE POLICY "Service role full access oauth_tokens" ON public.oauth_tokens FOR ALL USING (true);
