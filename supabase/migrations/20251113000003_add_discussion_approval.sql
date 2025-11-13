-- Add approved column to discussions table
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Add approved_by and approved_at columns for tracking
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index for faster queries on approved discussions
CREATE INDEX IF NOT EXISTS idx_discussions_approved ON public.discussions(approved);

-- Drop existing RLS policies for discussions
DROP POLICY IF EXISTS "Users can view all discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can delete their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can view approved discussions or their own" ON public.discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own pending discussions" ON public.discussions;
DROP POLICY IF EXISTS "Admins can update any discussion" ON public.discussions;
DROP POLICY IF EXISTS "Admins can delete any discussion" ON public.discussions;

-- New RLS Policies for discussions with approval logic

-- Allow users to view approved discussions or their own discussions
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

-- Allow authenticated users to create discussions (will be pending approval)
CREATE POLICY "Authenticated users can create discussions"
  ON public.discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pending discussions
CREATE POLICY "Users can update their own pending discussions"
  ON public.discussions FOR UPDATE
  USING (auth.uid() = user_id AND approved = false);

-- Allow users to delete their own discussions
CREATE POLICY "Users can delete their own discussions"
  ON public.discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to update any discussion (for approval)
CREATE POLICY "Admins can update any discussion"
  ON public.discussions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete any discussion
CREATE POLICY "Admins can delete any discussion"
  ON public.discussions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to approve discussion
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION approve_discussion(UUID) TO authenticated;
