-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create saved_mezmurs table
CREATE TABLE IF NOT EXISTS public.saved_mezmurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mezmur_id UUID NOT NULL REFERENCES public.mezmurs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, mezmur_id)
);

ALTER TABLE public.saved_mezmurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved mezmurs"
ON public.saved_mezmurs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save mezmurs"
ON public.saved_mezmurs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved mezmurs"
ON public.saved_mezmurs FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved posts"
ON public.saved_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.saved_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved posts"
ON public.saved_posts FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_announcements table
CREATE TABLE IF NOT EXISTS public.saved_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE public.saved_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved announcements"
ON public.saved_announcements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save announcements"
ON public.saved_announcements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved announcements"
ON public.saved_announcements FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_podcasts table
CREATE TABLE IF NOT EXISTS public.saved_podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, podcast_id)
);

ALTER TABLE public.saved_podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved podcasts"
ON public.saved_podcasts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save podcasts"
ON public.saved_podcasts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved podcasts"
ON public.saved_podcasts FOR DELETE
USING (auth.uid() = user_id);

-- Create user_activity table for tracking engagement
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'post_created', 'comment_added', 'mezmur_played', 'post_liked', etc.
  target_id UUID, -- ID of the related entity (post, comment, mezmur, etc.)
  target_type TEXT, -- 'post', 'comment', 'mezmur', 'announcement', 'podcast'
  metadata JSONB, -- Additional data about the activity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
ON public.user_activity FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity"
ON public.user_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster activity queries
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);