-- Add policy to allow unit members to view profiles of other users in their units
-- This is needed for shift schedules, team collaboration, and online users features
CREATE POLICY "Unit members can view profiles of other unit members"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Users can see profiles of others who share at least one unit with them
  EXISTS (
    SELECT 1 
    FROM public.user_units uu1 
    JOIN public.user_units uu2 ON uu1.unit_id = uu2.unit_id 
    WHERE uu1.user_id = auth.uid() 
      AND uu2.user_id = profiles.id
  )
);

-- Drop the old restrictive policy that only allowed viewing own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;