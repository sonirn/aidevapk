-- Create conversions table for tracking APK conversions
CREATE TABLE IF NOT EXISTS conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    converted_filename TEXT NOT NULL,
    conversion_mode TEXT NOT NULL CHECK (conversion_mode IN ('debug', 'sandbox', 'combined')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create status_checks table for tracking API status checks (migrated from backend)
CREATE TABLE IF NOT EXISTS status_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversions_session_id ON conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_expires_at ON conversions(expires_at);

-- Create index for status_checks
CREATE INDEX IF NOT EXISTS idx_status_checks_timestamp ON status_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_status_checks_client_name ON status_checks(client_name);

-- Create storage bucket for APK files (run this in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('apk-files', 'apk-files', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the conversions table
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for the status_checks table
ALTER TABLE status_checks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (used by API)
CREATE POLICY "Allow service role full access" ON conversions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to status_checks" ON status_checks
FOR ALL USING (auth.role() = 'service_role');

-- Set up storage policies for APK files
CREATE POLICY "Allow service role to manage APK files" ON storage.objects
FOR ALL USING (bucket_id = 'apk-files' AND auth.role() = 'service_role');
