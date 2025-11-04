-- Create dynamic pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  password TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  show_in_nav BOOLEAN NOT NULL DEFAULT true,
  show_in_footer BOOLEAN NOT NULL DEFAULT true,
  nav_order INTEGER DEFAULT 0,
  footer_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL
);

-- Enable RLS on pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Pages policies
CREATE POLICY "Published pages are viewable by everyone"
ON public.pages FOR SELECT
USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage pages"
ON public.pages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create podcasts table
CREATE TABLE public.podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  embed_url TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Enable RLS on podcasts
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Podcasts policies
CREATE POLICY "Published podcasts are viewable by everyone"
ON public.podcasts FOR SELECT
USING (published = true);

CREATE POLICY "Only admins can manage podcasts"
ON public.podcasts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for page content media
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-content', 'page-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for page content
CREATE POLICY "Page content is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'page-content');

CREATE POLICY "Admins can upload page content"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'page-content' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update page content"
ON storage.objects FOR UPDATE
USING (bucket_id = 'page-content' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete page content"
ON storage.objects FOR DELETE
USING (bucket_id = 'page-content' AND has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_podcasts_updated_at
BEFORE UPDATE ON public.podcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();