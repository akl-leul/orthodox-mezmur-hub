-- Create storage buckets for audio and images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('mezmur-audio', 'mezmur-audio', true),
  ('post-images', 'post-images', true);

-- Storage policies for mezmur audio
CREATE POLICY "Mezmur audio files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mezmur-audio');

CREATE POLICY "Only admins can upload mezmur audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mezmur-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete mezmur audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'mezmur-audio' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for post images
CREATE POLICY "Post images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update posts table with new fields
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS excerpt text,
ADD COLUMN IF NOT EXISTS read_time integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS featured_image text,
ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;

-- Update announcements table to use 'body' instead of 'content'
-- The table already has 'body' column, so no changes needed

-- Add comment approval fields
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT true;

-- Create index for approved comments
CREATE INDEX IF NOT EXISTS idx_comments_approved ON public.comments(approved);

-- Update RLS policies for comments to only show approved comments to non-authors
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Approved comments are viewable by everyone"
ON public.comments FOR SELECT
USING (
  approved = true 
  OR auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() IN (
    SELECT author_id FROM public.posts WHERE id = post_id
  )
);

-- Policy to allow post authors to approve comments
CREATE POLICY "Post authors can approve comments on their posts"
ON public.comments FOR UPDATE
USING (
  auth.uid() IN (
    SELECT author_id FROM public.posts WHERE id = post_id
  )
  OR public.has_role(auth.uid(), 'admin')
);