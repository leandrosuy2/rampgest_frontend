
-- Fix guest_messages: restrict "Admins can manage" to actual admins
DROP POLICY IF EXISTS "Admins can manage messages" ON public.guest_messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.guest_messages;

CREATE POLICY "Admins can manage messages" ON public.guest_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_units
      WHERE user_units.user_id = auth.uid()
        AND user_units.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_units
      WHERE user_units.user_id = auth.uid()
        AND user_units.role = 'admin'
    )
  );

CREATE POLICY "Anyone can send messages" ON public.guest_messages
  FOR INSERT WITH CHECK (true);

-- Fix guests_uploads: restrict "Admins can manage" to actual admins
DROP POLICY IF EXISTS "Admins can manage uploads" ON public.guests_uploads;
DROP POLICY IF EXISTS "Anyone can upload" ON public.guests_uploads;

CREATE POLICY "Admins can manage uploads" ON public.guests_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_units
      WHERE user_units.user_id = auth.uid()
        AND user_units.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_units
      WHERE user_units.user_id = auth.uid()
        AND user_units.role = 'admin'
    )
  );

CREATE POLICY "Anyone can upload" ON public.guests_uploads
  FOR INSERT WITH CHECK (true);
