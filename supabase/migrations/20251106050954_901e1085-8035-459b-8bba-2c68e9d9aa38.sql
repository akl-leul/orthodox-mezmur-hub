-- Create discussions table for user thoughts/reflections
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Create policies for discussions
CREATE POLICY "Discussions are viewable by everyone"
ON public.discussions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create discussions"
ON public.discussions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions"
ON public.discussions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions or admins can delete any"
ON public.discussions FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create discussion_likes table
CREATE TABLE public.discussion_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.discussion_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for discussion_likes
CREATE POLICY "Discussion likes are viewable by everyone"
ON public.discussion_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like discussions"
ON public.discussion_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
ON public.discussion_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create discussion_comments table (supports threading)
CREATE TABLE public.discussion_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for discussion_comments
CREATE POLICY "Discussion comments are viewable by everyone"
ON public.discussion_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.discussion_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.discussion_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments or admins can delete any"
ON public.discussion_comments FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_comments_updated_at
  BEFORE UPDATE ON public.discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_comments;