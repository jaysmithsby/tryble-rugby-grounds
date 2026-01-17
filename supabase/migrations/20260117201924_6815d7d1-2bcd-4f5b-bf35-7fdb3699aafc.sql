-- Add column to track if school has been changed (one-time only)
ALTER TABLE public.profiles
ADD COLUMN school_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.school_changed_at IS 'Timestamp of when the school was changed. NULL means never changed. Users can only change school once.';