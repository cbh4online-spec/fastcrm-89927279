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
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      automation_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["automation_action_type"]
          config: Json
          created_at: string
          id: string
          position: number
          rule_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["automation_action_type"]
          config?: Json
          created_at?: string
          id?: string
          position?: number
          rule_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["automation_action_type"]
          config?: Json
          created_at?: string
          id?: string
          position?: number
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_conditions: {
        Row: {
          created_at: string
          field_name: string
          id: string
          operator: Database["public"]["Enums"]["condition_operator"]
          position: number
          rule_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          operator: Database["public"]["Enums"]["condition_operator"]
          position?: number
          rule_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          operator?: Database["public"]["Enums"]["condition_operator"]
          position?: number
          rule_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          rule_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
          trigger_data: Json
          workspace_id: string
        }
        Insert: {
          actions_executed?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          trigger_data?: Json
          workspace_id: string
        }
        Update: {
          actions_executed?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          trigger_data?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          status: string
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          created_by: string
          cta_color: string | null
          cta_text: string | null
          custom_css: string | null
          features: Json | null
          form_enabled: boolean | null
          form_fields: Json | null
          form_title: string | null
          headline: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          subheadline: string | null
          testimonials: Json | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cta_color?: string | null
          cta_text?: string | null
          custom_css?: string | null
          features?: Json | null
          form_enabled?: boolean | null
          form_fields?: Json | null
          form_title?: string | null
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          subheadline?: string | null
          testimonials?: Json | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cta_color?: string | null
          cta_text?: string | null
          custom_css?: string | null
          features?: Json | null
          form_enabled?: boolean | null
          form_fields?: Json | null
          form_title?: string | null
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          subheadline?: string | null
          testimonials?: Json | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          id: string
          read_at: string | null
          sender_id: string | null
          sent_at: string
          workspace_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sent_at?: string
          workspace_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sent_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          owner_id: string
          stage_id: string
          status: string
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id: string
          stage_id: string
          status?: string
          title: string
          updated_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id?: string
          stage_id?: string
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_instances: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["workspace_status"]
          supabase_anon_key: string
          supabase_url: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["workspace_status"]
          supabase_anon_key: string
          supabase_url: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["workspace_status"]
          supabase_anon_key?: string
          supabase_url?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_admin_or_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      automation_action_type:
        | "create_task"
        | "move_opportunity_stage"
        | "send_message"
        | "notify_user"
      automation_trigger:
        | "lead_created"
        | "opportunity_stage_changed"
        | "payment_confirmed"
      condition_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "greater_than"
        | "less_than"
        | "is_empty"
        | "is_not_empty"
      execution_status: "pending" | "running" | "completed" | "failed"
      workspace_role: "owner" | "admin" | "agent" | "viewer"
      workspace_status: "active" | "suspended" | "inactive" | "pending"
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
      app_role: ["super_admin", "admin", "user"],
      automation_action_type: [
        "create_task",
        "move_opportunity_stage",
        "send_message",
        "notify_user",
      ],
      automation_trigger: [
        "lead_created",
        "opportunity_stage_changed",
        "payment_confirmed",
      ],
      condition_operator: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "is_empty",
        "is_not_empty",
      ],
      execution_status: ["pending", "running", "completed", "failed"],
      workspace_role: ["owner", "admin", "agent", "viewer"],
      workspace_status: ["active", "suspended", "inactive", "pending"],
    },
  },
} as const
