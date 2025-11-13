-- Complete User Mezmur System Setup
-- Run this in Supabase SQL Editor to enable user mezmur uploads

-- Step 1: Create storage bucket for mezmur audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mezmur-audio', 
  'mezmur-audio', 
  true, 
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/flac']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up storage policies for user audio uploads
-- Handle existing storage policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can upload their own mezmur audio" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own mezmur audio" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own mezmur audio" ON storage.objects;
    DROP POLICY IF EXISTS "Everyone can view mezmur audio" ON storage.objects;
    EXCEPTION WHEN undefined_object THEN 
        -- Policies don't exist, that's fine
END;
$$;

-- Users can upload their own audio files
CREATE POLICY "Users can upload their own mezmur audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mezmur-audio' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own audio files
CREATE POLICY "Users can update their own mezmur audio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mezmur-audio' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own audio files
CREATE POLICY "Users can delete their own mezmur audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mezmur-audio' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Everyone can view mezmur audio files (public access)
CREATE POLICY "Everyone can view mezmur audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'mezmur-audio');

-- Step 3: Verify the mezmurs table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mezmurs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check if user_id column exists, add it if it doesn't
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

-- Step 5: Update RLS policies for mezmurs table
-- Handle existing policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view all mezmurs" ON public.mezmurs;
    DROP POLICY IF EXISTS "Users can insert own mezmurs" ON public.mezmurs;
    DROP POLICY IF EXISTS "Users can update own mezmurs" ON public.mezmurs;
    DROP POLICY IF EXISTS "Users can delete own mezmurs" ON public.mezmurs;
    DROP POLICY IF EXISTS "Admins can manage all mezmurs" ON public.mezmurs;
    EXCEPTION WHEN undefined_object THEN 
        -- Policies don't exist, that's fine
END;
$$;

-- Create new RLS policies for user mezmur management
CREATE POLICY "Users can view all mezmurs" ON public.mezmurs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own mezmurs" ON public.mezmurs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mezmurs" ON public.mezmurs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mezmurs" ON public.mezmurs
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Admin policies (if admin role exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE POLICY "Admins can manage all mezmurs" ON public.mezmurs
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END;
$$;

-- Step 7: Test the setup
SELECT '=== User Mezmur System Setup Complete ===' as status;

-- Check storage bucket
SELECT 'Storage bucket info:' as info, * FROM storage.buckets WHERE id = 'mezmur-audio';

-- Check table structure
SELECT 'Mezmurs table columns:' as info, column_name, data_type FROM information_schema.columns WHERE table_name = 'mezmurs' AND table_schema = 'public';

-- Check RLS policies
SELECT 'RLS policies for mezmurs:' as info, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'mezmurs';

-- Check storage policies
SELECT 'Storage policies for mezmur-audio:' as info, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
