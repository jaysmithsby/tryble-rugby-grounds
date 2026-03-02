
-- Tighten fixtures SELECT policy: hidden fixtures only visible to admins
DROP POLICY IF EXISTS "Fixtures are viewable by everyone" ON public.fixtures;

CREATE POLICY "Fixtures are viewable by everyone"
ON public.fixtures
FOR SELECT
USING ((is_visible = true) OR has_role(auth.uid(), 'admin'::app_role));
