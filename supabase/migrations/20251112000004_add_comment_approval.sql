-- Add suspended column to comments table (approved column already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'suspended'
    ) THEN
        ALTER TABLE public.comments ADD COLUMN suspended BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Add index for better query performance on suspended comments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'comments' 
        AND indexname = 'idx_comments_suspended'
    ) THEN
        CREATE INDEX idx_comments_suspended ON public.comments(suspended);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.comments.suspended IS 'Whether the comment has been suspended by the post author';
