-- Alternative migration: Discussion approval system (avoids duplicates)
-- Run this instead of 20251113000003 if you're getting duplicate policy errors

-- Add approved columns if they don't exist
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_discussions_approved ON public.discussions(approved);

-- Completely remove and recreate all policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  -- Drop all existing policies on discussions table
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'discussions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.discussions', pol.policyname);
  END LOOP;
END $$;

-- Create new policies for approval system
CREATE POLICY "Users can view approved discussions or their own"
  ON public.discussions FOR SELECT
  USING (
    approved = true OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create discussions"
  ON public.discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending discussions"
  ON public.discussions FOR UPDATE
  USING (auth.uid() = user_id AND approved = false);

CREATE POLICY "Users can delete their own discussions"
  ON public.discussions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any discussion"
  ON public.discussions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any discussion"
  ON public.discussions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create or replace the approval function
CREATE OR REPLACE FUNCTION approve_discussion(discussion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve discussions';
  END IF;

  -- Update discussion
  UPDATE public.discussions
  SET 
    approved = true,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = discussion_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION approve_discussion(UUID) TO authenticated;
