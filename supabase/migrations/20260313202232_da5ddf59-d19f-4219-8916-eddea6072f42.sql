
-- FIX: user_units INSERT - require user_id = auth.uid() in bootstrapping branch
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_units;

CREATE POLICY "Admins can manage memberships"
ON public.user_units
FOR INSERT
WITH CHECK (
  is_unit_admin(unit_id)
  OR (
    NOT EXISTS (
      SELECT 1 FROM public.user_units uu WHERE uu.unit_id = user_units.unit_id
    )
    AND user_id = auth.uid()
  )
);
