-- Add restrictive RLS policies that require authentication for all SELECT operations
-- This prevents unauthenticated users from accessing any data

-- profiles table - require authentication
CREATE POLICY "Require authentication for profiles access"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- units table - require authentication
CREATE POLICY "Require authentication for units access"
ON public.units
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- user_units table - require authentication
CREATE POLICY "Require authentication for user_units access"
ON public.user_units
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- shift_schedules table - require authentication
CREATE POLICY "Require authentication for shift_schedules access"
ON public.shift_schedules
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- user_preferences table - require authentication
CREATE POLICY "Require authentication for user_preferences access"
ON public.user_preferences
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- current_status table - require authentication
CREATE POLICY "Require authentication for current_status access"
ON public.current_status
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- status_events table - require authentication
CREATE POLICY "Require authentication for status_events access"
ON public.status_events
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- menus table - require authentication
CREATE POLICY "Require authentication for menus access"
ON public.menus
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- menu_items table - require authentication
CREATE POLICY "Require authentication for menu_items access"
ON public.menu_items
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- ramps table - require authentication
CREATE POLICY "Require authentication for ramps access"
ON public.ramps
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- ramp_slots table - require authentication
CREATE POLICY "Require authentication for ramp_slots access"
ON public.ramp_slots
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- sla_rules table - require authentication
CREATE POLICY "Require authentication for sla_rules access"
ON public.sla_rules
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- food_items table - require authentication
CREATE POLICY "Require authentication for food_items access"
ON public.food_items
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);