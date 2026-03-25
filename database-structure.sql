-- =============================================
-- SCRIPT COMPLETO DE ESTRUTURA DO BANCO DE DADOS
-- Gerado para migração do Lovable Cloud
-- =============================================

-- =============================================
-- 1. EXTENSÕES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. TIPOS ENUM
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'observer', 'kitchen');
CREATE TYPE public.event_type AS ENUM ('status_change', 'sla_overdue', 'acknowledge', 'resolved', 'preparing');
CREATE TYPE public.food_category AS ENUM ('protein', 'garnish', 'salad', 'soup', 'dessert', 'beverage', 'other');
CREATE TYPE public.item_status AS ENUM ('ok', 'attention', 'missing', 'preparing');
CREATE TYPE public.shift_type AS ENUM ('lunch', 'dinner', 'both');

-- =============================================
-- 3. TABELAS
-- =============================================

-- Tabela: units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: user_units
CREATE TABLE public.user_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'observer',
    invited_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, unit_id)
);

-- Tabela: ramps
CREATE TABLE public.ramps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'standard',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: ramp_slots
CREATE TABLE public.ramp_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    ramp_id UUID NOT NULL REFERENCES public.ramps(id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL,
    label TEXT NOT NULL,
    category public.food_category NOT NULL DEFAULT 'other',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: food_items
CREATE TABLE public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category public.food_category NOT NULL DEFAULT 'other',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: menus
CREATE TABLE public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift public.shift_type NOT NULL DEFAULT 'lunch',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: menu_items
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
    ramp_id UUID NOT NULL REFERENCES public.ramps(id) ON DELETE CASCADE,
    food_item_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
    slot_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: current_status
CREATE TABLE public.current_status (
    menu_item_id UUID PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    status public.item_status NOT NULL DEFAULT 'ok',
    alert_started_at TIMESTAMP WITH TIME ZONE,
    deadline_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    sla_acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    sla_met BOOLEAN,
    overdue_seconds INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

-- Tabela: status_events
CREATE TABLE public.status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ramp_id UUID NOT NULL REFERENCES public.ramps(id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL,
    event_type public.event_type NOT NULL DEFAULT 'status_change',
    from_status public.item_status,
    to_status public.item_status NOT NULL,
    note TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: sla_rules
CREATE TABLE public.sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    applies_to TEXT NOT NULL DEFAULT 'default',
    key TEXT,
    sla_minutes_missing INTEGER NOT NULL DEFAULT 5,
    sla_minutes_attention INTEGER DEFAULT 10,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: shift_schedules
CREATE TABLE public.shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    shift_type public.shift_type NOT NULL DEFAULT 'lunch',
    role public.app_role NOT NULL DEFAULT 'observer',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: user_preferences
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    alert_preferences JSONB NOT NULL DEFAULT '{
        "sound": {"missing": true, "overdue": true, "attention": true, "preparing": false, "replenished": true},
        "notification": {"missing": true, "overdue": true, "attention": true, "preparing": false, "replenished": false}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 4. FUNÇÕES
-- =============================================

-- Função: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Função: handle_new_user (cria perfil automaticamente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;

-- Função: is_unit_member
CREATE OR REPLACE FUNCTION public.is_unit_member(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_units
        WHERE user_id = auth.uid()
          AND unit_id = target_unit_id
    )
$$;

-- Função: is_unit_admin
CREATE OR REPLACE FUNCTION public.is_unit_admin(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_units
        WHERE user_id = auth.uid()
          AND unit_id = target_unit_id
          AND role = 'admin'
    )
$$;

-- Função: is_unit_observer
CREATE OR REPLACE FUNCTION public.is_unit_observer(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_units
        WHERE user_id = auth.uid()
          AND unit_id = target_unit_id
          AND role IN ('observer', 'admin')
    )
$$;

-- Função: is_unit_kitchen
CREATE OR REPLACE FUNCTION public.is_unit_kitchen(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_units
        WHERE user_id = auth.uid()
          AND unit_id = target_unit_id
          AND role IN ('kitchen', 'admin')
    )
$$;

-- Função: get_accessible_unit_ids
CREATE OR REPLACE FUNCTION public.get_accessible_unit_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT unit_id FROM public.user_units
    WHERE user_id = auth.uid()
$$;

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ramps_updated_at
    BEFORE UPDATE ON public.ramps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at
    BEFORE UPDATE ON public.food_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON public.menus
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_rules_updated_at
    BEFORE UPDATE ON public.sla_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_schedules_updated_at
    BEFORE UPDATE ON public.shift_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil quando novo usuário é criado (requer auth.users)
-- NOTA: Este trigger precisa ser criado após configurar o Supabase Auth
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramp_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: units
CREATE POLICY "Users can view units they are members of" ON public.units
    FOR SELECT USING (is_unit_member(id));

CREATE POLICY "Authenticated users can create units" ON public.units
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their units" ON public.units
    FOR UPDATE USING (is_unit_admin(id));

-- Políticas RLS: profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS: user_units
CREATE POLICY "Members can view unit memberships" ON public.user_units
    FOR SELECT USING (is_unit_member(unit_id) OR user_id = auth.uid());

CREATE POLICY "Admins can manage memberships" ON public.user_units
    FOR INSERT WITH CHECK (
        is_unit_admin(unit_id) OR 
        NOT EXISTS (SELECT 1 FROM user_units WHERE unit_id = user_units.unit_id)
    );

CREATE POLICY "Admins can update memberships" ON public.user_units
    FOR UPDATE USING (is_unit_admin(unit_id));

CREATE POLICY "Admins can delete memberships" ON public.user_units
    FOR DELETE USING (is_unit_admin(unit_id));

-- Políticas RLS: ramps
CREATE POLICY "Members can view ramps" ON public.ramps
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can manage ramps" ON public.ramps
    FOR ALL USING (is_unit_admin(unit_id));

-- Políticas RLS: ramp_slots
CREATE POLICY "Members can view ramp slots" ON public.ramp_slots
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can manage ramp slots" ON public.ramp_slots
    FOR ALL USING (is_unit_admin(unit_id));

-- Políticas RLS: food_items
CREATE POLICY "Members can view food items" ON public.food_items
    FOR SELECT USING (unit_id IS NULL OR is_unit_member(unit_id));

CREATE POLICY "Admins can insert food items" ON public.food_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (unit_id IS NULL OR is_unit_admin(unit_id)));

CREATE POLICY "Admins can update food items" ON public.food_items
    FOR UPDATE USING (unit_id IS NULL OR is_unit_admin(unit_id));

CREATE POLICY "Admins can delete food items" ON public.food_items
    FOR DELETE USING (is_unit_admin(unit_id));

-- Políticas RLS: menus
CREATE POLICY "Members can view menus" ON public.menus
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can manage menus" ON public.menus
    FOR ALL USING (is_unit_admin(unit_id));

-- Políticas RLS: menu_items
CREATE POLICY "Members can view menu items" ON public.menu_items
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can manage menu items" ON public.menu_items
    FOR ALL USING (is_unit_admin(unit_id));

-- Políticas RLS: current_status
CREATE POLICY "Members can view current status" ON public.current_status
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can insert status" ON public.current_status
    FOR INSERT WITH CHECK (is_unit_admin(unit_id));

CREATE POLICY "Observers and kitchen can update status" ON public.current_status
    FOR UPDATE USING (is_unit_observer(unit_id) OR is_unit_kitchen(unit_id));

CREATE POLICY "Admins can delete status" ON public.current_status
    FOR DELETE USING (is_unit_admin(unit_id));

-- Políticas RLS: status_events
CREATE POLICY "Members can view status events" ON public.status_events
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Members can insert status events" ON public.status_events
    FOR INSERT WITH CHECK (is_unit_member(unit_id));

-- Políticas RLS: sla_rules
CREATE POLICY "Members can view SLA rules" ON public.sla_rules
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can manage SLA rules" ON public.sla_rules
    FOR ALL USING (is_unit_admin(unit_id));

-- Políticas RLS: shift_schedules
CREATE POLICY "Members can view shift schedules" ON public.shift_schedules
    FOR SELECT USING (is_unit_member(unit_id));

CREATE POLICY "Admins can insert shift schedules" ON public.shift_schedules
    FOR INSERT WITH CHECK (is_unit_admin(unit_id));

CREATE POLICY "Admins can update shift schedules" ON public.shift_schedules
    FOR UPDATE USING (is_unit_admin(unit_id));

CREATE POLICY "Admins can delete shift schedules" ON public.shift_schedules
    FOR DELETE USING (is_unit_admin(unit_id));

-- Políticas RLS: user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 7. REALTIME
-- =============================================

-- Habilitar realtime para tabelas necessárias
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- =============================================
-- 8. STORAGE (se usar Supabase)
-- =============================================

-- Criar bucket para avatares
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Políticas de storage para avatares
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- FIM DO SCRIPT
-- =============================================
