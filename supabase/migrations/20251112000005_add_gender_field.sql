-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female'));

-- Add index for gender queries
CREATE INDEX idx_profiles_gender ON public.profiles(gender);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.gender IS 'User gender: male or female';
