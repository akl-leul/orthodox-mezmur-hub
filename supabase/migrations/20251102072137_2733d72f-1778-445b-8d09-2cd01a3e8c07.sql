-- Fix search_path for has_role function with CASCADE
DROP FUNCTION IF EXISTS public.has_role(_user_id UUID, _role app_role) CASCADE;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate all policies that depend on has_role
CREATE POLICY "Only admins can manage user roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can manage mezmurs" ON public.mezmurs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own posts or admins can delete any" ON public.posts FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own comments or admins can delete any" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all reminders" ON public.reminders FOR ALL USING (public.has_role(auth.uid(), 'admin'));