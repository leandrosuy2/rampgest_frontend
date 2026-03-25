// Custom types for the application
export type AppRole = 'admin' | 'observer' | 'kitchen';
export type ItemStatus = 'ok' | 'attention' | 'missing' | 'preparing';
export type FoodCategory = 'protein' | 'garnish' | 'salad' | 'soup' | 'dessert' | 'beverage' | 'other';
export type ShiftType = 'lunch' | 'dinner' | 'both';
export type EventType = 'status_change' | 'sla_overdue' | 'acknowledge' | 'resolved' | 'preparing';

export interface Unit {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUnit {
  id: string;
  user_id: string;
  unit_id: string;
  role: AppRole;
  invited_by: string | null;
  created_at: string;
  unit?: Unit;
}

export interface Ramp {
  id: string;
  unit_id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  id: string;
  unit_id: string | null;
  name: string;
  category: FoodCategory;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RampSlot {
  id: string;
  unit_id: string;
  ramp_id: string;
  slot_key: string;
  label: string;
  category: FoodCategory;
  sort_order: number;
  created_at: string;
}

export interface Menu {
  id: string;
  unit_id: string;
  date: string;
  shift: ShiftType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  unit_id: string;
  menu_id: string;
  ramp_id: string;
  slot_key: string;
  food_item_id: string | null;
  display_name: string;
  sort_order: number;
  created_at: string;
  ramp?: Ramp;
  food_item?: FoodItem;
}

export interface SlaRule {
  id: string;
  unit_id: string;
  applies_to: string;
  key: string | null;
  sla_minutes_missing: number;
  sla_minutes_attention: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentStatus {
  menu_item_id: string;
  unit_id: string;
  status: ItemStatus;
  alert_started_at: string | null;
  deadline_at: string | null;
  acknowledged_at: string | null;
  sla_acknowledged_at: string | null;
  resolved_at: string | null;
  updated_at: string;
  updated_by: string | null;
  sla_met: boolean | null;
  overdue_seconds: number;
  menu_item?: MenuItem;
}

export interface StatusEvent {
  id: string;
  unit_id: string;
  menu_item_id: string;
  ramp_id: string;
  slot_key: string;
  from_status: ItemStatus | null;
  to_status: ItemStatus;
  event_type: EventType;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types for UI
export interface MenuItemWithStatus extends MenuItem {
  current_status?: CurrentStatus;
}

export interface RampWithItems extends Ramp {
  menu_items: MenuItemWithStatus[];
  statusSummary: {
    ok: number;
    attention: number;
    missing: number;
    preparing: number;
  };
}
