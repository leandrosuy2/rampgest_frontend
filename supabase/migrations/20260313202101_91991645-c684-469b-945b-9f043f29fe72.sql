
-- FIX: food_items INSERT - require admin for global items
DROP POLICY IF EXISTS "Admins can insert food items" ON public.food_items;

CREATE POLICY "Admins can insert food items"
ON public.food_items
FOR INSERT
WITH CHECK (
  is_unit_admin(unit_id)
  OR (unit_id IS NULL AND EXISTS (
    SELECT 1 FROM public.user_units WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- FIX: food_items UPDATE - require admin for global items
DROP POLICY IF EXISTS "Admins can update food items" ON public.food_items;
DROP POLICY IF EXISTS "Authenticated users can update food items" ON public.food_items;

CREATE POLICY "Admins can update food items"
ON public.food_items
FOR UPDATE
USING (
  is_unit_admin(unit_id)
  OR (unit_id IS NULL AND EXISTS (
    SELECT 1 FROM public.user_units WHERE user_id = auth.uid() AND role = 'admin'
  ))
);
