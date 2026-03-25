-- =====================================================
-- VV REFEIÇÕES - CONTROLE DE REPOSIÇÃO - RAMPAS
-- Sistema Multi-Unidades com SLA e Alertas
-- =====================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'observer', 'kitchen');
CREATE TYPE public.item_status AS ENUM ('ok', 'attention', 'missing', 'preparing');
CREATE TYPE public.food_category AS ENUM ('protein', 'garnish', 'salad', 'soup', 'dessert', 'beverage', 'other');
CREATE TYPE public.shift_type AS ENUM ('lunch', 'dinner', 'both');
CREATE TYPE public.event_type AS ENUM ('status_change', 'sla_overdue', 'acknowledge', 'resolved', 'preparing');

-- 2. PROFILES TABLE (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. UNITS TABLE
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- 4. USER_UNITS (Membership) TABLE
CREATE TABLE public.user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'observer',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, unit_id)
);

ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;

-- 5. RAMPS TABLE
CREATE TABLE public.ramps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT DEFAULT 'standard',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, code)
);

ALTER TABLE public.ramps ENABLE ROW LEVEL SECURITY;

-- 6. FOOD_ITEMS TABLE
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category food_category NOT NULL DEFAULT 'other',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- 7. RAMP_SLOTS TABLE
CREATE TABLE public.ramp_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  ramp_id UUID NOT NULL REFERENCES public.ramps(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  label TEXT NOT NULL,
  category food_category NOT NULL DEFAULT 'other',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ramp_id, slot_key)
);

ALTER TABLE public.ramp_slots ENABLE ROW LEVEL SECURITY;

-- 8. MENUS TABLE
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift shift_type NOT NULL DEFAULT 'lunch',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, date, shift)
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- 9. MENU_ITEMS TABLE
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  ramp_id UUID NOT NULL REFERENCES public.ramps(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  food_item_id UUID REFERENCES public.food_items(id),
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 10. SLA_RULES TABLE
CREATE TABLE public.sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL DEFAULT 'default', -- 'default', 'category', 'slot_key'
  key TEXT, -- category name or slot_key
  sla_minutes_missing INTEGER NOT NULL DEFAULT 5,
  sla_minutes_attention INTEGER DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

-- 11. CURRENT_STATUS TABLE (Real-time Status)
CREATE TABLE public.current_status (
  menu_item_id UUID PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  status item_status NOT NULL DEFAULT 'ok',
  alert_started_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  sla_acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  sla_met BOOLEAN,
  overdue_seconds INTEGER DEFAULT 0
);

ALTER TABLE public.current_status ENABLE ROW LEVEL SECURITY;

-- 12. STATUS_EVENTS TABLE (Event Log)
CREATE TABLE public.status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ramp_id UUID NOT NULL REFERENCES public.ramps(id),
  slot_key TEXT NOT NULL,
  from_status item_status,
  to_status item_status NOT NULL,
  event_type event_type NOT NULL DEFAULT 'status_change',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Check if user is member of a unit
CREATE OR REPLACE FUNCTION public.is_unit_member(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_units
    WHERE user_id = auth.uid()
      AND unit_id = target_unit_id
  )
$$;

-- Check if user is admin of a unit
CREATE OR REPLACE FUNCTION public.is_unit_admin(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_units
    WHERE user_id = auth.uid()
      AND unit_id = target_unit_id
      AND role = 'admin'
  )
$$;

-- Check if user has observer role in unit
CREATE OR REPLACE FUNCTION public.is_unit_observer(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_units
    WHERE user_id = auth.uid()
      AND unit_id = target_unit_id
      AND role IN ('observer', 'admin')
  )
$$;

-- Check if user has kitchen role in unit
CREATE OR REPLACE FUNCTION public.is_unit_kitchen(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_units
    WHERE user_id = auth.uid()
      AND unit_id = target_unit_id
      AND role IN ('kitchen', 'admin')
  )
$$;

-- Get all accessible unit IDs for current user
CREATE OR REPLACE FUNCTION public.get_accessible_unit_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM public.user_units
  WHERE user_id = auth.uid()
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UNITS
CREATE POLICY "Users can view units they are members of"
  ON public.units FOR SELECT
  USING (public.is_unit_member(id));

CREATE POLICY "Admins can update their units"
  ON public.units FOR UPDATE
  USING (public.is_unit_admin(id));

CREATE POLICY "Admins can insert units"
  ON public.units FOR INSERT
  WITH CHECK (true); -- Will be restricted at app level, first admin creates

-- USER_UNITS
CREATE POLICY "Members can view unit memberships"
  ON public.user_units FOR SELECT
  USING (public.is_unit_member(unit_id) OR user_id = auth.uid());

CREATE POLICY "Admins can manage memberships"
  ON public.user_units FOR INSERT
  WITH CHECK (public.is_unit_admin(unit_id) OR NOT EXISTS (SELECT 1 FROM public.user_units WHERE unit_id = user_units.unit_id));

CREATE POLICY "Admins can update memberships"
  ON public.user_units FOR UPDATE
  USING (public.is_unit_admin(unit_id));

CREATE POLICY "Admins can delete memberships"
  ON public.user_units FOR DELETE
  USING (public.is_unit_admin(unit_id));

-- RAMPS
CREATE POLICY "Members can view ramps"
  ON public.ramps FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage ramps"
  ON public.ramps FOR ALL
  USING (public.is_unit_admin(unit_id));

-- FOOD_ITEMS
CREATE POLICY "Members can view food items"
  ON public.food_items FOR SELECT
  USING (unit_id IS NULL OR public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage food items"
  ON public.food_items FOR ALL
  USING (unit_id IS NULL OR public.is_unit_admin(unit_id));

-- RAMP_SLOTS
CREATE POLICY "Members can view ramp slots"
  ON public.ramp_slots FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage ramp slots"
  ON public.ramp_slots FOR ALL
  USING (public.is_unit_admin(unit_id));

-- MENUS
CREATE POLICY "Members can view menus"
  ON public.menus FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage menus"
  ON public.menus FOR ALL
  USING (public.is_unit_admin(unit_id));

-- MENU_ITEMS
CREATE POLICY "Members can view menu items"
  ON public.menu_items FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (public.is_unit_admin(unit_id));

-- SLA_RULES
CREATE POLICY "Members can view SLA rules"
  ON public.sla_rules FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Admins can manage SLA rules"
  ON public.sla_rules FOR ALL
  USING (public.is_unit_admin(unit_id));

-- CURRENT_STATUS
CREATE POLICY "Members can view current status"
  ON public.current_status FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Observers and kitchen can update status"
  ON public.current_status FOR UPDATE
  USING (public.is_unit_observer(unit_id) OR public.is_unit_kitchen(unit_id));

CREATE POLICY "Admins can insert status"
  ON public.current_status FOR INSERT
  WITH CHECK (public.is_unit_admin(unit_id));

CREATE POLICY "Admins can delete status"
  ON public.current_status FOR DELETE
  USING (public.is_unit_admin(unit_id));

-- STATUS_EVENTS
CREATE POLICY "Members can view status events"
  ON public.status_events FOR SELECT
  USING (public.is_unit_member(unit_id));

CREATE POLICY "Members can insert status events"
  ON public.status_events FOR INSERT
  WITH CHECK (public.is_unit_member(unit_id));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ramps_updated_at BEFORE UPDATE ON public.ramps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_rules_updated_at BEFORE UPDATE ON public.sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_current_status_updated_at BEFORE UPDATE ON public.current_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_events;