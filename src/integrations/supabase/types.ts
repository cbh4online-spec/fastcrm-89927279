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
      companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          size: string | null
          tags: string[] | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          size?: string | null
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          size?: string | null
          tags?: string[] | null
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
      contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          job_title: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          job_title?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          job_title?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
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
          unread_count: number
          updated_at: string
          user_intent: string | null
          user_priority: string | null
          workspace_id: string
        }
        Insert: {
          ai_classification_at?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_sentiment?: string | null
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
          unread_count?: number
          updated_at?: string
          user_intent?: string | null
          user_priority?: string | null
          workspace_id: string
        }
        Update: {
          ai_classification_at?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_sentiment?: string | null
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
          unread_count?: number
          updated_at?: string
          user_intent?: string | null
          user_priority?: string | null
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
          created_at: string
          entity_type: string
          field_type: string
          id: string
          is_unique: boolean
          name: string
          options: Json | null
          position: number
          required: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          field_type: string
          id?: string
          is_unique?: boolean
          name: string
          options?: Json | null
          position?: number
          required?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_type?: string
          id?: string
          is_unique?: boolean
          name?: string
          options?: Json | null
          position?: number
          required?: boolean
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
          external_email: string | null
          external_instagram_id: string | null
          external_username: string | null
          external_whatsapp_id: string | null
          id: string
          last_contact_at: string | null
          name: string
          phone: string | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
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
      opportunities: {
        Row: {
          created_at: string
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          notes: string | null
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
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
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
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
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
          ai_insights_used: number | null
          ai_suggestions_used: number | null
          automations_executed: number | null
          created_at: string
          id: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_insights_used?: number | null
          ai_suggestions_used?: number | null
          automations_executed?: number | null
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_insights_used?: number | null
          ai_suggestions_used?: number | null
          automations_executed?: number | null
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
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
      check_custom_field_unique_value: {
        Args: { p_custom_field_id: string; p_entity_id: string; p_value: Json }
        Returns: boolean
      }
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: Json
      }
      get_plan_limits: {
        Args: { p_plan: Database["public"]["Enums"]["subscription_plan"] }
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
      condition_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "greater_than"
        | "less_than"
        | "is_empty"
        | "is_not_empty"
      crm_entity_type: "contacts" | "opportunities"
      crm_view_mode: "table" | "board"
      execution_status: "pending" | "running" | "completed" | "failed"
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
      crm_entity_type: ["contacts", "opportunities"],
      crm_view_mode: ["table", "board"],
      execution_status: ["pending", "running", "completed", "failed"],
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
      workspace_role: ["owner", "admin", "agent", "viewer"],
      workspace_status: ["active", "suspended", "inactive", "pending"],
    },
  },
} as const
