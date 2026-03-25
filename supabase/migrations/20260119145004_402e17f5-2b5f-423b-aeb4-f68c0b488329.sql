-- Fix permissive RLS policy for units INSERT
-- Only authenticated users can create units, and they become the first admin

DROP POLICY IF EXISTS "Admins can insert units" ON public.units;

CREATE POLICY "Authenticated users can create units"
  ON public.units FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add policy for food_items without unit (global items) - restrict to authenticated
DROP POLICY IF EXISTS "Admins can manage food items" ON public.food_items;

CREATE POLICY "Admins can insert food items"
  ON public.food_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (unit_id IS NULL OR public.is_unit_admin(unit_id)));

CREATE POLICY "Admins can update food items"
  ON public.food_items FOR UPDATE
  USING (unit_id IS NULL OR public.is_unit_admin(unit_id));

CREATE POLICY "Admins can delete food items"
  ON public.food_items FOR DELETE
  USING (public.is_unit_admin(unit_id));