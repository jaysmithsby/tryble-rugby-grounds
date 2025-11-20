-- Add status and metadata fields to pool_templates for Pool Packs management
ALTER TABLE public.pool_templates 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add check constraint for valid status values
ALTER TABLE public.pool_templates 
ADD CONSTRAINT valid_status CHECK (status IN ('approved', 'draft', 'archived'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_pool_templates_status ON public.pool_templates(status);

-- Update RLS policies for pool_templates
-- Only show approved templates to regular users
DROP POLICY IF EXISTS "Pool templates are viewable by everyone" ON public.pool_templates;

CREATE POLICY "Approved pool templates are viewable by everyone"
ON public.pool_templates
FOR SELECT
USING (status = 'approved' OR auth.uid() IS NOT NULL);

-- Allow admins to manage pool templates
CREATE POLICY "Admins can insert pool templates"
ON public.pool_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pool templates"
ON public.pool_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pool templates"
ON public.pool_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_pool_templates_updated_at
BEFORE UPDATE ON public.pool_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();