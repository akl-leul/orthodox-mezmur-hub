-- Minimal User Mezmur Setup (Safe to run multiple times)
-- Run this in Supabase SQL Editor

-- Step 1: Create storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mezmur-audio', 
  'mezmur-audio', 
  true, 
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/flac']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Add user_id column to mezmurs table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mezmurs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.mezmurs 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_mezmurs_user_id ON public.mezmurs(user_id);
  END IF;
END;
$$;

-- Step 3: Test the setup
SELECT '=== User Mezmur System Status ===' as status;

-- Check storage bucket
SELECT 'Storage bucket:' as info, * FROM storage.buckets WHERE id = 'mezmur-audio';

-- Check table structure  
SELECT 'Mezmurs table columns:' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'mezmurs' AND table_schema = 'public';

-- Show sample mezmurs
SELECT 'Sample mezmurs:' as info, id, title, artist, user_id FROM public.mezmurs LIMIT 3;
