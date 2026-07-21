-- Create the contributions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading contributions
CREATE POLICY "Allow public read access for contributions" ON public.contributions
    FOR SELECT USING (true);

-- Create RPC function to check user contribution
CREATE OR REPLACE FUNCTION check_user_contribution(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_recent BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.contributions 
        WHERE user_id = uid 
        AND created_at > (now() - interval '30 days')
    ) INTO has_recent;
    
    RETURN has_recent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
