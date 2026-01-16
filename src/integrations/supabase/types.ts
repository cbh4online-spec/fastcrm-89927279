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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_field_suggestions: {
        Row: {
          confidence: number
          created_at: string
          custom_field_id: string | null
          entity_id: string
          entity_type: string
          explanation: string
          field_name: string
          field_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_context: Json | null
          status: string
          suggested_value: Json
          workspace_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          custom_field_id?: string | null
          entity_id: string
          entity_type: string
          explanation: string
          field_name: string
          field_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_context?: Json | null
          status?: string
          suggested_value: Json
          workspace_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          custom_field_id?: string | null
          entity_id?: string
          entity_type?: string
          explanation?: string
          field_name?: string
          field_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_context?: Json | null
          status?: string
          suggested_value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_field_suggestions_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_field_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          knowledge_base_ids: string[] | null
          language_style: string | null
          limitations: string[] | null
          name: string
          persona_type: string
          system_prompt: string | null
          technical_depth: string
          tone_of_voice: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          language_style?: string | null
          limitations?: string[] | null
          name: string
          persona_type: string
          system_prompt?: string | null
          technical_depth?: string
          tone_of_voice?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          language_style?: string | null
          limitations?: string[] | null
          name?: string
          persona_type?: string
          system_prompt?: string | null
          technical_depth?: string
          tone_of_voice?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_personas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      automation_chain_tracking: {
        Row: {
          chain_id: string
          created_at: string | null
          depth: number | null
          entity_id: string
          entity_type: string
          id: string
          rule_id: string
          workspace_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          depth?: number | null
          entity_id: string
          entity_type: string
          id?: string
          rule_id: string
          workspace_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          depth?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          rule_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_chain_tracking_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_chain_tracking_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      automation_execution_tracking: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          execution_count: number | null
          id: string
          last_execution_at: string | null
          rule_id: string
          window_start: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          execution_count?: number | null
          id?: string
          last_execution_at?: string | null
          rule_id: string
          window_start?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          execution_count?: number | null
          id?: string
          last_execution_at?: string | null
          rule_id?: string
          window_start?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_tracking_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_tracking_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          state: Database["public"]["Enums"]["automation_state"] | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          trigger_config: Json | null
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
          state?: Database["public"]["Enums"]["automation_state"] | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
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
          state?: Database["public"]["Enums"]["automation_state"] | null
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
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
      automation_suggestions: {
        Row: {
          actions: Json
          conditions: Json
          confidence: number
          created_at: string
          created_automation_id: string | null
          description: string
          explanation: string
          id: string
          pattern_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          trigger_config: Json
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          confidence: number
          created_at?: string
          created_automation_id?: string | null
          description: string
          explanation: string
          id?: string
          pattern_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          trigger_config?: Json
          trigger_type: string
          workspace_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          confidence?: number
          created_at?: string
          created_automation_id?: string | null
          description?: string
          explanation?: string
          id?: string
          pattern_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          trigger_config?: Json
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_suggestions_created_automation_id_fkey"
            columns: ["created_automation_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_calendar_assignments: {
        Row: {
          availability_id: string
          calendar_id: string
          created_at: string
          id: string
        }
        Insert: {
          availability_id: string
          calendar_id: string
          created_at?: string
          id?: string
        }
        Update: {
          availability_id?: string
          calendar_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_calendar_assignments_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "user_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_calendar_assignments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          availability_id: string
          created_at: string
          end_time: string | null
          exception_date: string
          exception_type: string
          id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          availability_id: string
          created_at?: string
          end_time?: string | null
          exception_date: string
          exception_type: string
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          availability_id?: string
          created_at?: string
          end_time?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "user_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          availability_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          availability_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          availability_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "user_availability"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          data: Json | null
          error_message: string | null
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          stripe_event_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          error_message?: string | null
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          error_message?: string | null
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_apply_logs: {
        Row: {
          applied_by: string
          apply_type: string
          blueprint_id: string
          changes_applied: Json
          created_at: string
          duplicates_detected: Json
          duplicates_merged: Json
          error_message: string | null
          id: string
          status: string
          workspace_id: string
        }
        Insert: {
          applied_by: string
          apply_type?: string
          blueprint_id: string
          changes_applied?: Json
          created_at?: string
          duplicates_detected?: Json
          duplicates_merged?: Json
          error_message?: string | null
          id?: string
          status?: string
          workspace_id: string
        }
        Update: {
          applied_by?: string
          apply_type?: string
          blueprint_id?: string
          changes_applied?: Json
          created_at?: string
          duplicates_detected?: Json
          duplicates_merged?: Json
          error_message?: string | null
          id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_apply_logs_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "crm_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_apply_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_versions: {
        Row: {
          blueprint_id: string
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          schema: Json
          version: number
        }
        Insert: {
          blueprint_id: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          schema?: Json
          version: number
        }
        Update: {
          blueprint_id?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          schema?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_versions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "crm_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: Json | null
          calendar_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          lead_id: string | null
          location: string | null
          meeting_url: string | null
          metadata: Json | null
          opportunity_id: string | null
          recurrence_id: string | null
          recurrence_rule: string | null
          reminders: Json | null
          start_time: string
          status: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          reminders?: Json | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          reminders?: Json | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_groups: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_permissions: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          permission_type: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          permission_type: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          permission_type?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_permissions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_service_assignments: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_service_assignments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_service_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_team_assignments: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          team_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          team_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_team_assignments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_user_assignments: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_user_assignments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          buffer_after: number | null
          buffer_before: number | null
          calendar_type: string
          color: string | null
          created_at: string
          created_by: string
          default_duration: number | null
          description: string | null
          group_id: string | null
          id: string
          is_public: boolean | null
          name: string
          settings: Json | null
          status: string
          timezone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by: string
          default_duration?: number | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          settings?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by?: string
          default_duration?: number | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          settings?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "calendar_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_entitlements: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          expiry_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          product_id: string
          proposal_id: string | null
          remaining_units: number | null
          start_date: string
          status: string
          total_units: number
          unit_name: string
          updated_at: string
          used_units: number
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          expiry_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          product_id: string
          proposal_id?: string | null
          remaining_units?: number | null
          start_date?: string
          status?: string
          total_units: number
          unit_name?: string
          updated_at?: string
          used_units?: number
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          product_id?: string
          proposal_id?: string | null
          remaining_units?: number | null
          start_date?: string
          status?: string
          total_units?: number
          unit_name?: string
          updated_at?: string
          used_units?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_entitlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "client_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body: string
          body_html: string | null
          channel: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          journey_contexts: string[] | null
          language: string
          name: string
          response_rate: number | null
          subject: string | null
          tone: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          body: string
          body_html?: string | null
          channel: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          journey_contexts?: string[] | null
          language?: string
          name: string
          response_rate?: number | null
          subject?: string | null
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          body?: string
          body_html?: string | null
          channel?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          journey_contexts?: string[] | null
          language?: string
          name?: string
          response_rate?: number | null
          subject?: string | null
          tone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          ai_analyzed_at: string | null
          ai_company_type: string | null
          ai_insight: string | null
          ai_next_action: string | null
          ai_next_action_type: string | null
          ai_temperature: string | null
          annual_revenue: number | null
          assigned_to: string | null
          automation_active: boolean | null
          cae_codes: string[] | null
          cae_description: string | null
          capital_social: string | null
          city: string | null
          company_score: number | null
          company_status: string | null
          conversion_probability: number | null
          county: string | null
          created_at: string
          created_by: string
          email: string | null
          employee_count: number | null
          entity_type: string | null
          estimated_value: number | null
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          last_contact_at: string | null
          legal_nature: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          parish: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          size: string | null
          source: string | null
          tags: string[] | null
          tax_id: string | null
          twitter_url: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_company_type?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          annual_revenue?: number | null
          assigned_to?: string | null
          automation_active?: boolean | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_score?: number | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          last_contact_at?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          parish?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          size?: string | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_company_type?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          annual_revenue?: number | null
          assigned_to?: string | null
          automation_active?: boolean | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_score?: number | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          last_contact_at?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          parish?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          size?: string | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_logs: {
        Row: {
          acquired_product_id: string
          company_id: string | null
          consumption_date: string
          consumption_type: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          source: string
          workspace_id: string
        }
        Insert: {
          acquired_product_id: string
          company_id?: string | null
          consumption_date?: string
          consumption_type?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          source?: string
          workspace_id: string
        }
        Update: {
          acquired_product_id?: string
          company_id?: string | null
          consumption_date?: string
          consumption_type?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_logs_acquired_product_id_fkey"
            columns: ["acquired_product_id"]
            isOneToOne: false
            referencedRelation: "contact_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "consumption_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_documents: {
        Row: {
          contact_id: string
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_products: {
        Row: {
          acquisition_date: string | null
          company_id: string | null
          consumed_quantity: number | null
          contact_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string
          purchased_quantity: number | null
          quantity: number | null
          status: string | null
          total_value: number | null
          unit_price: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acquisition_date?: string | null
          company_id?: string | null
          consumed_quantity?: number | null
          contact_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchased_quantity?: number | null
          quantity?: number | null
          status?: string | null
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acquisition_date?: string | null
          company_id?: string | null
          consumed_quantity?: number | null
          contact_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchased_quantity?: number | null
          quantity?: number | null
          status?: string | null
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_products_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "contact_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          abc_category: string | null
          activity_start_date: string | null
          address: string | null
          ai_analyzed_at: string | null
          ai_contact_type: string | null
          ai_insight: string | null
          ai_next_action: string | null
          ai_next_action_type: string | null
          ai_temperature: string | null
          assigned_to: string | null
          automation_active: boolean | null
          average_ticket: number | null
          business_area: string | null
          cae_code: string | null
          cae_description: string | null
          city: string | null
          client_since: string | null
          client_status: string | null
          client_types: string | null
          commercial_history_updated_at: string | null
          commercial_history_updated_by: string | null
          commercial_name: string | null
          company: string | null
          company_id: string | null
          contact_score: number | null
          conversion_probability: number | null
          country: string | null
          created_at: string
          created_by: string
          credit_active: boolean | null
          credit_limit: number | null
          email: string | null
          entity_type: string | null
          estimated_value: number | null
          facebook_url: string | null
          fiscal_regime: string | null
          has_whatsapp: boolean | null
          id: string
          instagram_url: string | null
          is_fiscal_address: boolean | null
          is_primary_contact: boolean | null
          job_title: string | null
          last_contact_at: string | null
          last_purchase_date: string | null
          lead_source: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          payment_conditions: string | null
          phone: string | null
          postal_code: string | null
          preferred_payment_method: string | null
          sales_2023: number | null
          sales_2024: number | null
          sales_2025: number | null
          sales_2026: number | null
          source: string | null
          tags: string[] | null
          tax_id: string | null
          total_revenue: number | null
          twitter_url: string | null
          updated_at: string
          whatsapp_number: string | null
          workspace_id: string
        }
        Insert: {
          abc_category?: string | null
          activity_start_date?: string | null
          address?: string | null
          ai_analyzed_at?: string | null
          ai_contact_type?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          assigned_to?: string | null
          automation_active?: boolean | null
          average_ticket?: number | null
          business_area?: string | null
          cae_code?: string | null
          cae_description?: string | null
          city?: string | null
          client_since?: string | null
          client_status?: string | null
          client_types?: string | null
          commercial_history_updated_at?: string | null
          commercial_history_updated_by?: string | null
          commercial_name?: string | null
          company?: string | null
          company_id?: string | null
          contact_score?: number | null
          conversion_probability?: number | null
          country?: string | null
          created_at?: string
          created_by: string
          credit_active?: boolean | null
          credit_limit?: number | null
          email?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fiscal_regime?: string | null
          has_whatsapp?: boolean | null
          id?: string
          instagram_url?: string | null
          is_fiscal_address?: boolean | null
          is_primary_contact?: boolean | null
          job_title?: string | null
          last_contact_at?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_payment_method?: string | null
          sales_2023?: number | null
          sales_2024?: number | null
          sales_2025?: number | null
          sales_2026?: number | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          total_revenue?: number | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          workspace_id: string
        }
        Update: {
          abc_category?: string | null
          activity_start_date?: string | null
          address?: string | null
          ai_analyzed_at?: string | null
          ai_contact_type?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          assigned_to?: string | null
          automation_active?: boolean | null
          average_ticket?: number | null
          business_area?: string | null
          cae_code?: string | null
          cae_description?: string | null
          city?: string | null
          client_since?: string | null
          client_status?: string | null
          client_types?: string | null
          commercial_history_updated_at?: string | null
          commercial_history_updated_by?: string | null
          commercial_name?: string | null
          company?: string | null
          company_id?: string | null
          contact_score?: number | null
          conversion_probability?: number | null
          country?: string | null
          created_at?: string
          created_by?: string
          credit_active?: boolean | null
          credit_limit?: number | null
          email?: string | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fiscal_regime?: string | null
          has_whatsapp?: boolean | null
          id?: string
          instagram_url?: string | null
          is_fiscal_address?: boolean | null
          is_primary_contact?: boolean | null
          job_title?: string | null
          last_contact_at?: string | null
          last_purchase_date?: string | null
          lead_source?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_payment_method?: string | null
          sales_2023?: number | null
          sales_2024?: number | null
          sales_2025?: number | null
          sales_2026?: number | null
          source?: string | null
          tags?: string[] | null
          tax_id?: string | null
          total_revenue?: number | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_followups: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conversation_id: string
          created_at: string
          hours_since_last_reply: number
          id: string
          lead_id: string | null
          prepared_message: string | null
          sent_at: string | null
          snooze_until: string | null
          status: string
          suggested_at: string
          template_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conversation_id: string
          created_at?: string
          hours_since_last_reply: number
          id?: string
          lead_id?: string | null
          prepared_message?: string | null
          sent_at?: string | null
          snooze_until?: string | null
          status?: string
          suggested_at?: string
          template_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conversation_id?: string
          created_at?: string
          hours_since_last_reply?: number
          id?: string
          lead_id?: string | null
          prepared_message?: string | null
          sent_at?: string | null
          snooze_until?: string | null
          status?: string
          suggested_at?: string
          template_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_followups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_followups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_followups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_classification_at: string | null
          ai_intent: string | null
          ai_priority: string | null
          ai_sentiment: string | null
          ai_tags: string[] | null
          assigned_to: string | null
          channel: string
          channel_metadata: Json | null
          classification_confirmed: boolean | null
          classification_confirmed_at: string | null
          classification_confirmed_by: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          status: string
          tags_assigned_at: string | null
          tags_auto_assigned: boolean | null
          unread_count: number
          updated_at: string
          user_intent: string | null
          user_priority: string | null
          user_tags: string[] | null
          workspace_id: string
        }
        Insert: {
          ai_classification_at?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_sentiment?: string | null
          ai_tags?: string[] | null
          assigned_to?: string | null
          channel: string
          channel_metadata?: Json | null
          classification_confirmed?: boolean | null
          classification_confirmed_at?: string | null
          classification_confirmed_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          status?: string
          tags_assigned_at?: string | null
          tags_auto_assigned?: boolean | null
          unread_count?: number
          updated_at?: string
          user_intent?: string | null
          user_priority?: string | null
          user_tags?: string[] | null
          workspace_id: string
        }
        Update: {
          ai_classification_at?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_sentiment?: string | null
          ai_tags?: string[] | null
          assigned_to?: string | null
          channel?: string
          channel_metadata?: Json | null
          classification_confirmed?: boolean | null
          classification_confirmed_at?: string | null
          classification_confirmed_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          status?: string
          tags_assigned_at?: string | null
          tags_auto_assigned?: boolean | null
          unread_count?: number
          updated_at?: string
          user_intent?: string | null
          user_priority?: string | null
          user_tags?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
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
      credit_consumption_logs: {
        Row: {
          action_description: string | null
          action_key: string
          created_at: string
          credits_consumed: number
          entity_id: string | null
          entity_type: string | null
          from_included: boolean | null
          id: string
          metadata: Json | null
          module_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_description?: string | null
          action_key: string
          created_at?: string
          credits_consumed: number
          entity_id?: string | null
          entity_type?: string | null
          from_included?: boolean | null
          id?: string
          metadata?: Json | null
          module_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_description?: string | null
          action_key?: string
          created_at?: string
          credits_consumed?: number
          entity_id?: string | null
          entity_type?: string | null
          from_included?: boolean | null
          id?: string
          metadata?: Json | null
          module_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_consumption_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string
          credits_amount: number
          currency: string | null
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          module_ids: string[] | null
          name: string
          price: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string
          credits_amount: number
          currency?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          module_ids?: string[] | null
          name: string
          price: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string
          credits_amount?: number
          currency?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          module_ids?: string[] | null
          name?: string
          price?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          credits_purchased: number
          currency: string | null
          id: string
          module_id: string | null
          package_id: string | null
          purchased_by: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          credits_purchased: number
          currency?: string | null
          id?: string
          module_id?: string | null
          package_id?: string | null
          purchased_by?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          credits_purchased?: number
          currency?: string | null
          id?: string
          module_id?: string | null
          package_id?: string | null
          purchased_by?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_purchases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          automation_rule_id: string | null
          conversation_id: string | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          lead_id: string | null
          metadata: Json | null
          opportunity_id: string | null
          performed_by: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          activity_type: string
          automation_rule_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          performed_by?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          activity_type?: string
          automation_rule_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          performed_by?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_blueprints: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          id: string
          name: string
          schema: Json
          status: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          name: string
          schema?: Json
          status?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          name?: string
          schema?: Json
          status?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_blueprints_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_saved_views: {
        Row: {
          created_at: string | null
          entity_type: Database["public"]["Enums"]["crm_entity_type"]
          filters: Json | null
          for_role: Database["public"]["Enums"]["workspace_role"] | null
          id: string
          is_default: boolean | null
          name: string
          sort_config: Json | null
          updated_at: string | null
          user_id: string | null
          view_mode: Database["public"]["Enums"]["crm_view_mode"]
          visible_columns: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          entity_type: Database["public"]["Enums"]["crm_entity_type"]
          filters?: Json | null
          for_role?: Database["public"]["Enums"]["workspace_role"] | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
          view_mode?: Database["public"]["Enums"]["crm_view_mode"]
          visible_columns?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          entity_type?: Database["public"]["Enums"]["crm_entity_type"]
          filters?: Json | null
          for_role?: Database["public"]["Enums"]["workspace_role"] | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
          view_mode?: Database["public"]["Enums"]["crm_view_mode"]
          visible_columns?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_saved_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          custom_field_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          custom_field_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          custom_field_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_audit_logs_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          custom_field_id: string
          entity_id: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          custom_field_id: string
          entity_id: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          auto_format: boolean | null
          created_at: string
          created_by: string | null
          entity_type: string
          field_type: string
          formatting_config: Json | null
          id: string
          industry_labels: Json | null
          internal_name: string | null
          is_archived: boolean | null
          is_system: boolean | null
          is_unique: boolean
          is_visible: boolean | null
          label: string | null
          name: string
          options: Json | null
          origin: string | null
          permissions: Json | null
          position: number
          required: boolean
          section: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_format?: boolean | null
          created_at?: string
          created_by?: string | null
          entity_type: string
          field_type: string
          formatting_config?: Json | null
          id?: string
          industry_labels?: Json | null
          internal_name?: string | null
          is_archived?: boolean | null
          is_system?: boolean | null
          is_unique?: boolean
          is_visible?: boolean | null
          label?: string | null
          name: string
          options?: Json | null
          origin?: string | null
          permissions?: Json | null
          position?: number
          required?: boolean
          section?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_format?: boolean | null
          created_at?: string
          created_by?: string | null
          entity_type?: string
          field_type?: string
          formatting_config?: Json | null
          id?: string
          industry_labels?: Json | null
          internal_name?: string | null
          is_archived?: boolean | null
          is_system?: boolean | null
          is_unique?: boolean
          is_visible?: boolean | null
          label?: string | null
          name?: string
          options?: Json | null
          origin?: string | null
          permissions?: Json | null
          position?: number
          required?: boolean
          section?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          is_default: boolean
          layout: Json
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          is_default?: boolean
          layout?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          is_default?: boolean
          layout?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          ai_summary: string | null
          business_type: string
          business_type_other: string | null
          company: string | null
          converted_to_lead_id: string | null
          created_at: string
          demo_focus: string | null
          email: string
          id: string
          lead_score: number | null
          name: string
          notes: string | null
          objectives: string[]
          source: string | null
          status: string | null
          tags: string[] | null
          team_size: string
          temperature: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          ai_summary?: string | null
          business_type: string
          business_type_other?: string | null
          company?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          demo_focus?: string | null
          email: string
          id?: string
          lead_score?: number | null
          name: string
          notes?: string | null
          objectives?: string[]
          source?: string | null
          status?: string | null
          tags?: string[] | null
          team_size: string
          temperature?: string | null
          updated_at?: string
          urgency: string
        }
        Update: {
          ai_summary?: string | null
          business_type?: string
          business_type_other?: string | null
          company?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          demo_focus?: string | null
          email?: string
          id?: string
          lead_score?: number | null
          name?: string
          notes?: string | null
          objectives?: string[]
          source?: string | null
          status?: string | null
          tags?: string[] | null
          team_size?: string
          temperature?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      email_connections: {
        Row: {
          auth_type: string
          connected_by: string
          created_at: string
          display_name: string | null
          email_address: string
          encrypted_app_password: string | null
          id: string
          imap_host: string | null
          imap_port: number | null
          imap_use_ssl: boolean | null
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_uid: string | null
          oauth_access_token: string | null
          oauth_refresh_token: string | null
          oauth_token_expires_at: string | null
          provider: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_use_tls: boolean | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auth_type: string
          connected_by: string
          created_at?: string
          display_name?: string | null
          email_address: string
          encrypted_app_password?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_use_ssl?: boolean | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_uid?: string | null
          oauth_access_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          provider: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_use_tls?: boolean | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auth_type?: string
          connected_by?: string
          created_at?: string
          display_name?: string | null
          email_address?: string
          encrypted_app_password?: string | null
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          imap_use_ssl?: boolean | null
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_uid?: string | null
          oauth_access_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          provider?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_use_tls?: boolean | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_builder_submissions: {
        Row: {
          ai_score: number | null
          ai_summary: string | null
          created_company_id: string | null
          created_contact_id: string | null
          created_lead_id: string | null
          created_opportunity_id: string | null
          form_id: string
          id: string
          ip_address: string | null
          processed_at: string | null
          processed_data: Json | null
          processing_errors: Json | null
          processing_status: string | null
          raw_data: Json
          submitted_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          ai_score?: number | null
          ai_summary?: string | null
          created_company_id?: string | null
          created_contact_id?: string | null
          created_lead_id?: string | null
          created_opportunity_id?: string | null
          form_id: string
          id?: string
          ip_address?: string | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_errors?: Json | null
          processing_status?: string | null
          raw_data?: Json
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          ai_score?: number | null
          ai_summary?: string | null
          created_company_id?: string | null
          created_contact_id?: string | null
          created_lead_id?: string | null
          created_opportunity_id?: string | null
          form_id?: string
          id?: string
          ip_address?: string | null
          processed_at?: string | null
          processed_data?: Json | null
          processing_errors?: Json | null
          processing_status?: string | null
          raw_data?: Json
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_builder_submissions_created_company_id_fkey"
            columns: ["created_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_builder_submissions_created_contact_id_fkey"
            columns: ["created_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_builder_submissions_created_lead_id_fkey"
            columns: ["created_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_builder_submissions_created_opportunity_id_fkey"
            columns: ["created_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_builder_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_builder_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          form_type: string
          id: string
          industry_type: string | null
          is_public: boolean | null
          last_submission_at: string | null
          name: string
          schema: Json
          slug: string | null
          status: string
          styling: Json | null
          submission_actions: Json | null
          submissions_count: number | null
          success_message: string | null
          target_entity: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type?: string
          id?: string
          industry_type?: string | null
          is_public?: boolean | null
          last_submission_at?: string | null
          name: string
          schema?: Json
          slug?: string | null
          status?: string
          styling?: Json | null
          submission_actions?: Json | null
          submissions_count?: number | null
          success_message?: string | null
          target_entity?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type?: string
          id?: string
          industry_type?: string | null
          is_public?: boolean | null
          last_submission_at?: string | null
          name?: string
          schema?: Json
          slug?: string | null
          status?: string
          styling?: Json | null
          submission_actions?: Json | null
          submissions_count?: number | null
          success_message?: string | null
          target_entity?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_definitions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          conditional_visibility: Json | null
          created_at: string | null
          custom_field_id: string | null
          field_key: string
          field_type: string
          form_id: string
          formatting_config: Json | null
          help_text: string | null
          id: string
          is_required: boolean | null
          is_visible: boolean | null
          label: string
          options: Json | null
          placeholder: string | null
          position: number | null
          section: string | null
          updated_at: string | null
          validation_rules: Json | null
          width: string | null
        }
        Insert: {
          conditional_visibility?: Json | null
          created_at?: string | null
          custom_field_id?: string | null
          field_key: string
          field_type?: string
          form_id: string
          formatting_config?: Json | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          label: string
          options?: Json | null
          placeholder?: string | null
          position?: number | null
          section?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          width?: string | null
        }
        Update: {
          conditional_visibility?: Json | null
          created_at?: string | null
          custom_field_id?: string | null
          field_key?: string
          field_type?: string
          form_id?: string
          formatting_config?: Json | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          label?: string
          options?: Json | null
          placeholder?: string | null
          position?: number | null
          section?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          ai_next_action: string | null
          ai_summary: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          enriched_data: Json | null
          form_id: string
          id: string
          ip_address: string | null
          lead_id: string | null
          location_data: Json | null
          opportunity_id: string | null
          processing_status: string | null
          raw_data: Json
          score: number | null
          temperature: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          ai_next_action?: string | null
          ai_summary?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          enriched_data?: Json | null
          form_id: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          location_data?: Json | null
          opportunity_id?: string | null
          processing_status?: string | null
          raw_data?: Json
          score?: number | null
          temperature?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          ai_next_action?: string | null
          ai_summary?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          enriched_data?: Json | null
          form_id?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          location_data?: Json | null
          opportunity_id?: string | null
          processing_status?: string | null
          raw_data?: Json
          score?: number | null
          temperature?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          form_type: string
          id: string
          industry_type: string | null
          is_public: boolean | null
          is_system: boolean | null
          name: string
          schema: Json
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type: string
          id?: string
          industry_type?: string | null
          is_public?: boolean | null
          is_system?: boolean | null
          name: string
          schema: Json
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type?: string
          id?: string
          industry_type?: string | null
          is_public?: boolean | null
          is_system?: boolean | null
          name?: string
          schema?: Json
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          form_id: string
          id: string
          schema: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          form_id: string
          id?: string
          schema: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          form_id?: string
          id?: string
          schema?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          automation_config: Json | null
          conditions: Json | null
          conversion_rate: number | null
          created_at: string
          created_by: string
          description: string | null
          form_type: string
          id: string
          is_active: boolean | null
          is_conversational: boolean | null
          is_internal: boolean | null
          name: string
          schema: Json
          scoring_rules: Json | null
          settings: Json | null
          slug: string | null
          submission_count: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automation_config?: Json | null
          conditions?: Json | null
          conversion_rate?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean | null
          is_conversational?: boolean | null
          is_internal?: boolean | null
          name: string
          schema?: Json
          scoring_rules?: Json | null
          settings?: Json | null
          slug?: string | null
          submission_count?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automation_config?: Json | null
          conditions?: Json | null
          conversion_rate?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean | null
          is_conversational?: boolean | null
          is_internal?: boolean | null
          name?: string
          schema?: Json
          scoring_rules?: Json | null
          settings?: Json | null
          slug?: string | null
          submission_count?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          column_mapping: Json | null
          completed_at: string | null
          conflict_policy: string | null
          created_at: string
          created_by: string | null
          created_fields: Json | null
          error_count: number | null
          errors: Json | null
          field_transformations: Json | null
          file_name: string
          file_size: number | null
          id: string
          import_type: string
          skip_count: number | null
          started_at: string | null
          status: string | null
          success_count: number | null
          total_rows: number | null
          workspace_id: string
        }
        Insert: {
          column_mapping?: Json | null
          completed_at?: string | null
          conflict_policy?: string | null
          created_at?: string
          created_by?: string | null
          created_fields?: Json | null
          error_count?: number | null
          errors?: Json | null
          field_transformations?: Json | null
          file_name: string
          file_size?: number | null
          id?: string
          import_type: string
          skip_count?: number | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_rows?: number | null
          workspace_id: string
        }
        Update: {
          column_mapping?: Json | null
          completed_at?: string | null
          conflict_policy?: string | null
          created_at?: string
          created_by?: string | null
          created_fields?: Json | null
          error_count?: number | null
          errors?: Json | null
          field_transformations?: Json | null
          file_name?: string
          file_size?: number | null
          id?: string
          import_type?: string
          skip_count?: number | null
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          total_rows?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_action_logs: {
        Row: {
          action_data: Json | null
          action_type: string
          automation_rule_id: string | null
          automation_triggered: boolean | null
          conversation_id: string
          created_at: string
          id: string
          lead_id: string | null
          performed_by: string
          workspace_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          automation_rule_id?: string | null
          automation_triggered?: boolean | null
          conversation_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          performed_by: string
          workspace_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          automation_rule_id?: string | null
          automation_triggered?: boolean | null
          conversation_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          performed_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_action_logs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_action_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_action_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_action_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_smart_alerts: {
        Row: {
          action_label: string | null
          action_url: string | null
          actioned_at: string | null
          actioned_by: string | null
          alert_type: string
          context_data: Json | null
          conversation_id: string | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_actioned: boolean | null
          is_dismissed: boolean | null
          is_read: boolean | null
          lead_id: string | null
          opportunity_id: string | null
          proposal_id: string | null
          severity: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          alert_type: string
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          is_actioned?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          lead_id?: string | null
          opportunity_id?: string | null
          proposal_id?: string | null
          severity?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          alert_type?: string
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_actioned?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          lead_id?: string | null
          opportunity_id?: string | null
          proposal_id?: string | null
          severity?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_smart_alerts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_smart_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_smart_alerts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_smart_alerts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_smart_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_connections: {
        Row: {
          access_token: string
          connected_by: string
          created_at: string
          id: string
          instagram_user_id: string
          instagram_username: string | null
          is_active: boolean
          page_id: string
          token_expires_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          connected_by: string
          created_at?: string
          id?: string
          instagram_user_id: string
          instagram_username?: string | null
          is_active?: boolean
          page_id: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          connected_by?: string
          created_at?: string
          id?: string
          instagram_user_id?: string
          instagram_username?: string | null
          is_active?: boolean
          page_id?: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_posts: {
        Row: {
          ai_generated: boolean | null
          ai_source: string | null
          attachments: Json | null
          author_id: string
          checklist_items: Json | null
          content: string
          created_at: string
          feed_type: Database["public"]["Enums"]["feed_type"]
          id: string
          is_pinned: boolean | null
          is_resolved: boolean | null
          metadata: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          resolved_at: string | null
          resolved_by: string | null
          target_client_id: string | null
          target_team_id: string | null
          target_user_id: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_source?: string | null
          attachments?: Json | null
          author_id: string
          checklist_items?: Json | null
          content: string
          created_at?: string
          feed_type?: Database["public"]["Enums"]["feed_type"]
          id?: string
          is_pinned?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          resolved_at?: string | null
          resolved_by?: string | null
          target_client_id?: string | null
          target_team_id?: string | null
          target_user_id?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_source?: string | null
          attachments?: Json | null
          author_id?: string
          checklist_items?: Json | null
          content?: string
          created_at?: string
          feed_type?: Database["public"]["Enums"]["feed_type"]
          id?: string
          is_pinned?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          resolved_at?: string | null
          resolved_by?: string | null
          target_client_id?: string | null
          target_team_id?: string | null
          target_user_id?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number | null
          id: string
          invoice_id: string
          position: number
          product_id: string | null
          quantity: number
          tax_rate: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number | null
          id?: string
          invoice_id: string
          position?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          client_address: string | null
          client_email: string | null
          client_name: string
          client_tax_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string
          discount_amount: number | null
          due_date: string
          footer_text: string | null
          id: string
          invoice_number: string
          issue_date: string
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          paid_at: string | null
          proposal_id: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          terms: string | null
          total: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name: string
          client_tax_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          discount_amount?: number | null
          due_date?: string
          footer_text?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          paid_at?: string | null
          proposal_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount_paid?: number | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          client_tax_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          discount_amount?: number | null
          due_date?: string
          footer_text?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          paid_at?: string | null
          proposal_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_ai_suggestions: {
        Row: {
          action_type: string | null
          automation_id: string | null
          created_at: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          priority: string
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_action: string | null
          suggestion_type: string
          title: string
          workspace_id: string
        }
        Insert: {
          action_type?: string | null
          automation_id?: string | null
          created_at?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          priority?: string
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_action?: string | null
          suggestion_type: string
          title: string
          workspace_id: string
        }
        Update: {
          action_type?: string | null
          automation_id?: string | null
          created_at?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          priority?: string
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_action?: string | null
          suggestion_type?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_ai_suggestions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_ai_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_automation_logs: {
        Row: {
          actions_executed: Json | null
          automation_id: string
          automation_name: string
          entity_id: string
          entity_name: string
          entity_type: string
          error_message: string | null
          executed_at: string | null
          id: string
          status: string
          trigger_data: Json | null
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          actions_executed?: Json | null
          automation_id: string
          automation_name: string
          entity_id: string
          entity_name: string
          entity_type: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          trigger_data?: Json | null
          trigger_type: string
          workspace_id: string
        }
        Update: {
          actions_executed?: Json | null
          automation_id?: string
          automation_name?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          trigger_data?: Json | null
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_automation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_automations: {
        Row: {
          actions: Json | null
          affected_clients_count: number | null
          conditions: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          actions?: Json | null
          affected_clients_count?: number | null
          conditions?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          actions?: Json | null
          affected_clients_count?: number | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          allowed_channels: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowed_channels?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowed_channels?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          content: string
          created_at: string
          created_by: string
          entry_type: string
          expires_at: string | null
          id: string
          keywords: string[] | null
          knowledge_base_id: string
          last_used_at: string | null
          question: string | null
          source_id: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          usage_count: number | null
          validated_at: string | null
          validated_by: string | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          entry_type?: string
          expires_at?: string | null
          id?: string
          keywords?: string[] | null
          knowledge_base_id: string
          last_used_at?: string | null
          question?: string | null
          source_id?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          entry_type?: string
          expires_at?: string | null
          id?: string
          keywords?: string[] | null
          knowledge_base_id?: string
          last_used_at?: string | null
          question?: string | null
          source_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_faq_suggestions: {
        Row: {
          created_at: string
          frequency: number | null
          id: string
          knowledge_base_id: string | null
          question: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_queries: string[] | null
          status: string | null
          suggested_answer: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          frequency?: number | null
          id?: string
          knowledge_base_id?: string | null
          question: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_queries?: string[] | null
          status?: string | null
          suggested_answer?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          frequency?: number | null
          id?: string
          knowledge_base_id?: string | null
          question?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_queries?: string[] | null
          status?: string | null
          suggested_answer?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_faq_suggestions_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_faq_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          created_by: string
          extracted_topics: string[] | null
          id: string
          knowledge_base_id: string
          last_processed_at: string | null
          original_content: string | null
          processed_content: string | null
          processing_error: string | null
          processing_status: string | null
          source_file_path: string | null
          source_type: string
          source_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          extracted_topics?: string[] | null
          id?: string
          knowledge_base_id: string
          last_processed_at?: string | null
          original_content?: string | null
          processed_content?: string | null
          processing_error?: string | null
          processing_status?: string | null
          source_file_path?: string | null
          source_type: string
          source_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          extracted_topics?: string[] | null
          id?: string
          knowledge_base_id?: string
          last_processed_at?: string | null
          original_content?: string | null
          processed_content?: string | null
          processing_error?: string | null
          processing_status?: string | null
          source_file_path?: string | null
          source_type?: string
          source_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_usage_logs: {
        Row: {
          confidence_score: number | null
          context: string
          created_at: string
          entry_id: string | null
          feedback: string | null
          id: string
          knowledge_base_id: string | null
          persona_id: string | null
          query: string
          response: string | null
          response_source: string | null
          response_time_ms: number | null
          resulted_in_conversion: boolean | null
          resulted_in_meeting: boolean | null
          was_helpful: boolean | null
          workspace_id: string
        }
        Insert: {
          confidence_score?: number | null
          context: string
          created_at?: string
          entry_id?: string | null
          feedback?: string | null
          id?: string
          knowledge_base_id?: string | null
          persona_id?: string | null
          query: string
          response?: string | null
          response_source?: string | null
          response_time_ms?: number | null
          resulted_in_conversion?: boolean | null
          resulted_in_meeting?: boolean | null
          was_helpful?: boolean | null
          workspace_id: string
        }
        Update: {
          confidence_score?: number | null
          context?: string
          created_at?: string
          entry_id?: string | null
          feedback?: string | null
          id?: string
          knowledge_base_id?: string | null
          persona_id?: string | null
          query?: string
          response?: string | null
          response_source?: string | null
          response_time_ms?: number | null
          resulted_in_conversion?: boolean | null
          resulted_in_meeting?: boolean | null
          was_helpful?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_usage_logs_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_usage_logs_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_usage_logs_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_usage_logs_workspace_id_fkey"
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
          address: string | null
          ai_analyzed_at: string | null
          ai_insight: string | null
          ai_lead_type: string | null
          ai_next_action: string | null
          ai_next_action_type: string | null
          ai_temperature: string | null
          assigned_to: string | null
          automation_active: boolean | null
          business_category: string | null
          business_hours: Json | null
          cae_codes: string[] | null
          cae_description: string | null
          capital_social: string | null
          city: string | null
          company_name: string | null
          company_status: string | null
          conversion_probability: number | null
          county: string | null
          created_at: string
          created_by: string
          email: string | null
          estimated_value: number | null
          external_email: string | null
          external_instagram_id: string | null
          external_username: string | null
          external_whatsapp_id: string | null
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          google_place_id: string | null
          id: string
          instagram_url: string | null
          last_contact_at: string | null
          latitude: number | null
          lead_score: number | null
          legal_nature: string | null
          linkedin_url: string | null
          longitude: number | null
          name: string
          parish: string | null
          phone: string | null
          photos: string[] | null
          postal_code: string | null
          price_level: number | null
          rating: number | null
          region: string | null
          reviews: Json | null
          reviews_count: number | null
          services: string[] | null
          source: string | null
          status: string
          tags: string[] | null
          tax_id: string | null
          twitter_url: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_insight?: string | null
          ai_lead_type?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          assigned_to?: string | null
          automation_active?: boolean | null
          business_category?: string | null
          business_hours?: Json | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          estimated_value?: number | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          lead_score?: number | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name: string
          parish?: string | null
          phone?: string | null
          photos?: string[] | null
          postal_code?: string | null
          price_level?: number | null
          rating?: number | null
          region?: string | null
          reviews?: Json | null
          reviews_count?: number | null
          services?: string[] | null
          source?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_insight?: string | null
          ai_lead_type?: string | null
          ai_next_action?: string | null
          ai_next_action_type?: string | null
          ai_temperature?: string | null
          assigned_to?: string | null
          automation_active?: boolean | null
          business_category?: string | null
          business_hours?: Json | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          estimated_value?: number | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          lead_score?: number | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name?: string
          parish?: string | null
          phone?: string | null
          photos?: string[] | null
          postal_code?: string | null
          price_level?: number | null
          rating?: number | null
          region?: string | null
          reviews?: Json | null
          reviews_count?: number | null
          services?: string[] | null
          source?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
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
      marketplace_bundles: {
        Row: {
          bundle_price: number
          created_at: string | null
          currency: string | null
          description: string | null
          discount_percent: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          module_ids: string[]
          name: string
          original_price: number
          slug: string
          tagline: string | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          bundle_price: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_percent?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          module_ids: string[]
          name: string
          original_price: number
          slug: string
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          bundle_price?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discount_percent?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          module_ids?: string[]
          name?: string
          original_price?: number
          slug?: string
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_modules: {
        Row: {
          category: string
          cover_image: string | null
          created_at: string
          description: string
          embedded_config: Json | null
          expected_results: Json | null
          icon: string
          id: string
          installs_count: number | null
          internal_type: string
          is_featured: boolean | null
          is_new: boolean | null
          name: string
          permissions: Json
          pricing: Json
          published_at: string | null
          publisher: string
          rating: number | null
          reviews_count: number | null
          slug: string
          status: string
          tagline: string
          target_audience: string | null
          trial_start_event: string | null
          trial_time_limit_days: number | null
          trial_uses_limit: number | null
          updated_at: string
          use_cases: Json | null
          version: string
        }
        Insert: {
          category: string
          cover_image?: string | null
          created_at?: string
          description: string
          embedded_config?: Json | null
          expected_results?: Json | null
          icon?: string
          id?: string
          installs_count?: number | null
          internal_type?: string
          is_featured?: boolean | null
          is_new?: boolean | null
          name: string
          permissions?: Json
          pricing?: Json
          published_at?: string | null
          publisher?: string
          rating?: number | null
          reviews_count?: number | null
          slug: string
          status?: string
          tagline: string
          target_audience?: string | null
          trial_start_event?: string | null
          trial_time_limit_days?: number | null
          trial_uses_limit?: number | null
          updated_at?: string
          use_cases?: Json | null
          version?: string
        }
        Update: {
          category?: string
          cover_image?: string | null
          created_at?: string
          description?: string
          embedded_config?: Json | null
          expected_results?: Json | null
          icon?: string
          id?: string
          installs_count?: number | null
          internal_type?: string
          is_featured?: boolean | null
          is_new?: boolean | null
          name?: string
          permissions?: Json
          pricing?: Json
          published_at?: string | null
          publisher?: string
          rating?: number | null
          reviews_count?: number | null
          slug?: string
          status?: string
          tagline?: string
          target_audience?: string | null
          trial_start_event?: string | null
          trial_time_limit_days?: number | null
          trial_uses_limit?: number | null
          updated_at?: string
          use_cases?: Json | null
          version?: string
        }
        Relationships: []
      }
      meeting_attendees: {
        Row: {
          attended: boolean | null
          contact_id: string | null
          created_at: string
          external_email: string | null
          external_name: string | null
          external_phone: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          notification_sent: boolean | null
          reminder_sent: boolean | null
          responded_at: string | null
          response_status: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          contact_id?: string | null
          created_at?: string
          external_email?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          notification_sent?: boolean | null
          reminder_sent?: boolean | null
          responded_at?: string | null
          response_status?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          contact_id?: string | null
          created_at?: string
          external_email?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          notification_sent?: boolean | null
          reminder_sent?: boolean | null
          responded_at?: string | null
          response_status?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_id: string
          note_type: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          meeting_id: string
          note_type?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_id?: string
          note_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_resource_bookings: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          resource_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_resource_bookings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_resource_bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "meeting_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_resources: {
        Row: {
          amenities: Json | null
          capacity: number | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          resource_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amenities?: Json | null
          capacity?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          resource_type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amenities?: Json | null
          capacity?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          resource_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_resources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_settings: {
        Row: {
          allow_same_day_booking: boolean | null
          auto_create_calendar_event: boolean | null
          blocked_dates: Json | null
          created_at: string
          default_buffer_after: number | null
          default_buffer_before: number | null
          default_duration: number | null
          default_timezone: string | null
          global_daily_limit: number | null
          global_weekly_limit: number | null
          id: string
          max_advance_days: number | null
          min_notice_hours: number | null
          reminder_hours_before: number | null
          send_confirmations: boolean | null
          send_reminders: boolean | null
          sync_with_google_calendar: boolean | null
          sync_with_outlook: boolean | null
          updated_at: string
          working_hours: Json | null
          workspace_id: string
        }
        Insert: {
          allow_same_day_booking?: boolean | null
          auto_create_calendar_event?: boolean | null
          blocked_dates?: Json | null
          created_at?: string
          default_buffer_after?: number | null
          default_buffer_before?: number | null
          default_duration?: number | null
          default_timezone?: string | null
          global_daily_limit?: number | null
          global_weekly_limit?: number | null
          id?: string
          max_advance_days?: number | null
          min_notice_hours?: number | null
          reminder_hours_before?: number | null
          send_confirmations?: boolean | null
          send_reminders?: boolean | null
          sync_with_google_calendar?: boolean | null
          sync_with_outlook?: boolean | null
          updated_at?: string
          working_hours?: Json | null
          workspace_id: string
        }
        Update: {
          allow_same_day_booking?: boolean | null
          auto_create_calendar_event?: boolean | null
          blocked_dates?: Json | null
          created_at?: string
          default_buffer_after?: number | null
          default_buffer_before?: number | null
          default_duration?: number | null
          default_timezone?: string | null
          global_daily_limit?: number | null
          global_weekly_limit?: number | null
          id?: string
          max_advance_days?: number | null
          min_notice_hours?: number | null
          reminder_hours_before?: number | null
          send_confirmations?: boolean | null
          send_reminders?: boolean | null
          sync_with_google_calendar?: boolean | null
          sync_with_outlook?: boolean | null
          updated_at?: string
          working_hours?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          agenda_template: string | null
          created_at: string
          created_by: string
          default_description: string | null
          default_duration: number | null
          default_mode: string | null
          default_title: string | null
          description: string | null
          id: string
          is_active: boolean | null
          meeting_type_id: string | null
          name: string
          updated_at: string
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          agenda_template?: string | null
          created_at?: string
          created_by: string
          default_description?: string | null
          default_duration?: number | null
          default_mode?: string | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_type_id?: string | null
          name: string
          updated_at?: string
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          agenda_template?: string | null
          created_at?: string
          created_by?: string
          default_description?: string | null
          default_duration?: number | null
          default_mode?: string | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_type_id?: string | null
          name?: string
          updated_at?: string
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "meeting_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_types: {
        Row: {
          availability_windows: Json | null
          buffer_after: number | null
          buffer_before: number | null
          category: string
          color: string | null
          created_at: string
          created_by: string
          custom_meeting_link: string | null
          daily_limit: number | null
          default_duration: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_advance_days: number | null
          meeting_provider: string | null
          min_notice_hours: number | null
          mode: string
          name: string
          public_slug: string | null
          require_company: boolean | null
          require_contact: boolean | null
          require_opportunity: boolean | null
          updated_at: string
          weekly_limit: number | null
          workspace_id: string
        }
        Insert: {
          availability_windows?: Json | null
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string
          color?: string | null
          created_at?: string
          created_by: string
          custom_meeting_link?: string | null
          daily_limit?: number | null
          default_duration?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_advance_days?: number | null
          meeting_provider?: string | null
          min_notice_hours?: number | null
          mode?: string
          name: string
          public_slug?: string | null
          require_company?: boolean | null
          require_contact?: boolean | null
          require_opportunity?: boolean | null
          updated_at?: string
          weekly_limit?: number | null
          workspace_id: string
        }
        Update: {
          availability_windows?: Json | null
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string
          color?: string | null
          created_at?: string
          created_by?: string
          custom_meeting_link?: string | null
          daily_limit?: number | null
          default_duration?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_advance_days?: number | null
          meeting_provider?: string | null
          min_notice_hours?: number | null
          mode?: string
          name?: string
          public_slug?: string | null
          require_company?: boolean | null
          require_contact?: boolean | null
          require_opportunity?: boolean | null
          updated_at?: string
          weekly_limit?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          booked_at: string | null
          booked_by: string | null
          buffer_after: number | null
          buffer_before: number | null
          calendar_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          client_notes: string | null
          company_id: string | null
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          crm_activity_id: string | null
          description: string | null
          end_time: string
          external_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          follow_up_task_id: string | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          location: string | null
          meeting_provider: string | null
          meeting_type_id: string | null
          meeting_url: string | null
          metadata: Json | null
          mode: string
          next_steps: string | null
          opportunity_id: string | null
          outcome: string | null
          outcome_notes: string | null
          phone_number: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          service_id: string | null
          source: string | null
          start_time: string
          status: string
          timezone: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          booked_at?: string | null
          booked_by?: string | null
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          client_notes?: string | null
          company_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          crm_activity_id?: string | null
          description?: string | null
          end_time: string
          external_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          follow_up_task_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          location?: string | null
          meeting_provider?: string | null
          meeting_type_id?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          mode?: string
          next_steps?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          phone_number?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          service_id?: string | null
          source?: string | null
          start_time: string
          status?: string
          timezone?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          booked_at?: string | null
          booked_by?: string | null
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          client_notes?: string | null
          company_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          crm_activity_id?: string | null
          description?: string | null
          end_time?: string
          external_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          follow_up_task_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          location?: string | null
          meeting_provider?: string | null
          meeting_type_id?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          mode?: string
          next_steps?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          phone_number?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          service_id?: string | null
          source?: string | null
          start_time?: string
          status?: string
          timezone?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "meeting_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workspace_id_fkey"
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
          email_in_reply_to: string | null
          email_message_id: string | null
          email_references: string[] | null
          email_subject: string | null
          external_message_id: string | null
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
          email_in_reply_to?: string | null
          email_message_id?: string | null
          email_references?: string[] | null
          email_subject?: string | null
          external_message_id?: string | null
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
          email_in_reply_to?: string | null
          email_message_id?: string | null
          email_references?: string[] | null
          email_subject?: string | null
          external_message_id?: string | null
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
      module_access_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          module_id: string
          request_path: string | null
          session_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          module_id: string
          request_path?: string | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          module_id?: string
          request_path?: string | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_access_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "module_sso_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_access_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_action_costs: {
        Row: {
          action_description: string | null
          action_key: string
          action_name: string
          created_at: string
          credits_cost: number
          id: string
          internal_cost: number | null
          module_id: string
          visible_to_customer: boolean | null
        }
        Insert: {
          action_description?: string | null
          action_key: string
          action_name: string
          created_at?: string
          credits_cost?: number
          id?: string
          internal_cost?: number | null
          module_id: string
          visible_to_customer?: boolean | null
        }
        Update: {
          action_description?: string | null
          action_key?: string
          action_name?: string
          created_at?: string
          credits_cost?: number
          id?: string
          internal_cost?: number | null
          module_id?: string
          visible_to_customer?: boolean | null
        }
        Relationships: []
      }
      module_action_logs: {
        Row: {
          action_type: string
          created_at: string
          credits_consumed: number | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          module_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_consumed?: number | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_consumed?: number | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_action_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_action_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_bundles: {
        Row: {
          bundle_price: number
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_featured: boolean | null
          module_ids: string[]
          name: string
          original_price: number | null
          slug: string | null
          stripe_price_id: string | null
        }
        Insert: {
          bundle_price: number
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          module_ids: string[]
          name: string
          original_price?: number | null
          slug?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          bundle_price?: number
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          module_ids?: string[]
          name?: string
          original_price?: number | null
          slug?: string | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      module_conversions: {
        Row: {
          conversion_type: string
          converted_at: string
          currency: string | null
          id: string
          module_id: string
          price_paid: number | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          trial_days_used: number | null
          trial_uses_consumed: number | null
          user_id: string | null
          value_generated: Json | null
          workspace_id: string
        }
        Insert: {
          conversion_type: string
          converted_at?: string
          currency?: string | null
          id?: string
          module_id: string
          price_paid?: number | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          trial_days_used?: number | null
          trial_uses_consumed?: number | null
          user_id?: string | null
          value_generated?: Json | null
          workspace_id: string
        }
        Update: {
          conversion_type?: string
          converted_at?: string
          currency?: string | null
          id?: string
          module_id?: string
          price_paid?: number | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          trial_days_used?: number | null
          trial_uses_consumed?: number | null
          user_id?: string | null
          value_generated?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_conversions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_conversions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_pricing: {
        Row: {
          base_price_monthly: number | null
          base_price_yearly: number | null
          created_at: string
          credit_price: number | null
          credits_included: number | null
          currency: string | null
          id: string
          internal_cost_per_credit: number | null
          is_active: boolean | null
          module_id: string
          pricing_model: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          base_price_monthly?: number | null
          base_price_yearly?: number | null
          created_at?: string
          credit_price?: number | null
          credits_included?: number | null
          currency?: string | null
          id?: string
          internal_cost_per_credit?: number | null
          is_active?: boolean | null
          module_id: string
          pricing_model?: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          base_price_monthly?: number | null
          base_price_yearly?: number | null
          created_at?: string
          credit_price?: number | null
          credits_included?: number | null
          currency?: string | null
          id?: string
          internal_cost_per_credit?: number | null
          is_active?: boolean | null
          module_id?: string
          pricing_model?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      module_sso_sessions: {
        Row: {
          context_snapshot: Json
          created_at: string
          expires_at: string
          granted_scopes: string[]
          id: string
          integration_mode: Database["public"]["Enums"]["integration_mode"]
          ip_address: unknown
          is_active: boolean
          last_activity_at: string | null
          module_id: string
          revoked_at: string | null
          revoked_by: string | null
          session_token: string
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          context_snapshot?: Json
          created_at?: string
          expires_at: string
          granted_scopes?: string[]
          id?: string
          integration_mode?: Database["public"]["Enums"]["integration_mode"]
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string | null
          module_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          context_snapshot?: Json
          created_at?: string
          expires_at?: string
          granted_scopes?: string[]
          id?: string
          integration_mode?: Database["public"]["Enums"]["integration_mode"]
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string | null
          module_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_sso_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_sso_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          module_id: string
          nonce: string
          session_id: string
          status: Database["public"]["Enums"]["sso_token_status"]
          token: string
          token_hash: string
          used_at: string | null
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          module_id: string
          nonce: string
          session_id: string
          status?: Database["public"]["Enums"]["sso_token_status"]
          token: string
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          module_id?: string
          nonce?: string
          session_id?: string
          status?: Database["public"]["Enums"]["sso_token_status"]
          token?: string
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_sso_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "module_sso_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_sso_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_trial_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          days_remaining: number | null
          dismissed_at: string | null
          id: string
          is_dismissed: boolean | null
          module_id: string
          shown_at: string
          shown_date: string
          user_id: string | null
          uses_remaining: number | null
          workspace_id: string
        }
        Insert: {
          alert_message: string
          alert_type: string
          days_remaining?: number | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          module_id: string
          shown_at?: string
          shown_date?: string
          user_id?: string | null
          uses_remaining?: number | null
          workspace_id: string
        }
        Update: {
          alert_message?: string
          alert_type?: string
          days_remaining?: number | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          module_id?: string
          shown_at?: string
          shown_date?: string
          user_id?: string | null
          uses_remaining?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_trial_alerts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_trial_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_trial_logs: {
        Row: {
          action_key: string | null
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          module_id: string
          user_id: string | null
          uses_after: number | null
          uses_before: number | null
          workspace_id: string
        }
        Insert: {
          action_key?: string | null
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module_id: string
          user_id?: string | null
          uses_after?: number | null
          uses_before?: number | null
          workspace_id: string
        }
        Update: {
          action_key?: string | null
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module_id?: string
          user_id?: string | null
          uses_after?: number | null
          uses_before?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_trial_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_trial_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_usage: {
        Row: {
          contacts_created: number | null
          created_at: string
          credits_used: number | null
          id: string
          leads_created: number | null
          module_id: string
          opportunities_created: number | null
          period_end: string
          period_start: string
          revenue_attributed: number | null
          total_calls: number | null
          total_records_created: number | null
          total_records_updated: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contacts_created?: number | null
          created_at?: string
          credits_used?: number | null
          id?: string
          leads_created?: number | null
          module_id: string
          opportunities_created?: number | null
          period_end: string
          period_start: string
          revenue_attributed?: number | null
          total_calls?: number | null
          total_records_created?: number | null
          total_records_updated?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contacts_created?: number | null
          created_at?: string
          credits_used?: number | null
          id?: string
          leads_created?: number | null
          module_id?: string
          opportunities_created?: number | null
          period_end?: string
          period_start?: string
          revenue_attributed?: number | null
          total_calls?: number | null
          total_records_created?: number | null
          total_records_updated?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_usage_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_usage_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_usage: number | null
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_read: boolean | null
          message: string
          module_id: string
          usage_limit: number | null
          workspace_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          current_usage?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          module_id: string
          usage_limit?: number | null
          workspace_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_usage?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          module_id?: string
          usage_limit?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_usage_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          ai_analyzed_at: string | null
          ai_insight: string | null
          ai_next_action: string | null
          ai_temperature: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          last_activity_at: string | null
          lead_id: string | null
          lost_reason: string | null
          notes: string | null
          owner_id: string
          probability: number | null
          source: string | null
          stage_id: string
          status: string
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_temperature?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_id: string
          probability?: number | null
          source?: string | null
          stage_id: string
          status?: string
          title: string
          updated_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_insight?: string | null
          ai_next_action?: string | null
          ai_temperature?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string
          probability?: number | null
          source?: string | null
          stage_id?: string
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
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
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          opportunity_id: string
          status: string
          stripe_payment_id: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          opportunity_id: string
          status?: string
          stripe_payment_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          opportunity_id?: string
          status?: string
          stripe_payment_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          pipeline_id: string | null
          position: number
          probability: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pipeline_id?: string | null
          position?: number
          probability?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pipeline_id?: string | null
          position?: number
          probability?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean | null
          feature_key: string
          id: string
          limit_value: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          feature_key: string
          id?: string
          limit_value?: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean | null
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "internal_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          post_id: string | null
          read_at: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          post_id?: string | null
          read_at?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_by?: string
          mentioned_user_id?: string
          post_id?: string | null
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "internal_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "internal_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_components: {
        Row: {
          component_product_id: string
          cost_override: number | null
          created_at: string
          id: string
          is_optional: boolean
          parent_product_id: string
          position: number
          price_override: number | null
          quantity: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          component_product_id: string
          cost_override?: number | null
          created_at?: string
          id?: string
          is_optional?: boolean
          parent_product_id: string
          position?: number
          price_override?: number | null
          quantity?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          component_product_id?: string
          cost_override?: number | null
          created_at?: string
          id?: string
          is_optional?: boolean
          parent_product_id?: string
          position?: number
          price_override?: number | null
          quantity?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_components_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cycles: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          position: number
          product_id: string
          trigger_type: string
          trigger_value: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          product_id: string
          trigger_type: string
          trigger_value: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          product_id?: string
          trigger_type?: string
          trigger_value?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cycles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cycles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cycles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          ai_prompt: string | null
          alt_text: string | null
          created_at: string
          id: string
          is_ai_generated: boolean
          position: number
          product_id: string
          url: string
          workspace_id: string
        }
        Insert: {
          ai_prompt?: string | null
          alt_text?: string | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          position?: number
          product_id: string
          url: string
          workspace_id: string
        }
        Update: {
          ai_prompt?: string | null
          alt_text?: string | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          position?: number
          product_id?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_progressions: {
        Row: {
          confidence_score: number | null
          created_at: string
          from_product_id: string
          id: string
          is_active: boolean
          is_ai_suggested: boolean | null
          position: number
          progression_name: string | null
          recommended_action: string | null
          suggested_message: string | null
          timing_days: number | null
          timing_window_end: number | null
          timing_window_start: number | null
          to_product_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          from_product_id: string
          id?: string
          is_active?: boolean
          is_ai_suggested?: boolean | null
          position?: number
          progression_name?: string | null
          recommended_action?: string | null
          suggested_message?: string | null
          timing_days?: number | null
          timing_window_end?: number | null
          timing_window_start?: number | null
          to_product_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          from_product_id?: string
          id?: string
          is_active?: boolean
          is_ai_suggested?: boolean | null
          position?: number
          progression_name?: string | null
          recommended_action?: string | null
          suggested_message?: string | null
          timing_days?: number | null
          timing_window_end?: number | null
          timing_window_start?: number | null
          to_product_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_progressions_from_product_id_fkey"
            columns: ["from_product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_progressions_from_product_id_fkey"
            columns: ["from_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_progressions_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_progressions_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_progressions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          benefits: string[] | null
          billing_frequency: string | null
          billing_type: string
          bundle_price_mode: string | null
          category: string | null
          commercial_description: string | null
          commission_default: number | null
          conditions: string | null
          consumption_model: string | null
          created_at: string
          created_by: string
          currency: string
          delivery_mode: string | null
          direct_cost: number | null
          id: string
          images: string[] | null
          included_quantity: number | null
          is_trackable: boolean | null
          name: string
          operational_cost: number | null
          primary_image_index: number | null
          product_type: string
          recommended_frequency: string | null
          recurring_fee: number | null
          setup_fee: number | null
          sheet_published: boolean | null
          sheet_slug: string | null
          short_description: string | null
          sku: string | null
          status: string
          target_margin_pct: number | null
          tax_rate_estimate_pct: number | null
          total_units: number | null
          typical_duration_days: number | null
          unit_duration: number | null
          unit_name: string | null
          updated_at: string
          validity_days: number | null
          workspace_id: string
        }
        Insert: {
          base_price?: number
          benefits?: string[] | null
          billing_frequency?: string | null
          billing_type?: string
          bundle_price_mode?: string | null
          category?: string | null
          commercial_description?: string | null
          commission_default?: number | null
          conditions?: string | null
          consumption_model?: string | null
          created_at?: string
          created_by: string
          currency?: string
          delivery_mode?: string | null
          direct_cost?: number | null
          id?: string
          images?: string[] | null
          included_quantity?: number | null
          is_trackable?: boolean | null
          name: string
          operational_cost?: number | null
          primary_image_index?: number | null
          product_type?: string
          recommended_frequency?: string | null
          recurring_fee?: number | null
          setup_fee?: number | null
          sheet_published?: boolean | null
          sheet_slug?: string | null
          short_description?: string | null
          sku?: string | null
          status?: string
          target_margin_pct?: number | null
          tax_rate_estimate_pct?: number | null
          total_units?: number | null
          typical_duration_days?: number | null
          unit_duration?: number | null
          unit_name?: string | null
          updated_at?: string
          validity_days?: number | null
          workspace_id: string
        }
        Update: {
          base_price?: number
          benefits?: string[] | null
          billing_frequency?: string | null
          billing_type?: string
          bundle_price_mode?: string | null
          category?: string | null
          commercial_description?: string | null
          commission_default?: number | null
          conditions?: string | null
          consumption_model?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          delivery_mode?: string | null
          direct_cost?: number | null
          id?: string
          images?: string[] | null
          included_quantity?: number | null
          is_trackable?: boolean | null
          name?: string
          operational_cost?: number | null
          primary_image_index?: number | null
          product_type?: string
          recommended_frequency?: string | null
          recurring_fee?: number | null
          setup_fee?: number | null
          sheet_published?: boolean | null
          sheet_slug?: string | null
          short_description?: string | null
          sku?: string | null
          status?: string
          target_margin_pct?: number | null
          tax_rate_estimate_pct?: number | null
          total_units?: number | null
          typical_duration_days?: number | null
          unit_duration?: number | null
          unit_name?: string | null
          updated_at?: string
          validity_days?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
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
      proposal_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          proposal_id: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          proposal_id: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          proposal_id?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_activity_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          proposal_id: string
          template_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          proposal_id: string
          template_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          proposal_id?: string
          template_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_analytics_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_analytics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          bundle_snapshot: Json | null
          commission_pct_snapshot: number | null
          cost_snapshot: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          operational_cost_snapshot: number | null
          position: number
          product_id: string | null
          proposal_id: string
          quantity: number
          total_price: number | null
          unit_price: number
          units_sold: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bundle_snapshot?: Json | null
          commission_pct_snapshot?: number | null
          cost_snapshot?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          operational_cost_snapshot?: number | null
          position?: number
          product_id?: string | null
          proposal_id: string
          quantity?: number
          total_price?: number | null
          unit_price: number
          units_sold?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bundle_snapshot?: Json | null
          commission_pct_snapshot?: number | null
          cost_snapshot?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          operational_cost_snapshot?: number | null
          position?: number
          product_id?: string | null
          proposal_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
          units_sold?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          content_blocks: Json
          created_at: string
          created_by: string | null
          cta_color: string | null
          cta_text: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          styles: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          styles?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          styles?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          change_summary: string | null
          content_blocks: Json
          created_at: string
          created_by: string | null
          id: string
          proposal_id: string
          variables: Json | null
          version: number
        }
        Insert: {
          change_summary?: string | null
          content_blocks: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id: string
          variables?: Json | null
          version: number
        }
        Update: {
          change_summary?: string | null
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          content_blocks: Json
          created_at: string
          created_by: string | null
          cta_color: string | null
          cta_text: string | null
          currency: string | null
          expires_at: string | null
          id: string
          opportunity_id: string
          payment_idempotency_key: string | null
          payment_status: string | null
          price: number | null
          published_at: string | null
          slug: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          styles: Json | null
          template_id: string | null
          title: string
          updated_at: string
          variables: Json | null
          views_count: number | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          opportunity_id: string
          payment_idempotency_key?: string | null
          payment_status?: string | null
          price?: number | null
          published_at?: string | null
          slug: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          styles?: Json | null
          template_id?: string | null
          title: string
          updated_at?: string
          variables?: Json | null
          views_count?: number | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          opportunity_id?: string
          payment_idempotency_key?: string | null
          payment_status?: string | null
          price?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          styles?: Json | null
          template_id?: string | null
          title?: string
          updated_at?: string
          variables?: Json | null
          views_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          service_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          service_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          service_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          location_address: string | null
          location_name: string | null
          location_type: string
          meeting_url: string | null
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          location_address?: string | null
          location_name?: string | null
          location_type: string
          meeting_url?: string | null
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          location_address?: string | null
          location_name?: string | null
          location_type?: string
          meeting_url?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resources: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          quantity: number | null
          resource_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          quantity?: number | null
          resource_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          quantity?: number | null
          resource_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "meeting_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_team_assignments: {
        Row: {
          created_at: string
          id: string
          routing_mode: string | null
          service_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          routing_mode?: string | null
          service_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          routing_mode?: string | null
          service_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_team_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_user_assignments: {
        Row: {
          created_at: string
          custom_duration: number | null
          custom_price: number | null
          id: string
          is_primary: boolean | null
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          is_primary?: boolean | null
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          is_primary?: boolean | null
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_user_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allow_cancellation: boolean | null
          buffer_after: number | null
          buffer_before: number | null
          cancellation_hours: number | null
          category_id: string | null
          color: string | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          duration: number
          form_id: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_booking_days: number | null
          max_per_day: number | null
          metadata: Json | null
          min_notice_hours: number | null
          name: string
          price: number | null
          requires_confirmation: boolean | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_cancellation?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          cancellation_hours?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          duration?: number
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_booking_days?: number | null
          max_per_day?: number | null
          metadata?: Json | null
          min_notice_hours?: number | null
          name: string
          price?: number | null
          requires_confirmation?: boolean | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_cancellation?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          cancellation_hours?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          duration?: number
          form_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_booking_days?: number | null
          max_per_day?: number | null
          metadata?: Json | null
          min_notice_hours?: number | null
          name?: string
          price?: number | null
          requires_confirmation?: boolean | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_consumptions: {
        Row: {
          created_at: string
          entitlement_id: string
          id: string
          notes: string | null
          performed_by: string
          session_date: string
          units_consumed: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entitlement_id: string
          id?: string
          notes?: string | null
          performed_by: string
          session_date?: string
          units_consumed?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          entitlement_id?: string
          id?: string
          notes?: string | null
          performed_by?: string
          session_date?: string
          units_consumed?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_consumptions_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_event_log: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          stripe_event_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_event_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_incidents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          incident_type: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_incidents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_at: string | null
          id: string
          related_id: string
          related_type: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          related_id: string
          related_type: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          related_id?: string
          related_type?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      template_activity_logs: {
        Row: {
          channel: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          missing_variables: string[] | null
          rendered_content: string
          rendered_subject: string | null
          template_id: string
          user_id: string
          variables_used: Json | null
          workspace_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          missing_variables?: string[] | null
          rendered_content: string
          rendered_subject?: string | null
          template_id: string
          user_id: string
          variables_used?: Json | null
          workspace_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          missing_variables?: string[] | null
          rendered_content?: string
          rendered_subject?: string | null
          template_id?: string
          user_id?: string
          variables_used?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_activity_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          position: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          position?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          position?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_logs: {
        Row: {
          automation_id: string | null
          channel: string
          converted: boolean | null
          entity_id: string
          entity_type: string
          id: string
          response_received: boolean | null
          template_id: string
          used_at: string | null
          used_by: string
          workspace_id: string
        }
        Insert: {
          automation_id?: string | null
          channel: string
          converted?: boolean | null
          entity_id: string
          entity_type: string
          id?: string
          response_received?: boolean | null
          template_id: string
          used_at?: string | null
          used_by: string
          workspace_id: string
        }
        Update: {
          automation_id?: string | null
          channel?: string
          converted?: boolean | null
          entity_id?: string
          entity_type?: string
          id?: string
          response_received?: boolean | null
          template_id?: string
          used_at?: string | null
          used_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "journey_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          rich_content: Json | null
          subject: string | null
          template_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          rich_content?: Json | null
          subject?: string | null
          template_id: string
          version: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          rich_content?: Json | null
          subject?: string | null
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          click_rate: number | null
          compatible_modules: string[] | null
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          folder_id: string | null
          goal: Database["public"]["Enums"]["template_goal"] | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          language: string | null
          last_used_at: string | null
          linked_company_id: string | null
          linked_contact_id: string | null
          linked_opportunity_id: string | null
          name: string
          reply_rate: number | null
          required_variables: string[] | null
          rich_content: Json | null
          subject: string | null
          tags: string[] | null
          tone: Database["public"]["Enums"]["template_tone"] | null
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          click_rate?: number | null
          compatible_modules?: string[] | null
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          goal?: Database["public"]["Enums"]["template_goal"] | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          language?: string | null
          last_used_at?: string | null
          linked_company_id?: string | null
          linked_contact_id?: string | null
          linked_opportunity_id?: string | null
          name: string
          reply_rate?: number | null
          required_variables?: string[] | null
          rich_content?: Json | null
          subject?: string | null
          tags?: string[] | null
          tone?: Database["public"]["Enums"]["template_tone"] | null
          type: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          click_rate?: number | null
          compatible_modules?: string[] | null
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          goal?: Database["public"]["Enums"]["template_goal"] | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          language?: string | null
          last_used_at?: string | null
          linked_company_id?: string | null
          linked_contact_id?: string | null
          linked_opportunity_id?: string | null
          name?: string
          reply_rate?: number | null
          required_variables?: string[] | null
          rich_content?: Json | null
          subject?: string | null
          tags?: string[] | null
          tone?: Database["public"]["Enums"]["template_tone"] | null
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_linked_company_id_fkey"
            columns: ["linked_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_linked_contact_id_fkey"
            columns: ["linked_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_linked_opportunity_id_fkey"
            columns: ["linked_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_usage: number
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_dismissed: boolean | null
          limit_value: number
          message: string
          resource_type: string
          threshold_percent: number
          workspace_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          current_usage: number
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean | null
          limit_value: number
          message: string
          resource_type: string
          threshold_percent: number
          workspace_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_usage?: number
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean | null
          limit_value?: number
          message?: string
          resource_type?: string
          threshold_percent?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          quantity: number | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          quantity?: number | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          quantity?: number | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_feed_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_availability: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          timezone: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          timezone?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_availability_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_bundles: {
        Row: {
          bundle_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          purchased_at: string | null
          status: string | null
          stripe_subscription_id: string | null
          workspace_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          workspace_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_bundles_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_bundles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credit_balances: {
        Row: {
          created_at: string
          credits_remaining: number | null
          credits_total: number
          credits_used: number
          extra_credits: number | null
          extra_credits_used: number | null
          id: string
          module_id: string
          period_end: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number | null
          credits_total?: number
          credits_used?: number
          extra_credits?: number | null
          extra_credits_used?: number | null
          id?: string
          module_id: string
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number | null
          credits_total?: number
          credits_used?: number
          extra_credits?: number | null
          extra_credits_used?: number | null
          id?: string
          module_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credit_balances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_industry_labels: {
        Row: {
          created_at: string
          created_by: string | null
          entity_labels: Json
          field_labels: Json
          id: string
          industry_type: string
          is_active: boolean | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_labels?: Json
          field_labels?: Json
          id?: string
          industry_type?: string
          is_active?: boolean | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_labels?: Json
          field_labels?: Json
          id?: string
          industry_type?: string
          is_active?: boolean | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_industry_labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_module_subscriptions: {
        Row: {
          activated_at: string | null
          billing_cycle: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          module_id: string
          status: string
          stripe_subscription_id: string | null
          stripe_subscription_item_id: string | null
          trial_end: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activated_at?: string | null
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          module_id: string
          status?: string
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          trial_end?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activated_at?: string | null
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          module_id?: string
          status?: string
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          trial_end?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_module_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_modules: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          grace_period_ends_at: string | null
          id: string
          last_alert_at: string | null
          last_alert_shown: string | null
          module_id: string
          settings: Json | null
          status: string
          subscribed_at: string
          subscribed_by: string
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_uses_consumed: number | null
          updated_at: string
          value_generated: Json | null
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          grace_period_ends_at?: string | null
          id?: string
          last_alert_at?: string | null
          last_alert_shown?: string | null
          module_id: string
          settings?: Json | null
          status?: string
          subscribed_at?: string
          subscribed_by: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_uses_consumed?: number | null
          updated_at?: string
          value_generated?: Json | null
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          grace_period_ends_at?: string | null
          id?: string
          last_alert_at?: string | null
          last_alert_shown?: string | null
          module_id?: string
          settings?: Json | null
          status?: string
          subscribed_at?: string
          subscribed_by?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_uses_consumed?: number | null
          updated_at?: string
          value_generated?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_modules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_onboarding: {
        Row: {
          business_type: string | null
          channels: string[] | null
          completed_at: string | null
          created_at: string
          custom_business_type: string | null
          id: string
          process_description: string | null
          skipped: boolean | null
          success_definition: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_type?: string | null
          channels?: string[] | null
          completed_at?: string | null
          created_at?: string
          custom_business_type?: string | null
          id?: string
          process_description?: string | null
          skipped?: boolean | null
          success_definition?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_type?: string | null
          channels?: string[] | null
          completed_at?: string | null
          created_at?: string
          custom_business_type?: string | null
          id?: string
          process_description?: string | null
          skipped?: boolean | null
          success_definition?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_onboarding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_overrides: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          override_type: string
          override_value: Json
          reason: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          override_type: string
          override_value: Json
          reason: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          override_type?: string
          override_value?: Json
          reason?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_usage: {
        Row: {
          ai_calls_used: number | null
          ai_insights_used: number | null
          ai_suggestions_used: number | null
          automations_count: number | null
          automations_executed: number | null
          companies_count: number | null
          contacts_count: number | null
          created_at: string
          emails_sent: number | null
          id: string
          instagram_sent: number | null
          leads_count: number | null
          opportunities_count: number | null
          period_start: string
          storage_used_mb: number | null
          templates_count: number | null
          updated_at: string
          whatsapp_sent: number | null
          workspace_id: string
        }
        Insert: {
          ai_calls_used?: number | null
          ai_insights_used?: number | null
          ai_suggestions_used?: number | null
          automations_count?: number | null
          automations_executed?: number | null
          companies_count?: number | null
          contacts_count?: number | null
          created_at?: string
          emails_sent?: number | null
          id?: string
          instagram_sent?: number | null
          leads_count?: number | null
          opportunities_count?: number | null
          period_start?: string
          storage_used_mb?: number | null
          templates_count?: number | null
          updated_at?: string
          whatsapp_sent?: number | null
          workspace_id: string
        }
        Update: {
          ai_calls_used?: number | null
          ai_insights_used?: number | null
          ai_suggestions_used?: number | null
          automations_count?: number | null
          automations_executed?: number | null
          companies_count?: number | null
          contacts_count?: number | null
          created_at?: string
          emails_sent?: number | null
          id?: string
          instagram_sent?: number | null
          leads_count?: number | null
          opportunities_count?: number | null
          period_start?: string
          storage_used_mb?: number | null
          templates_count?: number | null
          updated_at?: string
          whatsapp_sent?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_email: string | null
          billing_postal_code: string | null
          cae_codes: string[] | null
          cae_description: string | null
          capital_social: string | null
          company_name: string | null
          company_status: string | null
          county: string | null
          created_at: string
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          id: string
          instagram_url: string | null
          legal_nature: string | null
          linkedin_url: string | null
          managed_by_workspace_id: string | null
          name: string
          owner_id: string | null
          parish: string | null
          phone: string | null
          racius_url: string | null
          region: string | null
          slug: string
          status: string | null
          tax_id: string | null
          twitter_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          company_name?: string | null
          company_status?: string | null
          county?: string | null
          created_at?: string
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          instagram_url?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          managed_by_workspace_id?: string | null
          name: string
          owner_id?: string | null
          parish?: string | null
          phone?: string | null
          racius_url?: string | null
          region?: string | null
          slug: string
          status?: string | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          company_name?: string | null
          company_status?: string | null
          county?: string | null
          created_at?: string
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          instagram_url?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          managed_by_workspace_id?: string | null
          name?: string
          owner_id?: string | null
          parish?: string | null
          phone?: string | null
          racius_url?: string | null
          region?: string | null
          slug?: string
          status?: string | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_managed_by_workspace_id_fkey"
            columns: ["managed_by_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_usage_stats: {
        Row: {
          acceptance_rate: number | null
          accepted_proposals: number | null
          avg_margin_pct: number | null
          avg_ticket: number | null
          base_price: number | null
          commission_default: number | null
          direct_cost: number | null
          last_sale_at: string | null
          operational_cost: number | null
          product_id: string | null
          product_name: string | null
          published_proposals: number | null
          revenue_1y: number | null
          revenue_30d: number | null
          revenue_90d: number | null
          sales_30d: number | null
          total_commission: number | null
          total_proposals: number | null
          total_revenue: number | null
          total_sales: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_module_credits: {
        Args: {
          p_credits: number
          p_is_extra?: boolean
          p_module_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      calculate_module_margin: {
        Args: {
          p_end_date?: string
          p_module_id: string
          p_start_date?: string
        }
        Returns: {
          gross_margin: number
          margin_percent: number
          total_credits_consumed: number
          total_internal_cost: number
          total_revenue: number
          total_subscriptions: number
        }[]
      }
      check_custom_field_unique_value: {
        Args: { p_custom_field_id: string; p_entity_id: string; p_value: Json }
        Returns: boolean
      }
      check_meeting_conflicts: {
        Args: {
          p_end_time: string
          p_exclude_meeting_id?: string
          p_resource_ids?: string[]
          p_start_time: string
          p_user_ids?: string[]
          p_workspace_id: string
        }
        Returns: {
          conflict_end: string
          conflict_id: string
          conflict_start: string
          conflict_title: string
          conflict_type: string
        }[]
      }
      check_module_access: {
        Args: { p_module_id: string; p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      check_module_credits: {
        Args: {
          p_action_key: string
          p_module_id: string
          p_workspace_id: string
        }
        Returns: {
          can_execute: boolean
          credits_available: number
          credits_required: number
          message: string
        }[]
      }
      check_user_availability: {
        Args: {
          p_end_time: string
          p_start_time: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      check_workspace_quota: {
        Args: { p_resource_type: string; p_workspace_id: string }
        Returns: Json
      }
      cleanup_expired_sso_tokens: { Args: never; Returns: undefined }
      consume_module_credits: {
        Args: {
          p_action_key: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_module_id: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: {
          credits_consumed: number
          credits_remaining: number
          message: string
          success: boolean
        }[]
      }
      consume_trial_usage: {
        Args: {
          p_action_key: string
          p_metadata?: Json
          p_module_id: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      convert_trial_to_paid: {
        Args: {
          p_module_id: string
          p_price_paid?: number
          p_stripe_subscription_id?: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      create_meeting_followup_task: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_meeting_id: string
          p_title: string
        }
        Returns: string
      }
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: Json
      }
      generate_invoice_number: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      get_available_meeting_slots: {
        Args: {
          p_date: string
          p_duration_minutes?: number
          p_meeting_type_id?: string
          p_user_ids?: string[]
          p_workspace_id: string
        }
        Returns: {
          is_available: boolean
          slot_end: string
          slot_start: string
        }[]
      }
      get_module_trial_status: {
        Args: { p_module_id: string; p_workspace_id: string }
        Returns: Json
      }
      get_plan_limits: {
        Args: { p_plan: Database["public"]["Enums"]["subscription_plan"] }
        Returns: Json
      }
      get_workspace_usage_counts: {
        Args: { p_workspace_id: string }
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
      is_feature_enabled: {
        Args: { p_feature_key: string; p_workspace_id: string }
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
      log_admin_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_target_id?: string
          p_target_type: string
          p_workspace_id?: string
        }
        Returns: string
      }
      revoke_module_sessions: {
        Args: {
          p_module_id: string
          p_revoked_by?: string
          p_workspace_id: string
        }
        Returns: number
      }
      start_module_trial: {
        Args: {
          p_module_id: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      automation_action_type:
        | "create_task"
        | "move_opportunity_stage"
        | "send_message"
        | "notify_user"
        | "assign_owner"
        | "add_tag"
        | "create_opportunity"
        | "update_field"
        | "send_template_message"
        | "create_proposal"
        | "send_proposal_link"
        | "wait_time"
        | "stop_automation"
        | "change_lead_status"
      automation_state: "draft" | "active" | "paused" | "error"
      automation_trigger:
        | "lead_created"
        | "opportunity_stage_changed"
        | "payment_confirmed"
        | "lead_updated"
        | "custom_field_updated"
        | "opportunity_created"
        | "opportunity_updated"
        | "contact_created"
        | "contact_updated"
        | "company_created"
        | "company_updated"
        | "proposal_paid"
        | "lead_status_changed"
        | "lead_no_response"
        | "opportunity_value_changed"
        | "message_received"
        | "conversation_no_reply"
        | "proposal_created"
        | "proposal_viewed"
        | "scheduled_time"
        | "first_message_from_lead"
        | "conversation_resolved"
        | "conversation_priority_changed"
        | "inbox_priority_changed"
        | "inbox_lead_status_changed"
        | "inbox_opportunity_created"
        | "inbox_proposal_sent"
        | "inbox_followup_scheduled"
        | "tag_added"
        | "tag_removed"
        | "form_submitted"
        | "lead_score_changed"
        | "lead_temperature_changed"
        | "contact_score_changed"
        | "contact_temperature_changed"
        | "company_score_changed"
        | "company_temperature_changed"
      condition_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "greater_than"
        | "less_than"
        | "is_empty"
        | "is_not_empty"
      contact_entity_type: "consumidor_final" | "eni" | "empresa"
      crm_entity_type: "contacts" | "opportunities"
      crm_view_mode: "table" | "board"
      execution_status: "pending" | "running" | "completed" | "failed"
      feed_type: "workspace" | "team" | "user" | "client"
      integration_mode: "embed" | "redirect" | "headless"
      post_type:
        | "update"
        | "help_request"
        | "daily_checklist"
        | "winners"
        | "ai_alert"
      sso_token_status: "pending" | "active" | "used" | "expired" | "revoked"
      subscription_plan: "free" | "basic" | "pro" | "agency"
      template_goal:
        | "qualification"
        | "follow_up"
        | "booking"
        | "closing"
        | "support"
        | "other"
      template_tone: "formal" | "direct" | "friendly" | "casual"
      template_type: "email" | "whatsapp" | "instagram_dm" | "proposal" | "sms"
      workspace_role: "owner" | "admin" | "agent" | "viewer" | "agency"
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
        "assign_owner",
        "add_tag",
        "create_opportunity",
        "update_field",
        "send_template_message",
        "create_proposal",
        "send_proposal_link",
        "wait_time",
        "stop_automation",
        "change_lead_status",
      ],
      automation_state: ["draft", "active", "paused", "error"],
      automation_trigger: [
        "lead_created",
        "opportunity_stage_changed",
        "payment_confirmed",
        "lead_updated",
        "custom_field_updated",
        "opportunity_created",
        "opportunity_updated",
        "contact_created",
        "contact_updated",
        "company_created",
        "company_updated",
        "proposal_paid",
        "lead_status_changed",
        "lead_no_response",
        "opportunity_value_changed",
        "message_received",
        "conversation_no_reply",
        "proposal_created",
        "proposal_viewed",
        "scheduled_time",
        "first_message_from_lead",
        "conversation_resolved",
        "conversation_priority_changed",
        "inbox_priority_changed",
        "inbox_lead_status_changed",
        "inbox_opportunity_created",
        "inbox_proposal_sent",
        "inbox_followup_scheduled",
        "tag_added",
        "tag_removed",
        "form_submitted",
        "lead_score_changed",
        "lead_temperature_changed",
        "contact_score_changed",
        "contact_temperature_changed",
        "company_score_changed",
        "company_temperature_changed",
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
      contact_entity_type: ["consumidor_final", "eni", "empresa"],
      crm_entity_type: ["contacts", "opportunities"],
      crm_view_mode: ["table", "board"],
      execution_status: ["pending", "running", "completed", "failed"],
      feed_type: ["workspace", "team", "user", "client"],
      integration_mode: ["embed", "redirect", "headless"],
      post_type: [
        "update",
        "help_request",
        "daily_checklist",
        "winners",
        "ai_alert",
      ],
      sso_token_status: ["pending", "active", "used", "expired", "revoked"],
      subscription_plan: ["free", "basic", "pro", "agency"],
      template_goal: [
        "qualification",
        "follow_up",
        "booking",
        "closing",
        "support",
        "other",
      ],
      template_tone: ["formal", "direct", "friendly", "casual"],
      template_type: ["email", "whatsapp", "instagram_dm", "proposal", "sms"],
      workspace_role: ["owner", "admin", "agent", "viewer", "agency"],
      workspace_status: ["active", "suspended", "inactive", "pending"],
    },
  },
} as const
