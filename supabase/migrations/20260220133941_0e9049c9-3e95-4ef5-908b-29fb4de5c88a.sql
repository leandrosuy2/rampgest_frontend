
-- FIX #1: user_units INSERT policy has a self-referencing bug (unit_id = unit_id always true)
-- Drop the broken policy and create a corrected one
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.user_units;

CREATE POLICY "Admins can manage memberships"
ON public.user_units
FOR INSERT
WITH CHECK (
  is_unit_admin(unit_id)
  OR (
    -- Allow first member assignment only if the unit has zero members
    NOT EXISTS (
      SELECT 1 FROM public.user_units uu WHERE uu.unit_id = user_units.unit_id
    )
    AND auth.uid() IS NOT NULL
  )
);

-- FIX #2: Restrict status_events INSERT to observers, kitchen, and admins (not generic members)
DROP POLICY IF EXISTS "Members can insert status events" ON public.status_events;

CREATE POLICY "Observers kitchen and admins can insert status events"
ON public.status_events
FOR INSERT
WITH CHECK (
  is_unit_observer(unit_id) OR is_unit_kitchen(unit_id) OR is_unit_admin(unit_id)
);
