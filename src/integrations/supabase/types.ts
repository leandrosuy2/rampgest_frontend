export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      current_status: {
        Row: {
          acknowledged_at: string | null
          alert_started_at: string | null
          deadline_at: string | null
          menu_item_id: string
          overdue_seconds: number | null
          resolved_at: string | null
          sla_acknowledged_at: string | null
          sla_met: boolean | null
          status: Database["public"]["Enums"]["item_status"]
          unit_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_started_at?: string | null
          deadline_at?: string | null
          menu_item_id: string
          overdue_seconds?: number | null
          resolved_at?: string | null
          sla_acknowledged_at?: string | null
          sla_met?: boolean | null
          status?: Database["public"]["Enums"]["item_status"]
          unit_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_started_at?: string | null
          deadline_at?: string | null
          menu_item_id?: string
          overdue_seconds?: number | null
          resolved_at?: string | null
          sla_acknowledged_at?: string | null
          sla_met?: boolean | null
          status?: Database["public"]["Enums"]["item_status"]
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "current_status_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "current_status_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["food_category"]
          created_at: string
          id: string
          name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          id?: string
          name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          id?: string
          name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_messages: {
        Row: {
          approved: boolean
          created_at: string
          favorited: boolean
          guest_name: string | null
          id: string
          message: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          favorited?: boolean
          guest_name?: string | null
          id?: string
          message: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          favorited?: boolean
          guest_name?: string | null
          id?: string
          message?: string
        }
        Relationships: []
      }
      guests_uploads: {
        Row: {
          approved: boolean
          caption: string | null
          created_at: string
          favorited: boolean
          file_url: string
          guest_name: string | null
          id: string
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["wedding_upload_type"]
        }
        Insert: {
          approved?: boolean
          caption?: string | null
          created_at?: string
          favorited?: boolean
          file_url: string
          guest_name?: string | null
          id?: string
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["wedding_upload_type"]
        }
        Update: {
          approved?: boolean
          caption?: string | null
          created_at?: string
          favorited?: boolean
          file_url?: string
          guest_name?: string | null
          id?: string
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["wedding_upload_type"]
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          display_name: string
          food_item_id: string | null
          id: string
          menu_id: string
          ramp_id: string
          slot_key: string
          sort_order: number
          unit_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          food_item_id?: string | null
          id?: string
          menu_id: string
          ramp_id: string
          slot_key: string
          sort_order?: number
          unit_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          food_item_id?: string | null
          id?: string
          menu_id?: string
          ramp_id?: string
          slot_key?: string
          sort_order?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_ramp_id_fkey"
            columns: ["ramp_id"]
            isOneToOne: false
            referencedRelation: "ramps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          shift: Database["public"]["Enums"]["shift_type"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ramp_slots: {
        Row: {
          category: Database["public"]["Enums"]["food_category"]
          created_at: string
          id: string
          label: string
          ramp_id: string
          slot_key: string
          sort_order: number
          unit_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          id?: string
          label: string
          ramp_id: string
          slot_key: string
          sort_order?: number
          unit_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          id?: string
          label?: string
          ramp_id?: string
          slot_key?: string
          sort_order?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramp_slots_ramp_id_fkey"
            columns: ["ramp_id"]
            isOneToOne: false
            referencedRelation: "ramps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ramp_slots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      ramps: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
          type: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          type?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramps_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          shift_type: Database["public"]["Enums"]["shift_type"]
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shift_type?: Database["public"]["Enums"]["shift_type"]
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shift_type?: Database["public"]["Enums"]["shift_type"]
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_rules: {
        Row: {
          active: boolean
          applies_to: string
          created_at: string
          id: string
          key: string | null
          sla_minutes_attention: number | null
          sla_minutes_missing: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          created_at?: string
          id?: string
          key?: string | null
          sla_minutes_attention?: number | null
          sla_minutes_missing?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          created_at?: string
          id?: string
          key?: string | null
          sla_minutes_attention?: number | null
          sla_minutes_missing?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      status_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          from_status: Database["public"]["Enums"]["item_status"] | null
          id: string
          menu_item_id: string
          note: string | null
          ramp_id: string
          slot_key: string
          to_status: Database["public"]["Enums"]["item_status"]
          unit_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          from_status?: Database["public"]["Enums"]["item_status"] | null
          id?: string
          menu_item_id: string
          note?: string | null
          ramp_id: string
          slot_key: string
          to_status: Database["public"]["Enums"]["item_status"]
          unit_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          from_status?: Database["public"]["Enums"]["item_status"] | null
          id?: string
          menu_item_id?: string
          note?: string | null
          ramp_id?: string
          slot_key?: string
          to_status?: Database["public"]["Enums"]["item_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_events_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_events_ramp_id_fkey"
            columns: ["ramp_id"]
            isOneToOne: false
            referencedRelation: "ramps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          alert_preferences: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_preferences?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_preferences?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_units: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_accessible_unit_ids: { Args: never; Returns: string[] }
      is_unit_admin: { Args: { target_unit_id: string }; Returns: boolean }
      is_unit_kitchen: { Args: { target_unit_id: string }; Returns: boolean }
      is_unit_member: { Args: { target_unit_id: string }; Returns: boolean }
      is_unit_observer: { Args: { target_unit_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "observer" | "kitchen"
      event_type:
        | "status_change"
        | "sla_overdue"
        | "acknowledge"
        | "resolved"
        | "preparing"
      food_category:
        | "protein"
        | "garnish"
        | "salad"
        | "soup"
        | "dessert"
        | "beverage"
        | "other"
      item_status: "ok" | "attention" | "missing" | "preparing"
      shift_type: "lunch" | "dinner" | "both"
      wedding_upload_type: "photo" | "video" | "testimonial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "observer", "kitchen"],
      event_type: [
        "status_change",
        "sla_overdue",
        "acknowledge",
        "resolved",
        "preparing",
      ],
      food_category: [
        "protein",
        "garnish",
        "salad",
        "soup",
        "dessert",
        "beverage",
        "other",
      ],
      item_status: ["ok", "attention", "missing", "preparing"],
      shift_type: ["lunch", "dinner", "both"],
      wedding_upload_type: ["photo", "video", "testimonial"],
    },
  },
} as const
