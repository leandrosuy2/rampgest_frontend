
-- Create a trigger function to automatically assign new users to demo units as admin
CREATE OR REPLACE FUNCTION public.assign_demo_units_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign user to all 3 demo units as admin
  INSERT INTO public.user_units (user_id, unit_id, role)
  VALUES 
    (NEW.id, '11111111-1111-1111-1111-111111111111', 'admin'),
    (NEW.id, '22222222-2222-2222-2222-222222222222', 'admin'),
    (NEW.id, '33333333-3333-3333-3333-333333333333', 'admin')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (which is created after user signup)
CREATE TRIGGER on_profile_created_assign_demo_units
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_demo_units_to_new_user();
