-- Add user ownership to mezmurs table and update permissions

-- Step 1: Add user_id column to mezmurs table
ALTER TABLE public.mezmurs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index for better performance
CREATE INDEX idx_mezmurs_user_id ON public.mezmurs(user_id);

-- Step 3: Update RLS policies for mezmurs
DROP POLICY IF EXISTS "Users can view all mezmurs" ON public.mezmurs;
DROP POLICY IF EXISTS "Users can insert mezmurs" ON public.mezmurs;
DROP POLICY IF EXISTS "Users can update own mezmurs" ON public.mezmurs;
DROP POLICY IF EXISTS "Users can delete own mezmurs" ON public.mezmurs;

-- Step 4: Create new RLS policies for user mezmur management
CREATE POLICY "Users can view all mezmurs" ON public.mezmurs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own mezmurs" ON public.mezmurs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mezmurs" ON public.mezmurs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mezmurs" ON public.mezmurs
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Admin policies (if admin role exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE POLICY "Admins can manage all mezmurs" ON public.mezmurs
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END;
$$;
