-- Create shift_schedules table for operator scheduling
CREATE TABLE public.shift_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  shift_type public.shift_type NOT NULL DEFAULT 'lunch',
  role public.app_role NOT NULL DEFAULT 'observer',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, user_id, date, shift_type)
);

-- Enable RLS
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;

-- Members can view shifts for their units
CREATE POLICY "Members can view shift schedules"
ON public.shift_schedules
FOR SELECT
USING (is_unit_member(unit_id));

-- Admins can manage shift schedules
CREATE POLICY "Admins can insert shift schedules"
ON public.shift_schedules
FOR INSERT
WITH CHECK (is_unit_admin(unit_id));

CREATE POLICY "Admins can update shift schedules"
ON public.shift_schedules
FOR UPDATE
USING (is_unit_admin(unit_id));

CREATE POLICY "Admins can delete shift schedules"
ON public.shift_schedules
FOR DELETE
USING (is_unit_admin(unit_id));

-- Add updated_at trigger
CREATE TRIGGER update_shift_schedules_updated_at
BEFORE UPDATE ON public.shift_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_schedules;