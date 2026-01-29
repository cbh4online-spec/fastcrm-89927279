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
      activity_profile_analytics: {
        Row: {
          activity_profile_id: string
          id: string
          metric_data: Json | null
          metric_type: string
          recorded_at: string
          workspace_id: string
        }
        Insert: {
          activity_profile_id: string
          id?: string
          metric_data?: Json | null
          metric_type: string
          recorded_at?: string
          workspace_id: string
        }
        Update: {
          activity_profile_id?: string
          id?: string
          metric_data?: Json | null
          metric_type?: string
          recorded_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_profile_analytics_activity_profile_id_fkey"
            columns: ["activity_profile_id"]
            isOneToOne: false
            referencedRelation: "activity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_profile_analytics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_profiles: {
        Row: {
          active_modules: Json | null
          ai_context: Json | null
          ai_suggestions_enabled: boolean | null
          automation_triggers: Json | null
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          custom_fields_config: Json | null
          description: string | null
          hidden_fields: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          kpi_config: Json | null
          module_settings: Json | null
          name: string
          profile_type: Database["public"]["Enums"]["activity_profile_type"]
          updated_at: string
          visible_fields: Json | null
          workspace_id: string
        }
        Insert: {
          active_modules?: Json | null
          ai_context?: Json | null
          ai_suggestions_enabled?: boolean | null
          automation_triggers?: Json | null
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields_config?: Json | null
          description?: string | null
          hidden_fields?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          kpi_config?: Json | null
          module_settings?: Json | null
          name: string
          profile_type?: Database["public"]["Enums"]["activity_profile_type"]
          updated_at?: string
          visible_fields?: Json | null
          workspace_id: string
        }
        Update: {
          active_modules?: Json | null
          ai_context?: Json | null
          ai_suggestions_enabled?: boolean | null
          automation_triggers?: Json | null
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields_config?: Json | null
          description?: string | null
          hidden_fields?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          kpi_config?: Json | null
          module_settings?: Json | null
          name?: string
          profile_type?: Database["public"]["Enums"]["activity_profile_type"]
          updated_at?: string
          visible_fields?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_agent_executions: {
        Row: {
          agent_type: string
          confidence_level: string | null
          created_at: string | null
          duration_ms: number | null
          entity_id: string
          entity_type: string
          error_message: string | null
          executive_summary: string
          id: string
          input_summary: Json
          key_signals: string[] | null
          output: Json
          reasoning_trace: Json
          recommended_action: string | null
          recommended_action_type: string | null
          risk_indicators: string[] | null
          status_assessment: string | null
          tokens_used: number | null
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          agent_type: string
          confidence_level?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          executive_summary: string
          id?: string
          input_summary?: Json
          key_signals?: string[] | null
          output?: Json
          reasoning_trace?: Json
          recommended_action?: string | null
          recommended_action_type?: string | null
          risk_indicators?: string[] | null
          status_assessment?: string | null
          tokens_used?: number | null
          trigger_type: string
          workspace_id: string
        }
        Update: {
          agent_type?: string
          confidence_level?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          executive_summary?: string
          id?: string
          input_summary?: Json
          key_signals?: string[] | null
          output?: Json
          reasoning_trace?: Json
          recommended_action?: string | null
          recommended_action_type?: string | null
          risk_indicators?: string[] | null
          status_assessment?: string | null
          tokens_used?: number | null
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_feedback: {
        Row: {
          created_at: string | null
          created_by: string | null
          execution_id: string | null
          feedback_notes: string | null
          feedback_type: string
          id: string
          outcome: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          execution_id?: string | null
          feedback_notes?: string | null
          feedback_type: string
          id?: string
          outcome?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          execution_id?: string | null
          feedback_notes?: string | null
          feedback_type?: string
          id?: string
          outcome?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_feedback_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_jobs: {
        Row: {
          agent_type: string
          attempts: number | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          execution_id: string | null
          id: string
          max_attempts: number | null
          priority: number | null
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          trigger_type: Database["public"]["Enums"]["agent_trigger"]
          workspace_id: string
        }
        Insert: {
          agent_type: string
          attempts?: number | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          trigger_type: Database["public"]["Enums"]["agent_trigger"]
          workspace_id: string
        }
        Update: {
          agent_type?: string
          attempts?: number | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          trigger_type?: Database["public"]["Enums"]["agent_trigger"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_jobs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_locks: {
        Row: {
          agent_type: string
          entity_id: string
          expires_at: string
          id: string
          job_id: string | null
          locked_at: string | null
          locked_by: string | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          entity_id: string
          expires_at: string
          id?: string
          job_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          entity_id?: string
          expires_at?: string
          id?: string
          job_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_locks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_memory: {
        Row: {
          access_count: number | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          is_validated: boolean | null
          last_accessed_at: string | null
          memory_category: string | null
          memory_type: string
          relevance_score: number | null
          source_execution_id: string | null
          source_type: string | null
          superseded_by: string | null
          validated_at: string | null
          validated_by: string | null
          version: number | null
          workspace_id: string
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          is_validated?: boolean | null
          last_accessed_at?: string | null
          memory_category?: string | null
          memory_type: string
          relevance_score?: number | null
          source_execution_id?: string | null
          source_type?: string | null
          superseded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version?: number | null
          workspace_id: string
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          is_validated?: boolean | null
          last_accessed_at?: string | null
          memory_category?: string | null
          memory_type?: string
          relevance_score?: number | null
          source_execution_id?: string | null
          source_type?: string | null
          superseded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_memory_source_execution_id_fkey"
            columns: ["source_execution_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_memory_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "ai_agent_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_registry: {
        Row: {
          agent_type: string
          cooldown_ms: number | null
          created_at: string | null
          description: string | null
          display_name: string
          enabled_triggers: Database["public"]["Enums"]["agent_trigger"][]
          entity_types: string[]
          id: string
          is_enabled: boolean | null
          max_executions_per_hour_entity: number | null
          max_executions_per_hour_workspace: number | null
          max_reasoning_iterations: number | null
          max_tool_calls: number | null
          priority: number | null
          timeout_ms: number | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          cooldown_ms?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          enabled_triggers: Database["public"]["Enums"]["agent_trigger"][]
          entity_types: string[]
          id?: string
          is_enabled?: boolean | null
          max_executions_per_hour_entity?: number | null
          max_executions_per_hour_workspace?: number | null
          max_reasoning_iterations?: number | null
          max_tool_calls?: number | null
          priority?: number | null
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          cooldown_ms?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          enabled_triggers?: Database["public"]["Enums"]["agent_trigger"][]
          entity_types?: string[]
          id?: string
          is_enabled?: boolean | null
          max_executions_per_hour_entity?: number | null
          max_executions_per_hour_workspace?: number | null
          max_reasoning_iterations?: number | null
          max_tool_calls?: number | null
          priority?: number | null
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_agent_response_cache: {
        Row: {
          agent_type: string
          cache_key: string
          confidence_level: string | null
          context_hash: string | null
          created_at: string | null
          entity_id: string
          entity_state_hash: string
          entity_type: string
          executive_summary: string | null
          expires_at: string
          hit_count: number | null
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          last_used_at: string | null
          memory_version: string | null
          original_duration_ms: number | null
          prompt_version: string
          response: Json
          tokens_saved: number | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          cache_key: string
          confidence_level?: string | null
          context_hash?: string | null
          created_at?: string | null
          entity_id: string
          entity_state_hash: string
          entity_type: string
          executive_summary?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          last_used_at?: string | null
          memory_version?: string | null
          original_duration_ms?: number | null
          prompt_version?: string
          response: Json
          tokens_saved?: number | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          cache_key?: string
          confidence_level?: string | null
          context_hash?: string | null
          created_at?: string | null
          entity_id?: string
          entity_state_hash?: string
          entity_type?: string
          executive_summary?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          last_used_at?: string | null
          memory_version?: string | null
          original_duration_ms?: number | null
          prompt_version?: string
          response?: Json
          tokens_saved?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_response_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_schedules: {
        Row: {
          agent_type: string
          created_at: string | null
          created_by: string | null
          cron_expression: string
          description: string | null
          entity_filter: Json | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          max_entities_per_run: number | null
          name: string
          next_run_at: string | null
          priority: number | null
          timezone: string | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          created_by?: string | null
          cron_expression: string
          description?: string | null
          entity_filter?: Json | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          max_entities_per_run?: number | null
          name: string
          next_run_at?: string | null
          priority?: number | null
          timezone?: string | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string
          description?: string | null
          entity_filter?: Json | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          max_entities_per_run?: number | null
          name?: string
          next_run_at?: string | null
          priority?: number | null
          timezone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_strategic_memory: {
        Row: {
          conditions: Json | null
          confidence_score: number | null
          contraindicated_actions: string[] | null
          created_at: string | null
          embedding: string | null
          entity_types: string[]
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_occurrence_at: string | null
          occurrence_count: number | null
          pattern_description: string
          pattern_type: string
          recommended_actions: string[] | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          conditions?: Json | null
          confidence_score?: number | null
          contraindicated_actions?: string[] | null
          created_at?: string | null
          embedding?: string | null
          entity_types?: string[]
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_occurrence_at?: string | null
          occurrence_count?: number | null
          pattern_description: string
          pattern_type: string
          recommended_actions?: string[] | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          conditions?: Json | null
          confidence_score?: number | null
          contraindicated_actions?: string[] | null
          created_at?: string | null
          embedding?: string | null
          entity_types?: string[]
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_occurrence_at?: string | null
          occurrence_count?: number | null
          pattern_description?: string
          pattern_type?: string
          recommended_actions?: string[] | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_strategic_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analytics_daily_aggregates: {
        Row: {
          actions_executed: number | null
          agent_type: string
          avg_confidence_score: number | null
          avg_latency_ms: number | null
          avg_time_to_action_seconds: number | null
          cache_hit_rate: number | null
          created_at: string
          date: string
          failures_count: number | null
          id: string
          outcomes_negative: number | null
          outcomes_positive: number | null
          rag_usage_rate: number | null
          recommendations_accepted: number | null
          recommendations_dismissed: number | null
          recommendations_generated: number | null
          recommendations_viewed: number | null
          timeout_count: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions_executed?: number | null
          agent_type: string
          avg_confidence_score?: number | null
          avg_latency_ms?: number | null
          avg_time_to_action_seconds?: number | null
          cache_hit_rate?: number | null
          created_at?: string
          date: string
          failures_count?: number | null
          id?: string
          outcomes_negative?: number | null
          outcomes_positive?: number | null
          rag_usage_rate?: number | null
          recommendations_accepted?: number | null
          recommendations_dismissed?: number | null
          recommendations_generated?: number | null
          recommendations_viewed?: number | null
          timeout_count?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions_executed?: number | null
          agent_type?: string
          avg_confidence_score?: number | null
          avg_latency_ms?: number | null
          avg_time_to_action_seconds?: number | null
          cache_hit_rate?: number | null
          created_at?: string
          date?: string
          failures_count?: number | null
          id?: string
          outcomes_negative?: number | null
          outcomes_positive?: number | null
          rag_usage_rate?: number | null
          recommendations_accepted?: number | null
          recommendations_dismissed?: number | null
          recommendations_generated?: number | null
          recommendations_viewed?: number | null
          timeout_count?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analytics_daily_aggregates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analytics_events: {
        Row: {
          action_type: string | null
          agent_type: string | null
          automation_id: string | null
          avg_relevance_score: number | null
          chunks_used: number | null
          confidence: Database["public"]["Enums"]["analytics_confidence"] | null
          created_at: string
          dismiss_reason: string | null
          entity_id: string | null
          entity_type: string | null
          error_reason: string | null
          error_type: string | null
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          execution_channel: string | null
          id: string
          latency_ms: number | null
          model_version: string | null
          new_stage: string | null
          outcome_type: string | null
          priority: Database["public"]["Enums"]["analytics_priority"] | null
          prompt_version: string | null
          properties: Json | null
          rating: number | null
          recommendation_id: string | null
          recommendation_type: string | null
          rerank_used: boolean | null
          retrieval_candidates: number | null
          surface: string | null
          time_since_action_hours: number | null
          time_to_action_seconds: number | null
          timeout: boolean | null
          used_cache: boolean | null
          used_rag: boolean | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_type?: string | null
          agent_type?: string | null
          automation_id?: string | null
          avg_relevance_score?: number | null
          chunks_used?: number | null
          confidence?:
            | Database["public"]["Enums"]["analytics_confidence"]
            | null
          created_at?: string
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_reason?: string | null
          error_type?: string | null
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          execution_channel?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          new_stage?: string | null
          outcome_type?: string | null
          priority?: Database["public"]["Enums"]["analytics_priority"] | null
          prompt_version?: string | null
          properties?: Json | null
          rating?: number | null
          recommendation_id?: string | null
          recommendation_type?: string | null
          rerank_used?: boolean | null
          retrieval_candidates?: number | null
          surface?: string | null
          time_since_action_hours?: number | null
          time_to_action_seconds?: number | null
          timeout?: boolean | null
          used_cache?: boolean | null
          used_rag?: boolean | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action_type?: string | null
          agent_type?: string | null
          automation_id?: string | null
          avg_relevance_score?: number | null
          chunks_used?: number | null
          confidence?:
            | Database["public"]["Enums"]["analytics_confidence"]
            | null
          created_at?: string
          dismiss_reason?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_reason?: string | null
          error_type?: string | null
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          execution_channel?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          new_stage?: string | null
          outcome_type?: string | null
          priority?: Database["public"]["Enums"]["analytics_priority"] | null
          prompt_version?: string | null
          properties?: Json | null
          rating?: number | null
          recommendation_id?: string | null
          recommendation_type?: string | null
          rerank_used?: boolean | null
          retrieval_candidates?: number | null
          surface?: string | null
          time_since_action_hours?: number | null
          time_to_action_seconds?: number | null
          timeout?: boolean | null
          used_cache?: boolean | null
          used_rag?: boolean | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache_metrics: {
        Row: {
          agent_type: string
          avg_hit_latency_ms: number | null
          avg_miss_latency_ms: number | null
          cache_hits: number | null
          cache_misses: number | null
          created_at: string | null
          id: string
          invalidations: number | null
          period_end: string
          period_start: string
          tokens_saved: number | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          avg_hit_latency_ms?: number | null
          avg_miss_latency_ms?: number | null
          cache_hits?: number | null
          cache_misses?: number | null
          created_at?: string | null
          id?: string
          invalidations?: number | null
          period_end: string
          period_start: string
          tokens_saved?: number | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          avg_hit_latency_ms?: number | null
          avg_miss_latency_ms?: number | null
          cache_hits?: number | null
          cache_misses?: number | null
          created_at?: string | null
          id?: string
          invalidations?: number | null
          period_end?: string
          period_start?: string
          tokens_saved?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      ai_memory_access_log: {
        Row: {
          access_type: string
          created_at: string | null
          execution_id: string | null
          id: string
          memory_id: string
          relevance_score_at_retrieval: number | null
          workspace_id: string
        }
        Insert: {
          access_type: string
          created_at?: string | null
          execution_id?: string | null
          id?: string
          memory_id: string
          relevance_score_at_retrieval?: number | null
          workspace_id: string
        }
        Update: {
          access_type?: string
          created_at?: string | null
          execution_id?: string | null
          id?: string
          memory_id?: string
          relevance_score_at_retrieval?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_access_log_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_access_log_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_access_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personas: {
        Row: {
          allowed_channels: string[] | null
          created_at: string
          created_by: string
          decision_framework: Json | null
          description: string | null
          escalation_rules: Json | null
          id: string
          is_active: boolean | null
          knowledge_base_ids: string[] | null
          language_code: string | null
          language_style: string | null
          limitations: string[] | null
          max_questions_per_turn: number | null
          name: string
          persona_type: string
          primary_goal: string | null
          response_style: string | null
          secondary_goal: string | null
          stop_conditions: Json | null
          system_prompt: string | null
          technical_depth: string
          tone_of_voice: string
          updated_at: string
          use_emojis: boolean | null
          vibe_profile_id: string | null
          workspace_id: string
        }
        Insert: {
          allowed_channels?: string[] | null
          created_at?: string
          created_by: string
          decision_framework?: Json | null
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          language_code?: string | null
          language_style?: string | null
          limitations?: string[] | null
          max_questions_per_turn?: number | null
          name: string
          persona_type: string
          primary_goal?: string | null
          response_style?: string | null
          secondary_goal?: string | null
          stop_conditions?: Json | null
          system_prompt?: string | null
          technical_depth?: string
          tone_of_voice?: string
          updated_at?: string
          use_emojis?: boolean | null
          vibe_profile_id?: string | null
          workspace_id: string
        }
        Update: {
          allowed_channels?: string[] | null
          created_at?: string
          created_by?: string
          decision_framework?: Json | null
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          language_code?: string | null
          language_style?: string | null
          limitations?: string[] | null
          max_questions_per_turn?: number | null
          name?: string
          persona_type?: string
          primary_goal?: string | null
          response_style?: string | null
          secondary_goal?: string | null
          stop_conditions?: Json | null
          system_prompt?: string | null
          technical_depth?: string
          tone_of_voice?: string
          updated_at?: string
          use_emojis?: boolean | null
          vibe_profile_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_personas_vibe_profile_id_fkey"
            columns: ["vibe_profile_id"]
            isOneToOne: false
            referencedRelation: "vibe_profiles"
            referencedColumns: ["id"]
          },
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
      autopilot_config: {
        Row: {
          accept_files: boolean
          accept_images: boolean
          accept_voice: boolean
          auto_reactivate: boolean
          channel: string | null
          config_scope: string
          cooldown_after_limit: number | null
          created_at: string
          created_by: string | null
          id: string
          image_analysis_enabled: boolean | null
          is_active: boolean
          max_consecutive_bot_messages: number | null
          max_messages_per_conversation: number
          max_messages_per_hour: number | null
          out_of_hours_message: string | null
          persona_id: string | null
          reactivation_hours: number | null
          reactivation_message: string | null
          require_human_after_escalation: boolean | null
          respect_working_hours: boolean | null
          response_delay_max: number
          response_delay_min: number
          sleep_on_human_reply: boolean
          timezone: string | null
          typing_indicator: boolean
          updated_at: string
          voice_transcription_enabled: boolean | null
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
          workspace_id: string
        }
        Insert: {
          accept_files?: boolean
          accept_images?: boolean
          accept_voice?: boolean
          auto_reactivate?: boolean
          channel?: string | null
          config_scope?: string
          cooldown_after_limit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_analysis_enabled?: boolean | null
          is_active?: boolean
          max_consecutive_bot_messages?: number | null
          max_messages_per_conversation?: number
          max_messages_per_hour?: number | null
          out_of_hours_message?: string | null
          persona_id?: string | null
          reactivation_hours?: number | null
          reactivation_message?: string | null
          require_human_after_escalation?: boolean | null
          respect_working_hours?: boolean | null
          response_delay_max?: number
          response_delay_min?: number
          sleep_on_human_reply?: boolean
          timezone?: string | null
          typing_indicator?: boolean
          updated_at?: string
          voice_transcription_enabled?: boolean | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
          workspace_id: string
        }
        Update: {
          accept_files?: boolean
          accept_images?: boolean
          accept_voice?: boolean
          auto_reactivate?: boolean
          channel?: string | null
          config_scope?: string
          cooldown_after_limit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_analysis_enabled?: boolean | null
          is_active?: boolean
          max_consecutive_bot_messages?: number | null
          max_messages_per_conversation?: number
          max_messages_per_hour?: number | null
          out_of_hours_message?: string | null
          persona_id?: string | null
          reactivation_hours?: number | null
          reactivation_message?: string | null
          require_human_after_escalation?: boolean | null
          respect_working_hours?: boolean | null
          response_delay_max?: number
          response_delay_min?: number
          sleep_on_human_reply?: boolean
          timezone?: string | null
          typing_indicator?: boolean
          updated_at?: string
          voice_transcription_enabled?: boolean | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_config_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_events: {
        Row: {
          conversation_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          triggered_by: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          triggered_by?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          triggered_by?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_events_workspace_id_fkey"
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
      bank_partners: {
        Row: {
          avg_approval_rate: number | null
          avg_processing_days: number | null
          commission_rates: Json | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          credit_types: string[] | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          notes: string | null
          terms: Json | null
          total_funded: number | null
          total_proposals_submitted: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avg_approval_rate?: number | null
          avg_processing_days?: number | null
          commission_rates?: Json | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_types?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          notes?: string | null
          terms?: Json | null
          total_funded?: number | null
          total_proposals_submitted?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avg_approval_rate?: number | null
          avg_processing_days?: number | null
          commission_rates?: Json | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_types?: string[] | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          terms?: Json | null
          total_funded?: number | null
          total_proposals_submitted?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_partners_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      billing_types: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          is_system: boolean | null
          label: string
          position: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          is_system?: boolean | null
          label: string
          position?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          is_system?: boolean | null
          label?: string
          position?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_types_workspace_id_fkey"
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
      channel_defaults: {
        Row: {
          channel: string
          created_at: string
          default_buttons: boolean | null
          default_emojis: boolean | null
          default_ideal_length: number
          default_images: boolean | null
          default_markdown: boolean | null
          default_max_length: number
          default_quick_replies: boolean | null
          description: string | null
          display_name: string
          hard_limit_length: number | null
          icon: string | null
          id: string
          requires_opt_in: boolean | null
          supports_rich_text: boolean | null
        }
        Insert: {
          channel: string
          created_at?: string
          default_buttons?: boolean | null
          default_emojis?: boolean | null
          default_ideal_length: number
          default_images?: boolean | null
          default_markdown?: boolean | null
          default_max_length: number
          default_quick_replies?: boolean | null
          description?: string | null
          display_name: string
          hard_limit_length?: number | null
          icon?: string | null
          id?: string
          requires_opt_in?: boolean | null
          supports_rich_text?: boolean | null
        }
        Update: {
          channel?: string
          created_at?: string
          default_buttons?: boolean | null
          default_emojis?: boolean | null
          default_ideal_length?: number
          default_images?: boolean | null
          default_markdown?: boolean | null
          default_max_length?: number
          default_quick_replies?: boolean | null
          description?: string | null
          display_name?: string
          hard_limit_length?: number | null
          icon?: string | null
          id?: string
          requires_opt_in?: boolean | null
          supports_rich_text?: boolean | null
        }
        Relationships: []
      }
      channel_format_config: {
        Row: {
          channel: string
          created_at: string
          enable_message_splitting: boolean | null
          greeting_style: string | null
          id: string
          ideal_response_length: number | null
          is_active: boolean
          link_preview: boolean | null
          max_line_breaks: number | null
          max_messages_per_response: number | null
          max_response_length: number
          max_typing_duration_ms: number | null
          show_typing_indicator: boolean | null
          signature_enabled: boolean | null
          signature_text: string | null
          split_delay_ms: number | null
          supports_buttons: boolean | null
          supports_cards: boolean | null
          supports_images: boolean | null
          supports_links: boolean | null
          supports_quick_replies: boolean | null
          truncation_strategy: string | null
          typing_duration_per_char_ms: number | null
          updated_at: string
          use_emojis: boolean | null
          use_line_breaks: boolean | null
          use_markdown: boolean | null
          workspace_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          enable_message_splitting?: boolean | null
          greeting_style?: string | null
          id?: string
          ideal_response_length?: number | null
          is_active?: boolean
          link_preview?: boolean | null
          max_line_breaks?: number | null
          max_messages_per_response?: number | null
          max_response_length?: number
          max_typing_duration_ms?: number | null
          show_typing_indicator?: boolean | null
          signature_enabled?: boolean | null
          signature_text?: string | null
          split_delay_ms?: number | null
          supports_buttons?: boolean | null
          supports_cards?: boolean | null
          supports_images?: boolean | null
          supports_links?: boolean | null
          supports_quick_replies?: boolean | null
          truncation_strategy?: string | null
          typing_duration_per_char_ms?: number | null
          updated_at?: string
          use_emojis?: boolean | null
          use_line_breaks?: boolean | null
          use_markdown?: boolean | null
          workspace_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          enable_message_splitting?: boolean | null
          greeting_style?: string | null
          id?: string
          ideal_response_length?: number | null
          is_active?: boolean
          link_preview?: boolean | null
          max_line_breaks?: number | null
          max_messages_per_response?: number | null
          max_response_length?: number
          max_typing_duration_ms?: number | null
          show_typing_indicator?: boolean | null
          signature_enabled?: boolean | null
          signature_text?: string | null
          split_delay_ms?: number | null
          supports_buttons?: boolean | null
          supports_cards?: boolean | null
          supports_images?: boolean | null
          supports_links?: boolean | null
          supports_quick_replies?: boolean | null
          truncation_strategy?: string | null
          typing_duration_per_char_ms?: number | null
          updated_at?: string
          use_emojis?: boolean | null
          use_line_breaks?: boolean | null
          use_markdown?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_format_config_workspace_id_fkey"
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
      client_requirements: {
        Row: {
          category: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          priority: string | null
          requirements: Json
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          requirements?: Json
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          requirements?: Json
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requirements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requirements_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requirements_workspace_id_fkey"
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
          activity_profile_id: string | null
          activity_profile_override: Json | null
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
          avatar_url: string | null
          business_status: string | null
          cae_codes: string[] | null
          cae_description: string | null
          capital_social: string | null
          city: string | null
          company_context: Json | null
          company_score: number | null
          company_status: string | null
          conversion_probability: number | null
          county: string | null
          created_at: string
          created_by: string
          credit_active: boolean | null
          credit_limit: number | null
          email: string | null
          employee_count: number | null
          entity_type: string | null
          estimated_value: number | null
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          google_maps_url: string | null
          google_photo_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string
          industry: string | null
          instagram_url: string | null
          last_contact_at: string | null
          latitude: number | null
          legal_nature: string | null
          linkedin_url: string | null
          longitude: number | null
          name: string
          notes: string | null
          opening_hours: Json | null
          parish: string | null
          payment_conditions: string | null
          phone: string | null
          postal_code: string | null
          preferred_currency: string | null
          preferred_payment_method: string | null
          price_level: string | null
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
          activity_profile_id?: string | null
          activity_profile_override?: Json | null
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
          avatar_url?: string | null
          business_status?: string | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_context?: Json | null
          company_score?: number | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by: string
          credit_active?: boolean | null
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          opening_hours?: Json | null
          parish?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_payment_method?: string | null
          price_level?: string | null
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
          activity_profile_id?: string | null
          activity_profile_override?: Json | null
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
          avatar_url?: string | null
          business_status?: string | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_context?: Json | null
          company_score?: number | null
          company_status?: string | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by?: string
          credit_active?: boolean | null
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          entity_type?: string | null
          estimated_value?: number | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          google_maps_url?: string | null
          google_photo_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          opening_hours?: Json | null
          parish?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_currency?: string | null
          preferred_payment_method?: string | null
          price_level?: string | null
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
            foreignKeyName: "companies_activity_profile_id_fkey"
            columns: ["activity_profile_id"]
            isOneToOne: false
            referencedRelation: "activity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_enrichment_logs: {
        Row: {
          company_id: string
          created_at: string
          enriched_by: string
          fields_applied: Json
          fields_suggested: Json
          id: string
          source: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enriched_by: string
          fields_applied?: Json
          fields_suggested?: Json
          id?: string
          source?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enriched_by?: string
          fields_applied?: Json
          fields_suggested?: Json
          id?: string
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_enrichment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_enrichment_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_facebook_data: {
        Row: {
          about_text: string | null
          activity_level: string | null
          analysis_status: string | null
          analyzed_at: string | null
          analyzed_by: string | null
          company_id: string
          created_at: string | null
          error_message: string | null
          facebook_url: string | null
          followers_count: number | null
          id: string
          last_post_date: string | null
          likes_count: number | null
          page_category: string | null
          posts_per_month: number | null
          rating: number | null
          raw_data: Json | null
          reviews_count: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          about_text?: string | null
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          facebook_url?: string | null
          followers_count?: number | null
          id?: string
          last_post_date?: string | null
          likes_count?: number | null
          page_category?: string | null
          posts_per_month?: number | null
          rating?: number | null
          raw_data?: Json | null
          reviews_count?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          about_text?: string | null
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          facebook_url?: string | null
          followers_count?: number | null
          id?: string
          last_post_date?: string | null
          likes_count?: number | null
          page_category?: string | null
          posts_per_month?: number | null
          rating?: number | null
          raw_data?: Json | null
          reviews_count?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_facebook_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_facebook_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_instagram_data: {
        Row: {
          activity_level: string | null
          analysis_status: string | null
          analyzed_at: string | null
          analyzed_by: string | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          bio: string | null
          company_id: string
          content_type: string | null
          created_at: string | null
          engagement_rate: number | null
          error_message: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          instagram_url: string | null
          last_post_date: string | null
          posts_count: number | null
          posts_per_month: number | null
          raw_data: Json | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          bio?: string | null
          company_id: string
          content_type?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          error_message?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          instagram_url?: string | null
          last_post_date?: string | null
          posts_count?: number | null
          posts_per_month?: number | null
          raw_data?: Json | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          bio?: string | null
          company_id?: string
          content_type?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          error_message?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          instagram_url?: string | null
          last_post_date?: string | null
          posts_count?: number | null
          posts_per_month?: number | null
          raw_data?: Json | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_instagram_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_instagram_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_linkedin_data: {
        Row: {
          activity_level: string | null
          analysis_status: string | null
          analyzed_at: string
          analyzed_by: string | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          company_id: string
          company_size_range: string | null
          created_at: string
          data_suggestions: Json | null
          description: string | null
          employee_count_linkedin: number | null
          employees_on_linkedin: number | null
          engagement_score: number | null
          error_message: string | null
          followers_count: number | null
          founded_year: number | null
          headquarters: string | null
          id: string
          key_people: Json | null
          last_post_date: string | null
          linkedin_industry: string | null
          linkedin_type: string | null
          linkedin_url: string | null
          linkedin_website: string | null
          posting_frequency: string | null
          posts_per_month: number | null
          raw_data: Json | null
          recent_posts: Json | null
          specialties: string[] | null
          suggested_contacts: Json | null
          tagline: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_id: string
          company_size_range?: string | null
          created_at?: string
          data_suggestions?: Json | null
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          followers_count?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          posts_per_month?: number | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          suggested_contacts?: Json | null
          tagline?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_level?: string | null
          analysis_status?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_id?: string
          company_size_range?: string | null
          created_at?: string
          data_suggestions?: Json | null
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          followers_count?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          posts_per_month?: number | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          suggested_contacts?: Json | null
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_linkedin_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_linkedin_data_workspace_id_fkey"
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
      contact_linkedin_data: {
        Row: {
          analysis_status: string | null
          analyzed_at: string | null
          analyzed_by: string | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          company_size_range: string | null
          connections_count: number | null
          contact_id: string
          created_at: string
          description: string | null
          employee_count_linkedin: number | null
          employees_on_linkedin: number | null
          engagement_score: number | null
          error_message: string | null
          founded_year: number | null
          headline: string | null
          headquarters: string | null
          id: string
          key_people: Json | null
          last_post_date: string | null
          linkedin_industry: string | null
          linkedin_type: string | null
          linkedin_url: string | null
          linkedin_website: string | null
          posting_frequency: string | null
          raw_data: Json | null
          recent_posts: Json | null
          specialties: string[] | null
          tagline: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_size_range?: string | null
          connections_count?: number | null
          contact_id: string
          created_at?: string
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          founded_year?: number | null
          headline?: string | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_size_range?: string | null
          connections_count?: number | null
          contact_id?: string
          created_at?: string
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          founded_year?: number | null
          headline?: string | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_linkedin_data_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_linkedin_data_workspace_id_fkey"
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
          activity_profile_id: string | null
          activity_profile_override: Json | null
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
          avatar_url: string | null
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
          ghl_contact_id: string | null
          ghl_synced_at: string | null
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
          preferred_currency: string | null
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
          activity_profile_id?: string | null
          activity_profile_override?: Json | null
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
          avatar_url?: string | null
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
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
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
          preferred_currency?: string | null
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
          activity_profile_id?: string | null
          activity_profile_override?: Json | null
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
          avatar_url?: string | null
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
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
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
          preferred_currency?: string | null
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
            foreignKeyName: "contacts_activity_profile_id_fkey"
            columns: ["activity_profile_id"]
            isOneToOne: false
            referencedRelation: "activity_profiles"
            referencedColumns: ["id"]
          },
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
      conversation_autopilot_state: {
        Row: {
          bot_message_count: number | null
          consecutive_bot_messages: number | null
          conversation_id: string
          created_at: string
          id: string
          is_active: boolean
          last_bot_message_at: string | null
          last_human_message_at: string | null
          paused_by: string | null
          paused_reason: string | null
          scheduled_reactivation: string | null
          sleeping_since: string | null
          state: string
          total_message_count: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bot_message_count?: number | null
          consecutive_bot_messages?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_bot_message_at?: string | null
          last_human_message_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          scheduled_reactivation?: string | null
          sleeping_since?: string | null
          state?: string
          total_message_count?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bot_message_count?: number | null
          consecutive_bot_messages?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_bot_message_at?: string | null
          last_human_message_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          scheduled_reactivation?: string | null
          sleeping_since?: string | null
          state?: string
          total_message_count?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_autopilot_state_workspace_id_fkey"
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
      conversation_journey: {
        Row: {
          completed_at: string | null
          conversation_id: string
          created_at: string
          crm_lead_stage: string | null
          crm_synced: boolean | null
          crm_synced_at: string | null
          current_stage_code: string
          current_stage_id: string | null
          data_collected: Json | null
          engagement_score: number | null
          id: string
          intent_signals: string[] | null
          interest_level: string | null
          last_stage_change_at: string | null
          lead_id: string | null
          objectives_completed: string[] | null
          outcome: string | null
          outcome_reason: string | null
          started_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          crm_lead_stage?: string | null
          crm_synced?: boolean | null
          crm_synced_at?: string | null
          current_stage_code?: string
          current_stage_id?: string | null
          data_collected?: Json | null
          engagement_score?: number | null
          id?: string
          intent_signals?: string[] | null
          interest_level?: string | null
          last_stage_change_at?: string | null
          lead_id?: string | null
          objectives_completed?: string[] | null
          outcome?: string | null
          outcome_reason?: string | null
          started_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          crm_lead_stage?: string | null
          crm_synced?: boolean | null
          crm_synced_at?: string | null
          current_stage_code?: string
          current_stage_id?: string | null
          data_collected?: Json | null
          engagement_score?: number | null
          id?: string
          intent_signals?: string[] | null
          interest_level?: string | null
          last_stage_change_at?: string | null
          lead_id?: string | null
          objectives_completed?: string[] | null
          outcome?: string | null
          outcome_reason?: string | null
          started_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_journey_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_journey_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_objective_progress: {
        Row: {
          attempts: number | null
          collected_at: string | null
          collected_value: string | null
          conversation_id: string
          created_at: string
          crm_update_error: string | null
          crm_updated: boolean | null
          id: string
          last_attempt_at: string | null
          lead_id: string | null
          objective_id: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          collected_at?: string | null
          collected_value?: string | null
          conversation_id: string
          created_at?: string
          crm_update_error?: string | null
          crm_updated?: boolean | null
          id?: string
          last_attempt_at?: string | null
          lead_id?: string | null
          objective_id: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          collected_at?: string | null
          collected_value?: string | null
          conversation_id?: string
          created_at?: string
          crm_update_error?: string | null
          crm_updated?: boolean | null
          id?: string
          last_attempt_at?: string | null
          lead_id?: string | null
          objective_id?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_objective_progress_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "conversation_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_objective_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_objectives: {
        Row: {
          blocks_next_questions: boolean
          created_at: string
          created_by: string
          crm_entity: string
          crm_field_to_update: string
          crm_field_type: string | null
          flow_id: string | null
          id: string
          is_active: boolean
          is_required: boolean
          objective_code: string
          objective_description: string | null
          objective_name: string
          on_complete_action: string | null
          on_complete_message: string | null
          on_complete_update: Json | null
          persona_id: string | null
          prompt_template: string | null
          skip_if_filled: boolean
          sort_position: number
          trigger_condition: Json | null
          updated_at: string
          validation_rules: Json | null
          workspace_id: string
        }
        Insert: {
          blocks_next_questions?: boolean
          created_at?: string
          created_by: string
          crm_entity?: string
          crm_field_to_update: string
          crm_field_type?: string | null
          flow_id?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          objective_code: string
          objective_description?: string | null
          objective_name: string
          on_complete_action?: string | null
          on_complete_message?: string | null
          on_complete_update?: Json | null
          persona_id?: string | null
          prompt_template?: string | null
          skip_if_filled?: boolean
          sort_position?: number
          trigger_condition?: Json | null
          updated_at?: string
          validation_rules?: Json | null
          workspace_id: string
        }
        Update: {
          blocks_next_questions?: boolean
          created_at?: string
          created_by?: string
          crm_entity?: string
          crm_field_to_update?: string
          crm_field_type?: string | null
          flow_id?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          objective_code?: string
          objective_description?: string | null
          objective_name?: string
          on_complete_action?: string | null
          on_complete_message?: string | null
          on_complete_update?: Json | null
          persona_id?: string | null
          prompt_template?: string | null
          skip_if_filled?: boolean
          sort_position?: number
          trigger_condition?: Json | null
          updated_at?: string
          validation_rules?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_objectives_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_objectives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_rule_executions: {
        Row: {
          action_taken: string | null
          condition_matched: Json | null
          conversation_id: string
          created_at: string
          id: string
          message_id: string | null
          override_reason: string | null
          rule_id: string
          trigger_text: string | null
          was_successful: boolean | null
          workspace_id: string
        }
        Insert: {
          action_taken?: string | null
          condition_matched?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          override_reason?: string | null
          rule_id: string
          trigger_text?: string | null
          was_successful?: boolean | null
          workspace_id: string
        }
        Update: {
          action_taken?: string | null
          condition_matched?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          override_reason?: string | null
          rule_id?: string
          trigger_text?: string | null
          was_successful?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_rule_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "conversation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_rule_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_rules: {
        Row: {
          action_config: Json
          action_message: string | null
          action_type: string
          condition_description: string | null
          condition_type: string
          condition_value: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          rule_type: Database["public"]["Enums"]["conversation_rule_type"]
          scope: Database["public"]["Enums"]["conversation_rule_scope"]
          scope_entity_id: string | null
          tags: string[] | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          action_config?: Json
          action_message?: string | null
          action_type?: string
          condition_description?: string | null
          condition_type?: string
          condition_value?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          rule_type: Database["public"]["Enums"]["conversation_rule_type"]
          scope?: Database["public"]["Enums"]["conversation_rule_scope"]
          scope_entity_id?: string | null
          tags?: string[] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          action_config?: Json
          action_message?: string | null
          action_type?: string
          condition_description?: string | null
          condition_type?: string
          condition_value?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          rule_type?: Database["public"]["Enums"]["conversation_rule_type"]
          scope?: Database["public"]["Enums"]["conversation_rule_scope"]
          scope_entity_id?: string | null
          tags?: string[] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          abandonment_reason: string | null
          channel: string
          completed_at: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          current_step_id: string | null
          flow_id: string | null
          goal_achieved: boolean | null
          goal_achieved_at: string | null
          handed_off_at: string | null
          handed_off_to: string | null
          id: string
          lead_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          step_history: Json | null
          updated_at: string
          variables: Json | null
          workspace_id: string
        }
        Insert: {
          abandonment_reason?: string | null
          channel: string
          completed_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_step_id?: string | null
          flow_id?: string | null
          goal_achieved?: boolean | null
          goal_achieved_at?: string | null
          handed_off_at?: string | null
          handed_off_to?: string | null
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          step_history?: Json | null
          updated_at?: string
          variables?: Json | null
          workspace_id: string
        }
        Update: {
          abandonment_reason?: string | null
          channel?: string
          completed_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_step_id?: string | null
          flow_id?: string | null
          goal_achieved?: boolean | null
          goal_achieved_at?: string | null
          handed_off_at?: string | null
          handed_off_to?: string | null
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          step_history?: Json | null
          updated_at?: string
          variables?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversational_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversational_flows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          fallback_behavior: string | null
          goal_description: string | null
          goal_type: string | null
          id: string
          is_default: boolean | null
          knowledge_base_ids: string[] | null
          max_retries: number | null
          name: string
          persona_id: string | null
          priority: number | null
          status: Database["public"]["Enums"]["flow_status"]
          success_message: string | null
          timeout_minutes: number | null
          trigger_channels: string[] | null
          trigger_conditions: Json | null
          trigger_keywords: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          fallback_behavior?: string | null
          goal_description?: string | null
          goal_type?: string | null
          id?: string
          is_default?: boolean | null
          knowledge_base_ids?: string[] | null
          max_retries?: number | null
          name: string
          persona_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["flow_status"]
          success_message?: string | null
          timeout_minutes?: number | null
          trigger_channels?: string[] | null
          trigger_conditions?: Json | null
          trigger_keywords?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          fallback_behavior?: string | null
          goal_description?: string | null
          goal_type?: string | null
          id?: string
          is_default?: boolean | null
          knowledge_base_ids?: string[] | null
          max_retries?: number | null
          name?: string
          persona_id?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["flow_status"]
          success_message?: string | null
          timeout_minutes?: number | null
          trigger_channels?: string[] | null
          trigger_conditions?: Json | null
          trigger_keywords?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversational_flows_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversational_flows_workspace_id_fkey"
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
      credit_proposals: {
        Row: {
          ai_analyzed_at: string | null
          ai_approval_probability: number | null
          ai_optimization_tips: Json | null
          ai_recommended_banks: Json | null
          ai_risk_assessment: string | null
          ai_viability_score: number | null
          amount_requested: number
          approved_amount: number | null
          approved_monthly_payment: number | null
          approved_rate: number | null
          approved_taeg: number | null
          approved_term: number | null
          assigned_to: string | null
          bank_submissions: Json | null
          commission_amount: number | null
          commission_paid: boolean | null
          commission_paid_at: string | null
          created_at: string
          created_by: string
          credit_type: string
          current_stage_since: string | null
          documents_complete: boolean | null
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          ltv_ratio: number | null
          notes: string | null
          property_location: string | null
          property_value: number | null
          purpose: string | null
          reference_number: string
          required_documents: Json | null
          selected_bank_id: string | null
          status: string
          status_history: Json | null
          tags: string[] | null
          term_months: number
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_value: number | null
          vehicle_year: number | null
          workspace_id: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_approval_probability?: number | null
          ai_optimization_tips?: Json | null
          ai_recommended_banks?: Json | null
          ai_risk_assessment?: string | null
          ai_viability_score?: number | null
          amount_requested: number
          approved_amount?: number | null
          approved_monthly_payment?: number | null
          approved_rate?: number | null
          approved_taeg?: number | null
          approved_term?: number | null
          assigned_to?: string | null
          bank_submissions?: Json | null
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          created_at?: string
          created_by: string
          credit_type: string
          current_stage_since?: string | null
          documents_complete?: boolean | null
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          ltv_ratio?: number | null
          notes?: string | null
          property_location?: string | null
          property_value?: number | null
          purpose?: string | null
          reference_number: string
          required_documents?: Json | null
          selected_bank_id?: string | null
          status?: string
          status_history?: Json | null
          tags?: string[] | null
          term_months: number
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_value?: number | null
          vehicle_year?: number | null
          workspace_id: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_approval_probability?: number | null
          ai_optimization_tips?: Json | null
          ai_recommended_banks?: Json | null
          ai_risk_assessment?: string | null
          ai_viability_score?: number | null
          amount_requested?: number
          approved_amount?: number | null
          approved_monthly_payment?: number | null
          approved_rate?: number | null
          approved_taeg?: number | null
          approved_term?: number | null
          assigned_to?: string | null
          bank_submissions?: Json | null
          commission_amount?: number | null
          commission_paid?: boolean | null
          commission_paid_at?: string | null
          created_at?: string
          created_by?: string
          credit_type?: string
          current_stage_since?: string | null
          documents_complete?: boolean | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          ltv_ratio?: number | null
          notes?: string | null
          property_location?: string | null
          property_value?: number | null
          purpose?: string | null
          reference_number?: string
          required_documents?: Json | null
          selected_bank_id?: string | null
          status?: string
          status_history?: Json | null
          tags?: string[] | null
          term_months?: number
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_value?: number | null
          vehicle_year?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      daily_priorities: {
        Row: {
          ai_generated: boolean | null
          ai_reasoning: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          position: number
          priority_date: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          position?: number
          priority_date?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          position?: number
          priority_date?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_priorities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      entity_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_notes: {
        Row: {
          attachments: Json | null
          audio_duration_seconds: number | null
          audio_url: string | null
          content: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          is_pinned: boolean | null
          note_type: string
          transcription: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attachments?: Json | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_pinned?: boolean | null
          note_type?: string
          transcription?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attachments?: Json | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_pinned?: boolean | null
          note_type?: string
          transcription?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_profile_data: {
        Row: {
          activity_profile_id: string
          created_at: string
          entity_id: string
          entity_type: string
          field_values: Json | null
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_profile_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          field_values?: Json | null
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_profile_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_values?: Json | null
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_profile_data_activity_profile_id_fkey"
            columns: ["activity_profile_id"]
            isOneToOne: false
            referencedRelation: "activity_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profile_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      field_permissions: {
        Row: {
          created_at: string
          field_key: string
          id: string
          object_key: string
          permission_level: string
          role: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          field_key: string
          id?: string
          object_key: string
          permission_level?: string
          role: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          field_key?: string
          id?: string
          object_key?: string
          permission_level?: string
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_profiles: {
        Row: {
          annual_income: number
          assets: Json | null
          created_at: string
          credit_score: number | null
          debt_to_income_ratio: number | null
          disposable_income: number | null
          effort_rate: number | null
          entity_id: string
          entity_type: string
          existing_credits: Json | null
          id: string
          income_stability: string | null
          income_type: string | null
          monthly_expenses: number | null
          monthly_income: number
          notes: string | null
          score_calculated_at: string | null
          score_factors: Json | null
          total_assets_value: number | null
          total_monthly_installments: number | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          workspace_id: string
        }
        Insert: {
          annual_income?: number
          assets?: Json | null
          created_at?: string
          credit_score?: number | null
          debt_to_income_ratio?: number | null
          disposable_income?: number | null
          effort_rate?: number | null
          entity_id: string
          entity_type: string
          existing_credits?: Json | null
          id?: string
          income_stability?: string | null
          income_type?: string | null
          monthly_expenses?: number | null
          monthly_income?: number
          notes?: string | null
          score_calculated_at?: string | null
          score_factors?: Json | null
          total_assets_value?: number | null
          total_monthly_installments?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          workspace_id: string
        }
        Update: {
          annual_income?: number
          assets?: Json | null
          created_at?: string
          credit_score?: number | null
          debt_to_income_ratio?: number | null
          disposable_income?: number | null
          effort_rate?: number | null
          entity_id?: string
          entity_type?: string
          existing_credits?: Json | null
          id?: string
          income_stability?: string | null
          income_type?: string | null
          monthly_expenses?: number | null
          monthly_income?: number
          notes?: string | null
          score_calculated_at?: string | null
          score_factors?: Json | null
          total_assets_value?: number | null
          total_monthly_installments?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_analytics: {
        Row: {
          avg_duration_seconds: number | null
          avg_steps_completed: number | null
          created_at: string
          date: string
          flow_id: string
          goals_achieved: number | null
          id: string
          sessions_abandoned: number | null
          sessions_completed: number | null
          sessions_handed_off: number | null
          sessions_started: number | null
          step_metrics: Json | null
          total_conversion_value: number | null
          workspace_id: string
        }
        Insert: {
          avg_duration_seconds?: number | null
          avg_steps_completed?: number | null
          created_at?: string
          date: string
          flow_id: string
          goals_achieved?: number | null
          id?: string
          sessions_abandoned?: number | null
          sessions_completed?: number | null
          sessions_handed_off?: number | null
          sessions_started?: number | null
          step_metrics?: Json | null
          total_conversion_value?: number | null
          workspace_id: string
        }
        Update: {
          avg_duration_seconds?: number | null
          avg_steps_completed?: number | null
          created_at?: string
          date?: string
          flow_id?: string
          goals_achieved?: number | null
          id?: string
          sessions_abandoned?: number | null
          sessions_completed?: number | null
          sessions_handed_off?: number | null
          sessions_started?: number | null
          step_metrics?: Json | null
          total_conversion_value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_analytics_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversational_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_analytics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_steps: {
        Row: {
          action_config: Json | null
          action_type: string | null
          condition_false_step_id: string | null
          condition_field: string | null
          condition_operator:
            | Database["public"]["Enums"]["flow_condition_operator"]
            | null
          condition_true_step_id: string | null
          condition_value: string | null
          conversion_value: number | null
          created_at: string
          flow_id: string
          goal_name: string | null
          id: string
          is_entry_point: boolean | null
          message_content: string | null
          message_variants: string[] | null
          name: string
          next_step_id: string | null
          position: number | null
          position_x: number | null
          position_y: number | null
          quick_replies: string[] | null
          step_type: Database["public"]["Enums"]["flow_step_type"]
          updated_at: string
          variable_id: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type?: string | null
          condition_false_step_id?: string | null
          condition_field?: string | null
          condition_operator?:
            | Database["public"]["Enums"]["flow_condition_operator"]
            | null
          condition_true_step_id?: string | null
          condition_value?: string | null
          conversion_value?: number | null
          created_at?: string
          flow_id: string
          goal_name?: string | null
          id?: string
          is_entry_point?: boolean | null
          message_content?: string | null
          message_variants?: string[] | null
          name: string
          next_step_id?: string | null
          position?: number | null
          position_x?: number | null
          position_y?: number | null
          quick_replies?: string[] | null
          step_type: Database["public"]["Enums"]["flow_step_type"]
          updated_at?: string
          variable_id?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string | null
          condition_false_step_id?: string | null
          condition_field?: string | null
          condition_operator?:
            | Database["public"]["Enums"]["flow_condition_operator"]
            | null
          condition_true_step_id?: string | null
          condition_value?: string | null
          conversion_value?: number | null
          created_at?: string
          flow_id?: string
          goal_name?: string | null
          id?: string
          is_entry_point?: boolean | null
          message_content?: string | null
          message_variants?: string[] | null
          name?: string
          next_step_id?: string | null
          position?: number | null
          position_x?: number | null
          position_y?: number | null
          quick_replies?: string[] | null
          step_type?: Database["public"]["Enums"]["flow_step_type"]
          updated_at?: string
          variable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_false_step"
            columns: ["condition_false_step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_next_step"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_true_step"
            columns: ["condition_true_step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversational_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_steps_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "flow_variables"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_variables: {
        Row: {
          choices: string[] | null
          created_at: string
          default_value: string | null
          display_name: string
          flow_id: string
          id: string
          is_required: boolean | null
          map_to_field: string | null
          name: string
          position: number | null
          validation_message: string | null
          validation_pattern: string | null
          variable_type: string
        }
        Insert: {
          choices?: string[] | null
          created_at?: string
          default_value?: string | null
          display_name: string
          flow_id: string
          id?: string
          is_required?: boolean | null
          map_to_field?: string | null
          name: string
          position?: number | null
          validation_message?: string | null
          validation_pattern?: string | null
          variable_type?: string
        }
        Update: {
          choices?: string[] | null
          created_at?: string
          default_value?: string | null
          display_name?: string
          flow_id?: string
          id?: string
          is_required?: boolean | null
          map_to_field?: string | null
          name?: string
          position?: number | null
          validation_message?: string | null
          validation_pattern?: string | null
          variable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_variables_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "conversational_flows"
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
      gdpr_consents: {
        Row: {
          consent_analytics: boolean | null
          consent_given_at: string | null
          consent_marketing: boolean | null
          consent_necessary: boolean | null
          consent_updated_at: string | null
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          consent_analytics?: boolean | null
          consent_given_at?: string | null
          consent_marketing?: boolean | null
          consent_necessary?: boolean | null
          consent_updated_at?: string | null
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          consent_analytics?: boolean | null
          consent_given_at?: string | null
          consent_marketing?: boolean | null
          consent_necessary?: boolean | null
          consent_updated_at?: string | null
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      ghl_sync_log: {
        Row: {
          event_type: string
          fastcrm_entity_id: string
          fastcrm_entity_type: string
          ghl_entity_id: string
          ghl_entity_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          workspace_id: string
        }
        Insert: {
          event_type: string
          fastcrm_entity_id: string
          fastcrm_entity_type: string
          ghl_entity_id: string
          ghl_entity_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          workspace_id: string
        }
        Update: {
          event_type?: string
          fastcrm_entity_id?: string
          fastcrm_entity_type?: string
          ghl_entity_id?: string
          ghl_entity_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_sync_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_settings: {
        Row: {
          base_url: string | null
          clarity_project_id: string | null
          created_at: string | null
          default_language: string | null
          default_og_image: string | null
          enable_schema_markup: boolean | null
          ga4_measurement_id: string | null
          gdpr_banner_text: string | null
          gdpr_enabled: boolean | null
          gdpr_policy_url: string | null
          gtm_container_id: string | null
          id: string
          meta_pixel_id: string | null
          sitemap_auto_update: boolean | null
          social_share_hashtags: string[] | null
          supported_languages: string[] | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          base_url?: string | null
          clarity_project_id?: string | null
          created_at?: string | null
          default_language?: string | null
          default_og_image?: string | null
          enable_schema_markup?: boolean | null
          ga4_measurement_id?: string | null
          gdpr_banner_text?: string | null
          gdpr_enabled?: boolean | null
          gdpr_policy_url?: string | null
          gtm_container_id?: string | null
          id?: string
          meta_pixel_id?: string | null
          sitemap_auto_update?: boolean | null
          social_share_hashtags?: string[] | null
          supported_languages?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          base_url?: string | null
          clarity_project_id?: string | null
          created_at?: string | null
          default_language?: string | null
          default_og_image?: string | null
          enable_schema_markup?: boolean | null
          ga4_measurement_id?: string | null
          gdpr_banner_text?: string | null
          gdpr_enabled?: boolean | null
          gdpr_policy_url?: string | null
          gtm_container_id?: string | null
          id?: string
          meta_pixel_id?: string | null
          sitemap_auto_update?: boolean | null
          social_share_hashtags?: string[] | null
          supported_languages?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_ai_media_insights: {
        Row: {
          analyzed_at: string | null
          analyzed_by: string | null
          approach_suggestion: string | null
          content_type: string | null
          created_at: string
          has_cta: boolean | null
          id: string
          media_id: string
          tone: string | null
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          approach_suggestion?: string | null
          content_type?: string | null
          created_at?: string
          has_cta?: boolean | null
          id?: string
          media_id: string
          tone?: string | null
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          approach_suggestion?: string | null
          content_type?: string | null
          created_at?: string
          has_cta?: boolean | null
          id?: string
          media_id?: string
          tone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_ai_media_insights_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "ig_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_ai_media_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_ai_profile_insights: {
        Row: {
          analyzed_at: string | null
          analyzed_by: string | null
          avg_engagement: number | null
          category_guess: string | null
          city_guess: string | null
          confidence: number | null
          contact_signals: string[] | null
          created_at: string
          id: string
          is_individual: boolean | null
          last_post_days_ago: number | null
          lead_score: number | null
          lead_score_breakdown: Json | null
          posting_frequency: string | null
          profile_id: string
          reasons: string[] | null
          red_flags: string[] | null
          specialty_guess: string | null
          works_at: string | null
          workspace_id: string
        }
        Insert: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_engagement?: number | null
          category_guess?: string | null
          city_guess?: string | null
          confidence?: number | null
          contact_signals?: string[] | null
          created_at?: string
          id?: string
          is_individual?: boolean | null
          last_post_days_ago?: number | null
          lead_score?: number | null
          lead_score_breakdown?: Json | null
          posting_frequency?: string | null
          profile_id: string
          reasons?: string[] | null
          red_flags?: string[] | null
          specialty_guess?: string | null
          works_at?: string | null
          workspace_id: string
        }
        Update: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_engagement?: number | null
          category_guess?: string | null
          city_guess?: string | null
          confidence?: number | null
          contact_signals?: string[] | null
          created_at?: string
          id?: string
          is_individual?: boolean | null
          last_post_days_ago?: number | null
          lead_score?: number | null
          lead_score_breakdown?: Json | null
          posting_frequency?: string | null
          profile_id?: string
          reasons?: string[] | null
          red_flags?: string[] | null
          specialty_guess?: string | null
          works_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_ai_profile_insights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ig_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_ai_profile_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_collection_items: {
        Row: {
          added_by: string
          collection_id: string
          created_at: string
          id: string
          item_type: string
          media_id: string | null
          notes: string | null
          profile_id: string | null
          tags: string[] | null
        }
        Insert: {
          added_by: string
          collection_id: string
          created_at?: string
          id?: string
          item_type: string
          media_id?: string | null
          notes?: string | null
          profile_id?: string | null
          tags?: string[] | null
        }
        Update: {
          added_by?: string
          collection_id?: string
          created_at?: string
          id?: string
          item_type?: string
          media_id?: string | null
          notes?: string | null
          profile_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "ig_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_collection_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "ig_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_collection_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ig_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_collections: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          items_count: number | null
          name: string
          tags: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          items_count?: number | null
          name: string
          tags?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          items_count?: number | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_generated_leads: {
        Row: {
          created_at: string
          created_by: string
          crm_lead_id: string | null
          id: string
          insight_id: string | null
          profile_id: string | null
          status: string | null
          sync_data: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          crm_lead_id?: string | null
          id?: string
          insight_id?: string | null
          profile_id?: string | null
          status?: string | null
          sync_data?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          crm_lead_id?: string | null
          id?: string
          insight_id?: string | null
          profile_id?: string | null
          status?: string | null
          sync_data?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_generated_leads_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_generated_leads_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "ig_ai_profile_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_generated_leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ig_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_generated_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_looter_config: {
        Row: {
          created_at: string
          daily_action_limit: number | null
          enabled_features: Json | null
          id: string
          rapidapi_key_configured: boolean | null
          rate_limit_seconds: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          daily_action_limit?: number | null
          enabled_features?: Json | null
          id?: string
          rapidapi_key_configured?: boolean | null
          rate_limit_seconds?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          daily_action_limit?: number | null
          enabled_features?: Json | null
          id?: string
          rapidapi_key_configured?: boolean | null
          rate_limit_seconds?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_looter_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_looter_usage: {
        Row: {
          actions_count: number | null
          ai_analyses_count: number | null
          created_at: string
          id: string
          profiles_viewed: number | null
          searches_count: number | null
          updated_at: string
          usage_date: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          actions_count?: number | null
          ai_analyses_count?: number | null
          created_at?: string
          id?: string
          profiles_viewed?: number | null
          searches_count?: number | null
          updated_at?: string
          usage_date?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          actions_count?: number | null
          ai_analyses_count?: number | null
          created_at?: string
          id?: string
          profiles_viewed?: number | null
          searches_count?: number | null
          updated_at?: string
          usage_date?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_looter_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_media: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          hashtags: string[] | null
          id: string
          instagram_media_id: string | null
          likes_count: number | null
          location_id: string | null
          location_name: string | null
          media_type: string | null
          permalink: string | null
          posted_at: string | null
          profile_id: string | null
          raw_data: Json | null
          thumbnail_url: string | null
          workspace_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          instagram_media_id?: string | null
          likes_count?: number | null
          location_id?: string | null
          location_name?: string | null
          media_type?: string | null
          permalink?: string | null
          posted_at?: string | null
          profile_id?: string | null
          raw_data?: Json | null
          thumbnail_url?: string | null
          workspace_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          instagram_media_id?: string | null
          likes_count?: number | null
          location_id?: string | null
          location_name?: string | null
          media_type?: string | null
          permalink?: string | null
          posted_at?: string | null
          profile_id?: string | null
          raw_data?: Json | null
          thumbnail_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ig_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_profiles: {
        Row: {
          biography: string | null
          category: string | null
          city_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          external_url: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          instagram_id: string | null
          is_business: boolean | null
          is_verified: boolean | null
          last_fetched_at: string | null
          media_count: number | null
          profile_pic_url: string | null
          raw_data: Json | null
          updated_at: string
          username: string
          workspace_id: string
        }
        Insert: {
          biography?: string | null
          category?: string | null
          city_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          instagram_id?: string | null
          is_business?: boolean | null
          is_verified?: boolean | null
          last_fetched_at?: string | null
          media_count?: number | null
          profile_pic_url?: string | null
          raw_data?: Json | null
          updated_at?: string
          username: string
          workspace_id: string
        }
        Update: {
          biography?: string | null
          category?: string | null
          city_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          instagram_id?: string | null
          is_business?: boolean | null
          is_verified?: boolean | null
          last_fetched_at?: string | null
          media_count?: number | null
          profile_pic_url?: string | null
          raw_data?: Json | null
          updated_at?: string
          username?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          query: string | null
          results_count: number | null
          search_type: string
          status: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string | null
          results_count?: number | null
          search_type: string
          status?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string | null
          results_count?: number | null
          search_type?: string
          status?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_searches_workspace_id_fkey"
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
      inactivity_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          days_inactive: number
          entity_count: number
          entity_ids: Json
          entity_type: string
          id: string
          message: string | null
          sent_at: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          days_inactive?: number
          entity_count?: number
          entity_ids?: Json
          entity_type: string
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          days_inactive?: number
          entity_count?: number
          entity_ids?: Json
          entity_type?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inactivity_alerts_workspace_id_fkey"
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
      invoice_settings: {
        Row: {
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_nif: string | null
          company_phone: string | null
          created_at: string
          default_currency: string | null
          default_payment_terms: number | null
          email_body_template: string | null
          email_subject_template: string | null
          footer_text: string | null
          iban: string | null
          id: string
          invoice_prefix: string | null
          next_number: number | null
          primary_color: string | null
          reminder_days_before: number | null
          send_reminders: boolean | null
          show_logo: boolean | null
          swift_bic: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: number | null
          email_body_template?: string | null
          email_subject_template?: string | null
          footer_text?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          next_number?: number | null
          primary_color?: string | null
          reminder_days_before?: number | null
          send_reminders?: boolean | null
          show_logo?: boolean | null
          swift_bic?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: number | null
          email_body_template?: string | null
          email_subject_template?: string | null
          footer_text?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          next_number?: number | null
          primary_color?: string | null
          reminder_days_before?: number | null
          send_reminders?: boolean | null
          show_logo?: boolean | null
          swift_bic?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
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
      ip_restrictions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_restrictions_workspace_id_fkey"
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
      journey_stages: {
        Row: {
          allowed_actions: string[] | null
          auto_advance_condition: Json | null
          blocked_actions: string[] | null
          color: string | null
          created_at: string
          crm_stage_mapping: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_terminal: boolean | null
          stage_code: string
          stage_description: string | null
          stage_name: string
          stage_order: number
          sync_to_crm: boolean | null
          triggers_stop: boolean | null
          workspace_id: string
        }
        Insert: {
          allowed_actions?: string[] | null
          auto_advance_condition?: Json | null
          blocked_actions?: string[] | null
          color?: string | null
          created_at?: string
          crm_stage_mapping?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_terminal?: boolean | null
          stage_code: string
          stage_description?: string | null
          stage_name: string
          stage_order: number
          sync_to_crm?: boolean | null
          triggers_stop?: boolean | null
          workspace_id: string
        }
        Update: {
          allowed_actions?: string[] | null
          auto_advance_condition?: Json | null
          blocked_actions?: string[] | null
          color?: string | null
          created_at?: string
          crm_stage_mapping?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_terminal?: boolean | null
          stage_code?: string
          stage_description?: string | null
          stage_name?: string
          stage_order?: number
          sync_to_crm?: boolean | null
          triggers_stop?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_transitions: {
        Row: {
          conversation_id: string
          created_at: string
          from_stage: string | null
          id: string
          journey_id: string
          message_count_at_transition: number | null
          time_in_previous_stage_seconds: number | null
          to_stage: string
          trigger_data: Json | null
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          journey_id: string
          message_count_at_transition?: number | null
          time_in_previous_stage_seconds?: number | null
          to_stage: string
          trigger_data?: Json | null
          trigger_type: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          journey_id?: string
          message_count_at_transition?: number | null
          time_in_previous_stage_seconds?: number | null
          to_stage?: string
          trigger_data?: Json | null
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_transitions_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "conversation_journey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_transitions_workspace_id_fkey"
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
          allowed_topics: string[] | null
          content: string
          created_at: string
          created_by: string
          embedding: string | null
          entry_type: string
          expires_at: string | null
          forbidden_topics: string[] | null
          id: string
          is_factual_only: boolean | null
          keywords: string[] | null
          knowledge_base_id: string
          last_used_at: string | null
          question: string | null
          source_id: string | null
          source_priority: number | null
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
          allowed_topics?: string[] | null
          content: string
          created_at?: string
          created_by: string
          embedding?: string | null
          entry_type?: string
          expires_at?: string | null
          forbidden_topics?: string[] | null
          id?: string
          is_factual_only?: boolean | null
          keywords?: string[] | null
          knowledge_base_id: string
          last_used_at?: string | null
          question?: string | null
          source_id?: string | null
          source_priority?: number | null
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
          allowed_topics?: string[] | null
          content?: string
          created_at?: string
          created_by?: string
          embedding?: string | null
          entry_type?: string
          expires_at?: string | null
          forbidden_topics?: string[] | null
          id?: string
          is_factual_only?: boolean | null
          keywords?: string[] | null
          knowledge_base_id?: string
          last_used_at?: string | null
          question?: string | null
          source_id?: string | null
          source_priority?: number | null
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
          allowed_topics: string[] | null
          created_at: string
          created_by: string
          extracted_topics: string[] | null
          forbidden_topics: string[] | null
          id: string
          knowledge_base_id: string
          last_processed_at: string | null
          original_content: string | null
          processed_content: string | null
          processing_error: string | null
          processing_status: string | null
          source_file_path: string | null
          source_priority: number | null
          source_type: string
          source_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowed_topics?: string[] | null
          created_at?: string
          created_by: string
          extracted_topics?: string[] | null
          forbidden_topics?: string[] | null
          id?: string
          knowledge_base_id: string
          last_processed_at?: string | null
          original_content?: string | null
          processed_content?: string | null
          processing_error?: string | null
          processing_status?: string | null
          source_file_path?: string | null
          source_priority?: number | null
          source_type: string
          source_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowed_topics?: string[] | null
          created_at?: string
          created_by?: string
          extracted_topics?: string[] | null
          forbidden_topics?: string[] | null
          id?: string
          knowledge_base_id?: string
          last_processed_at?: string | null
          original_content?: string | null
          processed_content?: string | null
          processing_error?: string | null
          processing_status?: string | null
          source_file_path?: string | null
          source_priority?: number | null
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
      lead_linkedin_data: {
        Row: {
          analysis_status: string | null
          analyzed_at: string | null
          analyzed_by: string | null
          avg_comments_per_post: number | null
          avg_likes_per_post: number | null
          company_size_range: string | null
          connections_count: number | null
          created_at: string
          description: string | null
          employee_count_linkedin: number | null
          employees_on_linkedin: number | null
          engagement_score: number | null
          error_message: string | null
          founded_year: number | null
          headline: string | null
          headquarters: string | null
          id: string
          key_people: Json | null
          last_post_date: string | null
          lead_id: string
          linkedin_industry: string | null
          linkedin_type: string | null
          linkedin_url: string | null
          linkedin_website: string | null
          posting_frequency: string | null
          raw_data: Json | null
          recent_posts: Json | null
          specialties: string[] | null
          tagline: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_size_range?: string | null
          connections_count?: number | null
          created_at?: string
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          founded_year?: number | null
          headline?: string | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          lead_id: string
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          analysis_status?: string | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          avg_comments_per_post?: number | null
          avg_likes_per_post?: number | null
          company_size_range?: string | null
          connections_count?: number | null
          created_at?: string
          description?: string | null
          employee_count_linkedin?: number | null
          employees_on_linkedin?: number | null
          engagement_score?: number | null
          error_message?: string | null
          founded_year?: number | null
          headline?: string | null
          headquarters?: string | null
          id?: string
          key_people?: Json | null
          last_post_date?: string | null
          lead_id?: string
          linkedin_industry?: string | null
          linkedin_type?: string | null
          linkedin_url?: string | null
          linkedin_website?: string | null
          posting_frequency?: string | null
          raw_data?: Json | null
          recent_posts?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_linkedin_data_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_linkedin_data_workspace_id_fkey"
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
          avatar_url: string | null
          business_category: string | null
          business_hours: Json | null
          cae_codes: string[] | null
          cae_description: string | null
          capital_social: string | null
          city: string | null
          company_name: string | null
          company_status: string | null
          confidence_score: number | null
          conversion_probability: number | null
          county: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_value: number | null
          external_email: string | null
          external_instagram_id: string | null
          external_username: string | null
          external_whatsapp_id: string | null
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          ghl_contact_id: string | null
          ghl_synced_at: string | null
          google_place_id: string | null
          id: string
          inferred_profession: string | null
          inferred_specialty: string | null
          inferred_type: string | null
          inferred_workplace: string | null
          instagram_bio: string | null
          instagram_category: string | null
          instagram_enriched_at: string | null
          instagram_external_url: string | null
          instagram_followers_count: number | null
          instagram_following_count: number | null
          instagram_is_business: boolean | null
          instagram_is_verified: boolean | null
          instagram_posts_count: number | null
          instagram_url: string | null
          last_contact_at: string | null
          latitude: number | null
          lead_score: number | null
          lead_score_explanation: string | null
          lead_score_factors: Json | null
          legal_nature: string | null
          linkedin_url: string | null
          longitude: number | null
          name: string
          notes: string | null
          parish: string | null
          phone: string | null
          photos: string[] | null
          postal_code: string | null
          price_level: number | null
          prospecting_profile_id: string | null
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
          avatar_url?: string | null
          business_category?: string | null
          business_hours?: Json | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          confidence_score?: number | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          google_place_id?: string | null
          id?: string
          inferred_profession?: string | null
          inferred_specialty?: string | null
          inferred_type?: string | null
          inferred_workplace?: string | null
          instagram_bio?: string | null
          instagram_category?: string | null
          instagram_enriched_at?: string | null
          instagram_external_url?: string | null
          instagram_followers_count?: number | null
          instagram_following_count?: number | null
          instagram_is_business?: boolean | null
          instagram_is_verified?: boolean | null
          instagram_posts_count?: number | null
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          lead_score?: number | null
          lead_score_explanation?: string | null
          lead_score_factors?: Json | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          parish?: string | null
          phone?: string | null
          photos?: string[] | null
          postal_code?: string | null
          price_level?: number | null
          prospecting_profile_id?: string | null
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
          avatar_url?: string | null
          business_category?: string | null
          business_hours?: Json | null
          cae_codes?: string[] | null
          cae_description?: string | null
          capital_social?: string | null
          city?: string | null
          company_name?: string | null
          company_status?: string | null
          confidence_score?: number | null
          conversion_probability?: number | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          external_email?: string | null
          external_instagram_id?: string | null
          external_username?: string | null
          external_whatsapp_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          ghl_contact_id?: string | null
          ghl_synced_at?: string | null
          google_place_id?: string | null
          id?: string
          inferred_profession?: string | null
          inferred_specialty?: string | null
          inferred_type?: string | null
          inferred_workplace?: string | null
          instagram_bio?: string | null
          instagram_category?: string | null
          instagram_enriched_at?: string | null
          instagram_external_url?: string | null
          instagram_followers_count?: number | null
          instagram_following_count?: number | null
          instagram_is_business?: boolean | null
          instagram_is_verified?: boolean | null
          instagram_posts_count?: number | null
          instagram_url?: string | null
          last_contact_at?: string | null
          latitude?: number | null
          lead_score?: number | null
          lead_score_explanation?: string | null
          lead_score_factors?: Json | null
          legal_nature?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          parish?: string | null
          phone?: string | null
          photos?: string[] | null
          postal_code?: string | null
          price_level?: number | null
          prospecting_profile_id?: string | null
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
            foreignKeyName: "leads_prospecting_profile_id_fkey"
            columns: ["prospecting_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_prospecting_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ai_insights: Json | null
          ai_insights_generated_at: string | null
          body_html: string
          body_text: string | null
          bounced_count: number | null
          clicked_count: number | null
          complained_count: number | null
          completed_at: string | null
          created_at: string
          created_by: string
          delivered_count: number | null
          from_name: string
          id: string
          link_count: number | null
          name: string
          opened_count: number | null
          preview_text: string | null
          reply_to: string | null
          scheduled_at: string | null
          segment_id: string | null
          send_hour: number | null
          sent_count: number | null
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          total_recipients: number | null
          unsubscribed_count: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_insights?: Json | null
          ai_insights_generated_at?: string | null
          body_html: string
          body_text?: string | null
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          delivered_count?: number | null
          from_name: string
          id?: string
          link_count?: number | null
          name: string
          opened_count?: number | null
          preview_text?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          send_hour?: number | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          total_recipients?: number | null
          unsubscribed_count?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_insights?: Json | null
          ai_insights_generated_at?: string | null
          body_html?: string
          body_text?: string | null
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delivered_count?: number | null
          from_name?: string
          id?: string
          link_count?: number | null
          name?: string
          opened_count?: number | null
          preview_text?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          send_hour?: number | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number | null
          unsubscribed_count?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          metadata: Json | null
          occurred_at: string
          recipient_id: string | null
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          recipient_id?: string | null
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          recipient_id?: string | null
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "marketing_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_links: {
        Row: {
          campaign_id: string
          click_count: number | null
          created_at: string
          id: string
          original_url: string
          tracking_code: string
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          click_count?: number | null
          created_at?: string
          id?: string
          original_url: string
          tracking_code: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          click_count?: number | null
          created_at?: string
          id?: string
          original_url?: string
          tracking_code?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_recipients: {
        Row: {
          bounce_code: string | null
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          name: string | null
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bounce_code?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bounce_code?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          name?: string | null
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_recipients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_segments: {
        Row: {
          contact_count: number | null
          created_at: string
          created_by: string
          description: string | null
          filter_rules: Json
          id: string
          is_dynamic: boolean | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_count?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          filter_rules?: Json
          id?: string
          is_dynamic?: boolean | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_count?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          filter_rules?: Json
          id?: string
          is_dynamic?: boolean | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_settings: {
        Row: {
          active_campaigns_limit: number | null
          active_contacts_limit: number | null
          bounce_rate: number | null
          complaint_rate: number | null
          created_at: string
          custom_footer: string | null
          daily_campaigns_limit: number | null
          daily_email_limit: number | null
          default_from_name: string | null
          default_reply_to: string | null
          health_score: number | null
          id: string
          is_enabled: boolean | null
          kill_switch: boolean | null
          kill_switch_reason: string | null
          last_health_check: string | null
          monthly_email_limit: number | null
          unsubscribe_page_url: string | null
          updated_at: string
          warmup_days_completed: number | null
          warmup_enabled: boolean | null
          warmup_started_at: string | null
          workspace_id: string
        }
        Insert: {
          active_campaigns_limit?: number | null
          active_contacts_limit?: number | null
          bounce_rate?: number | null
          complaint_rate?: number | null
          created_at?: string
          custom_footer?: string | null
          daily_campaigns_limit?: number | null
          daily_email_limit?: number | null
          default_from_name?: string | null
          default_reply_to?: string | null
          health_score?: number | null
          id?: string
          is_enabled?: boolean | null
          kill_switch?: boolean | null
          kill_switch_reason?: string | null
          last_health_check?: string | null
          monthly_email_limit?: number | null
          unsubscribe_page_url?: string | null
          updated_at?: string
          warmup_days_completed?: number | null
          warmup_enabled?: boolean | null
          warmup_started_at?: string | null
          workspace_id: string
        }
        Update: {
          active_campaigns_limit?: number | null
          active_contacts_limit?: number | null
          bounce_rate?: number | null
          complaint_rate?: number | null
          created_at?: string
          custom_footer?: string | null
          daily_campaigns_limit?: number | null
          daily_email_limit?: number | null
          default_from_name?: string | null
          default_reply_to?: string | null
          health_score?: number | null
          id?: string
          is_enabled?: boolean | null
          kill_switch?: boolean | null
          kill_switch_reason?: string | null
          last_health_check?: string | null
          monthly_email_limit?: number | null
          unsubscribe_page_url?: string | null
          updated_at?: string
          warmup_days_completed?: number | null
          warmup_enabled?: boolean | null
          warmup_started_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_subscriptions: {
        Row: {
          consent_source: string | null
          contact_id: string | null
          created_at: string
          email: string
          id: string
          lead_id: string | null
          status: string
          subscribed_at: string | null
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          consent_source?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          lead_id?: string | null
          status?: string
          subscribed_at?: string | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          consent_source?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          lead_id?: string | null
          status?: string
          subscribed_at?: string | null
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_subscriptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          body_html: string
          body_text: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          subject: string | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
          workspace_id: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          subject?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          workspace_id: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          subject?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_tenant_health: {
        Row: {
          alerts_triggered: Json | null
          bounce_rate: number | null
          check_date: string
          complaint_rate: number | null
          created_at: string
          hard_bounces: number | null
          health_score: number | null
          id: string
          soft_bounces: number | null
          total_bounced: number | null
          total_complained: number | null
          total_delivered: number | null
          total_sent: number | null
          workspace_id: string
        }
        Insert: {
          alerts_triggered?: Json | null
          bounce_rate?: number | null
          check_date?: string
          complaint_rate?: number | null
          created_at?: string
          hard_bounces?: number | null
          health_score?: number | null
          id?: string
          soft_bounces?: number | null
          total_bounced?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_sent?: number | null
          workspace_id: string
        }
        Update: {
          alerts_triggered?: Json | null
          bounce_rate?: number | null
          check_date?: string
          complaint_rate?: number | null
          created_at?: string
          hard_bounces?: number | null
          health_score?: number | null
          id?: string
          soft_bounces?: number | null
          total_bounced?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_sent?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_tenant_health_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_usage: {
        Row: {
          active_campaigns: number | null
          active_contacts: number | null
          campaigns_limit: number | null
          contacts_limit: number | null
          created_at: string
          emails_limit: number | null
          emails_sent: number | null
          id: string
          period_end: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_campaigns?: number | null
          active_contacts?: number | null
          campaigns_limit?: number | null
          contacts_limit?: number | null
          created_at?: string
          emails_limit?: number | null
          emails_sent?: number | null
          id?: string
          period_end: string
          period_start: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_campaigns?: number | null
          active_contacts?: number | null
          campaigns_limit?: number | null
          contacts_limit?: number | null
          created_at?: string
          emails_limit?: number | null
          emails_sent?: number | null
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_usage_workspace_id_fkey"
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
      meeting_automation_events: {
        Row: {
          actions_executed: Json | null
          created_at: string
          created_by: string | null
          error_message: string | null
          event_type: string
          id: string
          meeting_id: string
          processed_at: string | null
          status: string
          trigger_source: string
          workspace_id: string
        }
        Insert: {
          actions_executed?: Json | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          meeting_id: string
          processed_at?: string | null
          status?: string
          trigger_source?: string
          workspace_id: string
        }
        Update: {
          actions_executed?: Json | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          meeting_id?: string
          processed_at?: string | null
          status?: string
          trigger_source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_automation_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_automation_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      meeting_preparations: {
        Row: {
          ai_generated: boolean | null
          client_summary: string | null
          created_at: string
          id: string
          key_points: string[] | null
          meeting_id: string
          preparation_date: string
          recent_interactions: string | null
          suggested_agenda: string[] | null
          updated_at: string
          user_id: string
          warnings: string[] | null
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          client_summary?: string | null
          created_at?: string
          id?: string
          key_points?: string[] | null
          meeting_id: string
          preparation_date?: string
          recent_interactions?: string | null
          suggested_agenda?: string[] | null
          updated_at?: string
          user_id: string
          warnings?: string[] | null
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean | null
          client_summary?: string | null
          created_at?: string
          id?: string
          key_points?: string[] | null
          meeting_id?: string
          preparation_date?: string
          recent_interactions?: string | null
          suggested_agenda?: string[] | null
          updated_at?: string
          user_id?: string
          warnings?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_preparations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reschedule_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message_channel: string | null
          message_sent_at: string | null
          new_meeting_id: string | null
          original_meeting_id: string
          reschedule_token: string
          responded_at: string | null
          status: string
          suggested_slots: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          message_channel?: string | null
          message_sent_at?: string | null
          new_meeting_id?: string | null
          original_meeting_id: string
          reschedule_token?: string
          responded_at?: string | null
          status?: string
          suggested_slots?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message_channel?: string | null
          message_sent_at?: string | null
          new_meeting_id?: string | null
          original_meeting_id?: string
          reschedule_token?: string
          responded_at?: string | null
          status?: string
          suggested_slots?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reschedule_requests_new_meeting_id_fkey"
            columns: ["new_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_reschedule_requests_original_meeting_id_fkey"
            columns: ["original_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_reschedule_requests_workspace_id_fkey"
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
      menu_permissions: {
        Row: {
          can_access: boolean | null
          can_edit: boolean | null
          created_at: string | null
          id: string
          menu_key: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string | null
        }
        Insert: {
          can_access?: boolean | null
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          menu_key: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string | null
        }
        Update: {
          can_access?: boolean | null
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          menu_key?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string | null
        }
        Relationships: []
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
          ghl_message_id: string | null
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
          ghl_message_id?: string | null
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
          ghl_message_id?: string | null
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
      metrics_snapshots: {
        Row: {
          active_subscriptions: number | null
          arr_total: number
          churn_mrr: number
          contraction_mrr: number
          created_at: string
          date: string
          expansion_mrr: number
          id: string
          mrr_total: number
          new_mrr: number
          total_customers: number | null
          workspace_id: string
        }
        Insert: {
          active_subscriptions?: number | null
          arr_total?: number
          churn_mrr?: number
          contraction_mrr?: number
          created_at?: string
          date: string
          expansion_mrr?: number
          id?: string
          mrr_total?: number
          new_mrr?: number
          total_customers?: number | null
          workspace_id: string
        }
        Update: {
          active_subscriptions?: number | null
          arr_total?: number
          churn_mrr?: number
          contraction_mrr?: number
          created_at?: string
          date?: string
          expansion_mrr?: number
          id?: string
          mrr_total?: number
          new_mrr?: number
          total_customers?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshots_workspace_id_fkey"
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
      object_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          object_key: string
          permission_key: string
          role: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          object_key: string
          permission_key: string
          role: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          object_key?: string
          permission_key?: string
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_phase_options: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          option_description: string | null
          option_label: string
          option_value: string
          sort_order: number | null
          triggers_escalation: boolean | null
          triggers_stop: boolean | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          option_description?: string | null
          option_label: string
          option_value: string
          sort_order?: number | null
          triggers_escalation?: boolean | null
          triggers_stop?: boolean | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          option_description?: string | null
          option_label?: string
          option_value?: string
          sort_order?: number | null
          triggers_escalation?: boolean | null
          triggers_stop?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_phase_options_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "conversation_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_phase_options_workspace_id_fkey"
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
          billing_frequency:
            | Database["public"]["Enums"]["billing_frequency"]
            | null
          billing_type: Database["public"]["Enums"]["billing_type"] | null
          churn_reason: string | null
          company_id: string | null
          contact_id: string | null
          contract_months: number | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          last_activity_at: string | null
          last_payment_date: string | null
          lead_id: string | null
          lost_reason: string | null
          mrr_amount: number | null
          next_payment_date: string | null
          notes: string | null
          owner_id: string
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          probability: number | null
          renewal_date: string | null
          source: string | null
          stage_id: string
          start_date: string | null
          status: string
          subscription_status:
            | Database["public"]["Enums"]["opportunity_subscription_status"]
            | null
          tcv_amount: number | null
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
          billing_frequency?:
            | Database["public"]["Enums"]["billing_frequency"]
            | null
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          churn_reason?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_months?: number | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string | null
          last_payment_date?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          mrr_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          owner_id: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          probability?: number | null
          renewal_date?: string | null
          source?: string | null
          stage_id: string
          start_date?: string | null
          status?: string
          subscription_status?:
            | Database["public"]["Enums"]["opportunity_subscription_status"]
            | null
          tcv_amount?: number | null
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
          billing_frequency?:
            | Database["public"]["Enums"]["billing_frequency"]
            | null
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          churn_reason?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_months?: number | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string | null
          last_payment_date?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          mrr_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          owner_id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          probability?: number | null
          renewal_date?: string | null
          source?: string | null
          stage_id?: string
          start_date?: string | null
          status?: string
          subscription_status?:
            | Database["public"]["Enums"]["opportunity_subscription_status"]
            | null
          tcv_amount?: number | null
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
      persona_escalation_rules: {
        Row: {
          assign_to_team: string | null
          assign_to_user_id: string | null
          created_at: string
          escalation_message: string | null
          escalation_priority: string
          id: string
          internal_note: string | null
          is_active: boolean
          notify_channels: string[] | null
          persona_id: string
          rule_name: string
          trigger_config: Json
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          created_at?: string
          escalation_message?: string | null
          escalation_priority?: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          notify_channels?: string[] | null
          persona_id: string
          rule_name: string
          trigger_config?: Json
          trigger_type?: string
          workspace_id: string
        }
        Update: {
          assign_to_team?: string | null
          assign_to_user_id?: string | null
          created_at?: string
          escalation_message?: string | null
          escalation_priority?: string
          id?: string
          internal_note?: string | null
          is_active?: boolean
          notify_channels?: string[] | null
          persona_id?: string
          rule_name?: string
          trigger_config?: Json
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_escalation_rules_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_escalation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_goals: {
        Row: {
          created_at: string
          goal_description: string | null
          goal_name: string
          goal_type: string
          id: string
          is_active: boolean
          persona_id: string
          priority: number
          success_condition: string
          success_value: string | null
          success_variable: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          goal_description?: string | null
          goal_name: string
          goal_type?: string
          id?: string
          is_active?: boolean
          persona_id: string
          priority?: number
          success_condition?: string
          success_value?: string | null
          success_variable?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          goal_description?: string | null
          goal_name?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          persona_id?: string
          priority?: number
          success_condition?: string
          success_value?: string | null
          success_variable?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_goals_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_stop_conditions: {
        Row: {
          condition_config: Json
          condition_name: string
          condition_type: string
          created_at: string
          id: string
          is_active: boolean
          persona_id: string
          priority: number
          stop_action: string
          stop_message: string | null
          workspace_id: string
        }
        Insert: {
          condition_config?: Json
          condition_name: string
          condition_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          persona_id: string
          priority?: number
          stop_action?: string
          stop_message?: string | null
          workspace_id: string
        }
        Update: {
          condition_config?: Json
          condition_name?: string
          condition_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          persona_id?: string
          priority?: number
          stop_action?: string
          stop_message?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_stop_conditions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_stop_conditions_workspace_id_fkey"
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
      price_optimization_logs: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          id: string
          margin_change: number | null
          optimization_type: string
          original_price: number
          price_table_id: string | null
          product_id: string | null
          reasoning: string | null
          suggested_price: number
          workspace_id: string
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          id?: string
          margin_change?: number | null
          optimization_type: string
          original_price: number
          price_table_id?: string | null
          product_id?: string | null
          reasoning?: string | null
          suggested_price: number
          workspace_id: string
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          id?: string
          margin_change?: number | null
          optimization_type?: string
          original_price?: number
          price_table_id?: string | null
          product_id?: string | null
          reasoning?: string | null
          suggested_price?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_optimization_logs_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_optimization_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_optimization_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_optimization_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      price_table_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          price_table_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          price_table_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          price_table_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_table_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_assignments_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      price_table_items: {
        Row: {
          ai_suggested_price: number | null
          ai_suggestion_reason: string | null
          created_at: string
          discount_percent: number | null
          id: string
          margin_percent: number | null
          max_quantity: number | null
          min_quantity: number | null
          notes: string | null
          original_price: number | null
          price_table_id: string
          product_id: string
          unit_price: number
          updated_at: string
          volume_tiers: Json | null
        }
        Insert: {
          ai_suggested_price?: number | null
          ai_suggestion_reason?: string | null
          created_at?: string
          discount_percent?: number | null
          id?: string
          margin_percent?: number | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          original_price?: number | null
          price_table_id: string
          product_id: string
          unit_price: number
          updated_at?: string
          volume_tiers?: Json | null
        }
        Update: {
          ai_suggested_price?: number | null
          ai_suggestion_reason?: string | null
          created_at?: string
          discount_percent?: number | null
          id?: string
          margin_percent?: number | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          original_price?: number | null
          price_table_id?: string
          product_id?: string
          unit_price?: number
          updated_at?: string
          volume_tiers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "price_table_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_table_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tables: {
        Row: {
          ai_optimization_notes: string | null
          ai_optimized: boolean | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_segment: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          margin_adjustment: number | null
          min_order_value: number | null
          name: string
          priority: number | null
          table_type: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          ai_optimization_notes?: string | null
          ai_optimized?: boolean | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_segment?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margin_adjustment?: number | null
          min_order_value?: number | null
          name: string
          priority?: number | null
          table_type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          ai_optimization_notes?: string | null
          ai_optimized?: boolean | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_segment?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margin_adjustment?: number | null
          min_order_value?: number | null
          name?: string
          priority?: number | null
          table_type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_tables_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_tables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          position?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      product_types: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          position: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          position?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          position?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string | null
          goal_scope: string | null
          id: string
          metric_type: string | null
          parent_goal_id: string | null
          period: Database["public"]["Enums"]["goal_period"]
          period_end: string
          period_start: string
          priority: number | null
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number | null
          team_id: string | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_scope?: string | null
          id?: string
          metric_type?: string | null
          parent_goal_id?: string | null
          period: Database["public"]["Enums"]["goal_period"]
          period_end: string
          period_start: string
          priority?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          team_id?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_scope?: string | null
          id?: string
          metric_type?: string | null
          parent_goal_id?: string | null
          period?: Database["public"]["Enums"]["goal_period"]
          period_end?: string
          period_start?: string
          priority?: number | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          team_id?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "productivity_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_insights: {
        Row: {
          action_url: string | null
          content: string
          created_at: string
          dismissed_at: string | null
          id: string
          insight_date: string
          insight_type: string
          is_dismissed: boolean | null
          metadata: Json | null
          priority: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_url?: string | null
          content: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          insight_date?: string
          insight_type: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_url?: string | null
          content?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          insight_date?: string
          insight_type?: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_insights_workspace_id_fkey"
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
          demo_video_url: string | null
          direct_cost: number | null
          id: string
          images: string[] | null
          included_quantity: number | null
          is_trackable: boolean | null
          labor_hourly_rate: number | null
          labor_hours: number | null
          labor_included_in_price: boolean | null
          labor_notes: string | null
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
          specifications: Json | null
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
          demo_video_url?: string | null
          direct_cost?: number | null
          id?: string
          images?: string[] | null
          included_quantity?: number | null
          is_trackable?: boolean | null
          labor_hourly_rate?: number | null
          labor_hours?: number | null
          labor_included_in_price?: boolean | null
          labor_notes?: string | null
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
          specifications?: Json | null
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
          demo_video_url?: string | null
          direct_cost?: number | null
          id?: string
          images?: string[] | null
          included_quantity?: number | null
          is_trackable?: boolean | null
          labor_hourly_rate?: number | null
          labor_hours?: number | null
          labor_included_in_price?: boolean | null
          labor_notes?: string | null
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
          specifications?: Json | null
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
      professional_prospecting_profiles: {
        Row: {
          ai_analysis: Json | null
          analyzed_at: string | null
          confidence_score: number | null
          contact_source: string | null
          converted_at: string | null
          converted_by: string | null
          converted_lead_id: string | null
          created_at: string
          extracted_email: string | null
          extracted_phone: string | null
          id: string
          inferred_location: string | null
          inferred_profession: string | null
          inferred_specialty: string | null
          inferred_type: string | null
          inferred_workplace: string | null
          instagram_category: string | null
          instagram_enriched_at: string | null
          instagram_external_url: string | null
          instagram_followers_count: number | null
          instagram_following_count: number | null
          instagram_full_bio: string | null
          instagram_is_business: boolean | null
          instagram_is_verified: boolean | null
          instagram_posts_count: number | null
          instagram_raw_data: Json | null
          lead_score: number | null
          lead_score_explanation: string | null
          lead_score_factors: Json | null
          platform: string
          profile_bio: string | null
          profile_image_url: string | null
          profile_link: string | null
          profile_name: string | null
          profile_url: string
          raw_data: Json | null
          rejection_reason: string | null
          search_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          confidence_score?: number | null
          contact_source?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_lead_id?: string | null
          created_at?: string
          extracted_email?: string | null
          extracted_phone?: string | null
          id?: string
          inferred_location?: string | null
          inferred_profession?: string | null
          inferred_specialty?: string | null
          inferred_type?: string | null
          inferred_workplace?: string | null
          instagram_category?: string | null
          instagram_enriched_at?: string | null
          instagram_external_url?: string | null
          instagram_followers_count?: number | null
          instagram_following_count?: number | null
          instagram_full_bio?: string | null
          instagram_is_business?: boolean | null
          instagram_is_verified?: boolean | null
          instagram_posts_count?: number | null
          instagram_raw_data?: Json | null
          lead_score?: number | null
          lead_score_explanation?: string | null
          lead_score_factors?: Json | null
          platform?: string
          profile_bio?: string | null
          profile_image_url?: string | null
          profile_link?: string | null
          profile_name?: string | null
          profile_url: string
          raw_data?: Json | null
          rejection_reason?: string | null
          search_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          confidence_score?: number | null
          contact_source?: string | null
          converted_at?: string | null
          converted_by?: string | null
          converted_lead_id?: string | null
          created_at?: string
          extracted_email?: string | null
          extracted_phone?: string | null
          id?: string
          inferred_location?: string | null
          inferred_profession?: string | null
          inferred_specialty?: string | null
          inferred_type?: string | null
          inferred_workplace?: string | null
          instagram_category?: string | null
          instagram_enriched_at?: string | null
          instagram_external_url?: string | null
          instagram_followers_count?: number | null
          instagram_following_count?: number | null
          instagram_full_bio?: string | null
          instagram_is_business?: boolean | null
          instagram_is_verified?: boolean | null
          instagram_posts_count?: number | null
          instagram_raw_data?: Json | null
          lead_score?: number | null
          lead_score_explanation?: string | null
          lead_score_factors?: Json | null
          platform?: string
          profile_bio?: string | null
          profile_image_url?: string | null
          profile_link?: string | null
          profile_name?: string | null
          profile_url?: string
          raw_data?: Json | null
          rejection_reason?: string | null
          search_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_prospecting_profiles_converted_lead_id_fkey"
            columns: ["converted_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_prospecting_profiles_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "professional_prospecting_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_prospecting_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_prospecting_searches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          keywords: string[] | null
          location: string | null
          platforms: string[] | null
          profession: string
          results_count: number | null
          search_type: string
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          location?: string | null
          platforms?: string[] | null
          profession: string
          results_count?: number | null
          search_type?: string
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          location?: string | null
          platforms?: string[] | null
          profession?: string
          results_count?: number | null
          search_type?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_prospecting_searches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_prospecting_usage: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          profiles_analyzed_count: number
          profiles_analyzed_limit: number
          searches_count: number
          searches_limit: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          profiles_analyzed_count?: number
          profiles_analyzed_limit?: number
          searches_count?: number
          searches_limit?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          profiles_analyzed_count?: number
          profiles_analyzed_limit?: number
          searches_count?: number
          searches_limit?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_prospecting_usage_workspace_id_fkey"
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
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status?: string | null
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
          is_enabled: boolean
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
          is_enabled?: boolean
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
          is_enabled?: boolean
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
          billing_address: string | null
          billing_nif: string | null
          company_id: string | null
          contact_id: string | null
          content_blocks: Json
          created_at: string
          created_by: string | null
          cta_color: string | null
          cta_text: string | null
          currency: string | null
          expires_at: string | null
          id: string
          notes: string | null
          opportunity_id: string
          payment_conditions: string | null
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
          validity_days: number | null
          variables: Json | null
          views_count: number | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          billing_address?: string | null
          billing_nif?: string | null
          company_id?: string | null
          contact_id?: string | null
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          payment_conditions?: string | null
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
          validity_days?: number | null
          variables?: Json | null
          views_count?: number | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          billing_address?: string | null
          billing_nif?: string | null
          company_id?: string | null
          contact_id?: string | null
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          cta_color?: string | null
          cta_text?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          payment_conditions?: string | null
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
          validity_days?: number | null
          variables?: Json | null
          views_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
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
      rag_historical_outcomes: {
        Row: {
          company_size: string | null
          created_at: string | null
          deal_cycle_days: number | null
          embedding: string | null
          embedding_text: string | null
          entity_snapshot: Json
          failure_factors: string[] | null
          final_stage: string | null
          id: string
          indexed_at: string | null
          industry: string | null
          initial_stage: string | null
          lessons_learned: string | null
          outcome: string
          outcome_date: string | null
          outcome_reason: string | null
          outcome_value: number | null
          source_entity_id: string
          source_entity_type: string
          success_factors: string[] | null
          workspace_id: string
        }
        Insert: {
          company_size?: string | null
          created_at?: string | null
          deal_cycle_days?: number | null
          embedding?: string | null
          embedding_text?: string | null
          entity_snapshot?: Json
          failure_factors?: string[] | null
          final_stage?: string | null
          id?: string
          indexed_at?: string | null
          industry?: string | null
          initial_stage?: string | null
          lessons_learned?: string | null
          outcome: string
          outcome_date?: string | null
          outcome_reason?: string | null
          outcome_value?: number | null
          source_entity_id: string
          source_entity_type: string
          success_factors?: string[] | null
          workspace_id: string
        }
        Update: {
          company_size?: string | null
          created_at?: string | null
          deal_cycle_days?: number | null
          embedding?: string | null
          embedding_text?: string | null
          entity_snapshot?: Json
          failure_factors?: string[] | null
          final_stage?: string | null
          id?: string
          indexed_at?: string | null
          industry?: string | null
          initial_stage?: string | null
          lessons_learned?: string | null
          outcome?: string
          outcome_date?: string | null
          outcome_reason?: string | null
          outcome_value?: number | null
          source_entity_id?: string
          source_entity_type?: string
          success_factors?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_historical_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_indexed_chunks: {
        Row: {
          chunk_content: string
          chunk_index: number
          chunk_metadata: Json | null
          created_at: string | null
          embedding: string | null
          id: string
          quality_score: number | null
          source_id: string
          source_table: string
          workspace_id: string
        }
        Insert: {
          chunk_content: string
          chunk_index: number
          chunk_metadata?: Json | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          quality_score?: number | null
          source_id: string
          source_table: string
          workspace_id: string
        }
        Update: {
          chunk_content?: string
          chunk_index?: number
          chunk_metadata?: Json | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          quality_score?: number | null
          source_id?: string
          source_table?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_indexed_chunks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_retrieval_metrics: {
        Row: {
          agent_type: string
          avg_relevance_score: number | null
          chunks_retrieved: number | null
          chunks_used: number | null
          context_tokens_used: number | null
          id: string
          query_date: string | null
          query_type: string
          retrieval_time_ms: number | null
          workspace_id: string
        }
        Insert: {
          agent_type: string
          avg_relevance_score?: number | null
          chunks_retrieved?: number | null
          chunks_used?: number | null
          context_tokens_used?: number | null
          id?: string
          query_date?: string | null
          query_type: string
          retrieval_time_ms?: number | null
          workspace_id: string
        }
        Update: {
          agent_type?: string
          avg_relevance_score?: number | null
          chunks_retrieved?: number | null
          chunks_used?: number | null
          context_tokens_used?: number | null
          id?: string
          query_date?: string | null
          query_type?: string
          retrieval_time_ms?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_retrieval_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_pricing_items: {
        Row: {
          created_at: string
          discount_percent: number | null
          id: string
          notes: string | null
          plan_key: string
          pricing_table_id: string
          unit_price: number
          updated_at: string
          volume_tiers: Json | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          plan_key: string
          pricing_table_id: string
          unit_price: number
          updated_at?: string
          volume_tiers?: Json | null
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          plan_key?: string
          pricing_table_id?: string
          unit_price?: number
          updated_at?: string
          volume_tiers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_pricing_items_pricing_table_id_fkey"
            columns: ["pricing_table_id"]
            isOneToOne: false
            referencedRelation: "saas_pricing_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_pricing_tables: {
        Row: {
          base_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          pricing_type: string
          priority: number | null
          target_segment: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          workspace_id: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          pricing_type?: string
          priority?: number | null
          target_segment?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          pricing_type?: string
          priority?: number | null
          target_segment?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_pricing_tables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          created_at: string
          created_by: string
          id: string
          leads_target: number
          month: string
          opportunities_target: number
          proposals_target: number
          revenue_target: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          leads_target?: number
          month: string
          opportunities_target?: number
          proposals_target?: number
          revenue_target?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          leads_target?: number
          month?: string
          opportunities_target?: number
          proposals_target?: number
          revenue_target?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_comparisons: {
        Row: {
          content: Json | null
          created_at: string | null
          entity_a_id: string | null
          entity_b_id: string | null
          id: string
          meta_description: string | null
          published_at: string | null
          schema_markup: Json | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          views_count: number | null
          winner: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          entity_a_id?: string | null
          entity_b_id?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          schema_markup?: Json | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          views_count?: number | null
          winner?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          entity_a_id?: string | null
          entity_b_id?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          schema_markup?: Json | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
          winner?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_comparisons_entity_a_id_fkey"
            columns: ["entity_a_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_comparisons_entity_b_id_fkey"
            columns: ["entity_b_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_comparisons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_entities: {
        Row: {
          ai_generated_at: string | null
          ai_quality_score: number | null
          canonical_url: string | null
          change_frequency: string | null
          content: Json | null
          country: string | null
          created_at: string | null
          entity_type: string
          h1: string | null
          id: string
          intent: string | null
          language: string | null
          meta_description: string | null
          og_image: string | null
          priority: number | null
          published_at: string | null
          schema_markup: Json | null
          slug: string
          status: string | null
          title: string
          tldr: string | null
          updated_at: string | null
          views_count: number | null
          workspace_id: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_quality_score?: number | null
          canonical_url?: string | null
          change_frequency?: string | null
          content?: Json | null
          country?: string | null
          created_at?: string | null
          entity_type: string
          h1?: string | null
          id?: string
          intent?: string | null
          language?: string | null
          meta_description?: string | null
          og_image?: string | null
          priority?: number | null
          published_at?: string | null
          schema_markup?: Json | null
          slug: string
          status?: string | null
          title: string
          tldr?: string | null
          updated_at?: string | null
          views_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_quality_score?: number | null
          canonical_url?: string | null
          change_frequency?: string | null
          content?: Json | null
          country?: string | null
          created_at?: string | null
          entity_type?: string
          h1?: string | null
          id?: string
          intent?: string | null
          language?: string | null
          meta_description?: string | null
          og_image?: string | null
          priority?: number | null
          published_at?: string | null
          schema_markup?: Json | null
          slug?: string
          status?: string | null
          title?: string
          tldr?: string | null
          updated_at?: string | null
          views_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_entities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_faqs: {
        Row: {
          answer: string
          created_at: string | null
          entity_id: string | null
          id: string
          is_featured: boolean | null
          position: number | null
          question: string
          workspace_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_featured?: boolean | null
          position?: number | null
          question: string
          workspace_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_featured?: boolean | null
          position?: number | null
          question?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_faqs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_faqs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_page_analytics: {
        Row: {
          comparison_id: string | null
          country_code: string | null
          created_at: string | null
          device_type: string | null
          entity_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          comparison_id?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          entity_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          comparison_id?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          entity_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_page_analytics_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "seo_comparisons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_page_analytics_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "seo_entities"
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
      sj_ai_suggestions: {
        Row: {
          created_at: string | null
          enrollment_id: string | null
          id: string
          message: string
          priority: string | null
          profile_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggestion_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          message: string
          priority?: string | null
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggestion_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          message?: string
          priority?: string | null
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggestion_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_ai_suggestions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sj_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_ai_suggestions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_ai_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_automation_logs: {
        Row: {
          actions_executed: Json | null
          automation_id: string | null
          automation_name: string
          enrollment_id: string | null
          executed_at: string | null
          id: string
          profile_id: string | null
          status: string
          trigger_data: Json | null
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          actions_executed?: Json | null
          automation_id?: string | null
          automation_name: string
          enrollment_id?: string | null
          executed_at?: string | null
          id?: string
          profile_id?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_type: string
          workspace_id: string
        }
        Update: {
          actions_executed?: Json | null
          automation_id?: string | null
          automation_name?: string
          enrollment_id?: string | null
          executed_at?: string | null
          id?: string
          profile_id?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "sj_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_automation_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sj_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_automation_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_automation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_automations: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_cohorts: {
        Row: {
          capacity: number | null
          course_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          settings: Json | null
          start_date: string | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          capacity?: number | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          capacity?: number | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          settings?: Json | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "sj_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_cohorts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_course_recommendations: {
        Row: {
          contacted_at: string | null
          converted_at: string | null
          course_id: string
          created_at: string | null
          created_by: string
          dismissed_at: string | null
          dismissed_reason: string | null
          expires_at: string | null
          id: string
          match_reasons: Json
          match_score: number
          profile_id: string
          recommended_at: string | null
          score_breakdown: Json | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          contacted_at?: string | null
          converted_at?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: Json
          match_score?: number
          profile_id: string
          recommended_at?: string | null
          score_breakdown?: Json | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          contacted_at?: string | null
          converted_at?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string
          dismissed_at?: string | null
          dismissed_reason?: string | null
          expires_at?: string | null
          id?: string
          match_reasons?: Json
          match_score?: number
          profile_id?: string
          recommended_at?: string | null
          score_breakdown?: Json | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_course_recommendations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "sj_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_course_recommendations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_course_recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_courses: {
        Row: {
          cohort_enabled: boolean | null
          course_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          level: string | null
          name: string
          next_courses: Json | null
          prerequisites: Json | null
          price: number | null
          provider: string
          provider_course_id: string | null
          recommended_for: Json | null
          settings: Json | null
          specialty_id: string | null
          start_date: string | null
          tags: Json | null
          updated_at: string | null
          urgency_score: number | null
          workspace_id: string
        }
        Insert: {
          cohort_enabled?: boolean | null
          course_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name: string
          next_courses?: Json | null
          prerequisites?: Json | null
          price?: number | null
          provider?: string
          provider_course_id?: string | null
          recommended_for?: Json | null
          settings?: Json | null
          specialty_id?: string | null
          start_date?: string | null
          tags?: Json | null
          updated_at?: string | null
          urgency_score?: number | null
          workspace_id: string
        }
        Update: {
          cohort_enabled?: boolean | null
          course_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name?: string
          next_courses?: Json | null
          prerequisites?: Json | null
          price?: number | null
          provider?: string
          provider_course_id?: string | null
          recommended_for?: Json | null
          settings?: Json | null
          specialty_id?: string | null
          start_date?: string | null
          tags?: Json | null
          updated_at?: string | null
          urgency_score?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_courses_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "sj_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_courses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_enrollments: {
        Row: {
          cohort_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          last_activity_at: string | null
          notes: string | null
          payment_status: string
          profile_id: string
          progress_percent: number | null
          source: string
          started_at: string | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cohort_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          payment_status?: string
          profile_id: string
          progress_percent?: number | null
          source?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cohort_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          payment_status?: string
          profile_id?: string
          progress_percent?: number | null
          source?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "sj_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "sj_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_enrollments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          errors: Json | null
          file_name: string | null
          file_url: string | null
          id: string
          mapping_config: Json | null
          processed_rows: number | null
          results_summary: Json | null
          skipped_count: number | null
          source: string
          started_at: string | null
          status: string
          success_count: number | null
          total_rows: number | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mapping_config?: Json | null
          processed_rows?: number | null
          results_summary?: Json | null
          skipped_count?: number | null
          source: string
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_rows?: number | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          mapping_config?: Json | null
          processed_rows?: number | null
          results_summary?: Json | null
          skipped_count?: number | null
          source?: string
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_rows?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_import_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_interests_taxonomy: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          synonyms: Json | null
          topic: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          synonyms?: Json | null
          topic: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          synonyms?: Json | null
          topic?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_interests_taxonomy_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_profiles: {
        Row: {
          activation_potential: string | null
          contact_id: string | null
          created_at: string | null
          current_level: string | null
          dropout_risk: string | null
          email: string | null
          external_ref: string | null
          follow_up_reason: string | null
          full_name: string
          id: string
          interests: Json | null
          last_activity_at: string | null
          last_course_completed_at: string | null
          lifecycle_stage: string
          next_best_action: string | null
          next_follow_up_at: string | null
          owner_user_id: string | null
          phone: string | null
          preferred_channel: string | null
          primary_interest: string | null
          primary_specialty: string | null
          recommendations_enabled: boolean | null
          role: string | null
          specialties_progress: Json | null
          student_score: number | null
          total_courses_completed: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          activation_potential?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_level?: string | null
          dropout_risk?: string | null
          email?: string | null
          external_ref?: string | null
          follow_up_reason?: string | null
          full_name: string
          id?: string
          interests?: Json | null
          last_activity_at?: string | null
          last_course_completed_at?: string | null
          lifecycle_stage?: string
          next_best_action?: string | null
          next_follow_up_at?: string | null
          owner_user_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          primary_interest?: string | null
          primary_specialty?: string | null
          recommendations_enabled?: boolean | null
          role?: string | null
          specialties_progress?: Json | null
          student_score?: number | null
          total_courses_completed?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          activation_potential?: string | null
          contact_id?: string | null
          created_at?: string | null
          current_level?: string | null
          dropout_risk?: string | null
          email?: string | null
          external_ref?: string | null
          follow_up_reason?: string | null
          full_name?: string
          id?: string
          interests?: Json | null
          last_activity_at?: string | null
          last_course_completed_at?: string | null
          lifecycle_stage?: string
          next_best_action?: string | null
          next_follow_up_at?: string | null
          owner_user_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          primary_interest?: string | null
          primary_specialty?: string | null
          recommendations_enabled?: boolean | null
          role?: string | null
          specialties_progress?: Json | null
          student_score?: number | null
          total_courses_completed?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_specialties: {
        Row: {
          clinical_risk_level: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          clinical_risk_level?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          clinical_risk_level?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_specialties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          enrollment_id: string | null
          id: string
          profile_id: string | null
          status: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          enrollment_id?: string | null
          id?: string
          profile_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          enrollment_id?: string | null
          id?: string
          profile_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_tasks_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sj_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sj_touchpoints: {
        Row: {
          created_at: string | null
          created_by: string | null
          enrollment_id: string | null
          id: string
          message_preview: string | null
          metadata: Json | null
          next_action: string | null
          occurred_at: string | null
          outcome: string | null
          profile_id: string
          touchpoint_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          next_action?: string | null
          occurred_at?: string | null
          outcome?: string | null
          profile_id: string
          touchpoint_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          next_action?: string | null
          occurred_at?: string | null
          outcome?: string | null
          profile_id?: string
          touchpoint_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sj_touchpoints_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sj_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_touchpoints_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "sj_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sj_touchpoints_workspace_id_fkey"
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
      subscription_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id: string
          notes: string | null
          occurred_at: string
          raw_payload: Json | null
          subscription_id: string
          workspace_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: Database["public"]["Enums"]["subscription_event_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          raw_payload?: Json | null
          subscription_id: string
          workspace_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: Database["public"]["Enums"]["subscription_event_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          raw_payload?: Json | null
          subscription_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          frequency: Database["public"]["Enums"]["billing_frequency"]
          id: string
          last_payment_date: string | null
          mrr_amount: number
          next_payment_date: string | null
          opportunity_id: string | null
          plan_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id: string | null
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          frequency?: Database["public"]["Enums"]["billing_frequency"]
          id?: string
          last_payment_date?: string | null
          mrr_amount?: number
          next_payment_date?: string | null
          opportunity_id?: string | null
          plan_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          frequency?: Database["public"]["Enums"]["billing_frequency"]
          id?: string
          last_payment_date?: string | null
          mrr_amount?: number
          next_payment_date?: string | null
          opportunity_id?: string | null
          plan_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "product_usage_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
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
      team_feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "team_feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "team_feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_feed_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          meeting_id: string | null
          metadata: Json | null
          post_type: string
          reactions: Json | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          meeting_id?: string | null
          metadata?: Json | null
          post_type?: string
          reactions?: Json | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          meeting_id?: string | null
          metadata?: Json | null
          post_type?: string
          reactions?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_feed_posts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_feed_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      trigger_job_runs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_data: Json | null
          id: string
          idempotency_key: string | null
          input_data: Json | null
          job_type: string
          max_attempts: number | null
          output_data: Json | null
          priority: number | null
          recommendation_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          trigger_run_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_data?: Json | null
          id?: string
          idempotency_key?: string | null
          input_data?: Json | null
          job_type: string
          max_attempts?: number | null
          output_data?: Json | null
          priority?: number | null
          recommendation_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_run_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_data?: Json | null
          id?: string
          idempotency_key?: string | null
          input_data?: Json | null
          job_type?: string
          max_attempts?: number | null
          output_data?: Json | null
          priority?: number | null
          recommendation_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_run_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trigger_job_runs_workspace_id_fkey"
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
      vibe_phrases: {
        Row: {
          context: string | null
          created_at: string
          id: string
          is_blocked: boolean | null
          is_required: boolean | null
          original_phrase: string
          phrase_type: string
          preferred_phrase: string
          vibe_profile_id: string | null
          workspace_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          is_required?: boolean | null
          original_phrase: string
          phrase_type: string
          preferred_phrase: string
          vibe_profile_id?: string | null
          workspace_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          is_required?: boolean | null
          original_phrase?: string
          phrase_type?: string
          preferred_phrase?: string
          vibe_profile_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_phrases_vibe_profile_id_fkey"
            columns: ["vibe_profile_id"]
            isOneToOne: false
            referencedRelation: "vibe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_phrases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_profiles: {
        Row: {
          acknowledge_emotions: boolean
          avoid_sales_language: boolean
          code: string
          commercial_approach: string
          created_at: string
          description: string | null
          focus_on_value: boolean
          formality: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language_code: string
          max_sentences_per_response: number | null
          name: string
          personality: string
          personalize_responses: boolean
          preferred_structure: string
          response_length: string
          tone: string
          updated_at: string
          use_contractions: boolean
          use_emojis: boolean
          use_exclamations: boolean
          use_first_person: boolean
          workspace_id: string
        }
        Insert: {
          acknowledge_emotions?: boolean
          avoid_sales_language?: boolean
          code: string
          commercial_approach?: string
          created_at?: string
          description?: string | null
          focus_on_value?: boolean
          formality?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language_code?: string
          max_sentences_per_response?: number | null
          name: string
          personality?: string
          personalize_responses?: boolean
          preferred_structure?: string
          response_length?: string
          tone?: string
          updated_at?: string
          use_contractions?: boolean
          use_emojis?: boolean
          use_exclamations?: boolean
          use_first_person?: boolean
          workspace_id: string
        }
        Update: {
          acknowledge_emotions?: boolean
          avoid_sales_language?: boolean
          code?: string
          commercial_approach?: string
          created_at?: string
          description?: string | null
          focus_on_value?: boolean
          formality?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language_code?: string
          max_sentences_per_response?: number | null
          name?: string
          personality?: string
          personalize_responses?: boolean
          preferred_structure?: string
          response_length?: string
          tone?: string
          updated_at?: string
          use_contractions?: boolean
          use_emojis?: boolean
          use_exclamations?: boolean
          use_first_person?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_configurations: {
        Row: {
          allowed_domains: string[] | null
          auto_open_delay_ms: number | null
          avatar_url: string | null
          bubble_icon: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          custom_css: string | null
          default_flow_id: string | null
          default_persona_id: string | null
          id: string
          is_active: boolean | null
          knowledge_base_ids: string[] | null
          name: string
          placeholder_text: string | null
          position: string | null
          primary_color: string | null
          require_email_before_chat: boolean | null
          secondary_color: string | null
          show_branding: boolean | null
          text_color: string | null
          updated_at: string
          welcome_message: string | null
          workspace_id: string
        }
        Insert: {
          allowed_domains?: string[] | null
          auto_open_delay_ms?: number | null
          avatar_url?: string | null
          bubble_icon?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          default_flow_id?: string | null
          default_persona_id?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          name?: string
          placeholder_text?: string | null
          position?: string | null
          primary_color?: string | null
          require_email_before_chat?: boolean | null
          secondary_color?: string | null
          show_branding?: boolean | null
          text_color?: string | null
          updated_at?: string
          welcome_message?: string | null
          workspace_id: string
        }
        Update: {
          allowed_domains?: string[] | null
          auto_open_delay_ms?: number | null
          avatar_url?: string | null
          bubble_icon?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          default_flow_id?: string | null
          default_persona_id?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_ids?: string[] | null
          name?: string
          placeholder_text?: string | null
          position?: string | null
          primary_color?: string | null
          require_email_before_chat?: boolean | null
          secondary_color?: string | null
          show_branding?: boolean | null
          text_color?: string | null
          updated_at?: string
          welcome_message?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_configurations_default_flow_id_fkey"
            columns: ["default_flow_id"]
            isOneToOne: false
            referencedRelation: "conversational_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configurations_default_persona_id_fkey"
            columns: ["default_persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configurations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          lead_id: string | null
          session_id: string | null
          status: string | null
          transferred_to_inbox_at: string | null
          updated_at: string
          visitor_email: string | null
          visitor_id: string
          visitor_metadata: Json | null
          visitor_name: string | null
          widget_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          session_id?: string | null
          status?: string | null
          transferred_to_inbox_at?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id: string
          visitor_metadata?: Json | null
          visitor_name?: string | null
          widget_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          session_id?: string | null
          status?: string | null
          transferred_to_inbox_at?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string
          visitor_metadata?: Json | null
          visitor_name?: string | null
          widget_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_conversations_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_messages: {
        Row: {
          collected_variable: string | null
          content: string
          conversation_id: string
          created_at: string
          flow_step_id: string | null
          id: string
          role: string
        }
        Insert: {
          collected_variable?: string | null
          content: string
          conversation_id: string
          created_at?: string
          flow_step_id?: string | null
          id?: string
          role: string
        }
        Update: {
          collected_variable?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          flow_step_id?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "widget_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_messages_flow_step_id_fkey"
            columns: ["flow_step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          max_retries: number | null
          name: string
          retry_delay_ms: number | null
          steps: Json
          timeout_ms: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_retries?: number | null
          name: string
          retry_delay_ms?: number | null
          steps?: Json
          timeout_ms?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_retries?: number | null
          name?: string
          retry_delay_ms?: number | null
          steps?: Json
          timeout_ms?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          checkpoint_data: Json | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          current_step_index: number | null
          definition_id: string | null
          entity_id: string | null
          entity_type: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          initiated_by: string | null
          input_data: Json | null
          last_checkpoint_at: string | null
          max_retries: number | null
          output_data: Json | null
          recommendation_id: string | null
          retry_count: number | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          timeout_at: string | null
          total_duration_ms: number | null
          trigger_source: string | null
          trigger_type: string
          updated_at: string | null
          workflow_code: string
          workflow_version: number
          workspace_id: string
        }
        Insert: {
          checkpoint_data?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_step_index?: number | null
          definition_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          input_data?: Json | null
          last_checkpoint_at?: string | null
          max_retries?: number | null
          output_data?: Json | null
          recommendation_id?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          timeout_at?: string | null
          total_duration_ms?: number | null
          trigger_source?: string | null
          trigger_type: string
          updated_at?: string | null
          workflow_code: string
          workflow_version?: number
          workspace_id: string
        }
        Update: {
          checkpoint_data?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_step_index?: number | null
          definition_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          input_data?: Json | null
          last_checkpoint_at?: string | null
          max_retries?: number | null
          output_data?: Json | null
          recommendation_id?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          timeout_at?: string | null
          total_duration_ms?: number | null
          trigger_source?: string | null
          trigger_type?: string
          updated_at?: string | null
          workflow_code?: string
          workflow_version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_idempotency_keys: {
        Row: {
          action_target: string | null
          action_type: string
          executed_at: string
          execution_id: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          result_data: Json | null
          result_status: string | null
          step_id: string | null
          workspace_id: string
        }
        Insert: {
          action_target?: string | null
          action_type: string
          executed_at?: string
          execution_id?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          result_data?: Json | null
          result_status?: string | null
          step_id?: string | null
          workspace_id: string
        }
        Update: {
          action_target?: string | null
          action_type?: string
          executed_at?: string
          execution_id?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          result_data?: Json | null
          result_status?: string | null
          step_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_idempotency_keys_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_idempotency_keys_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_idempotency_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          execution_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          lock_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          next_attempt_at: string | null
          priority: number | null
          scheduled_for: string | null
          status: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          execution_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          next_attempt_at?: string | null
          priority?: number | null
          scheduled_for?: string | null
          status?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          execution_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          next_attempt_at?: string | null
          priority?: number | null
          scheduled_for?: string | null
          status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          depends_on: string[] | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          execution_id: string
          id: string
          idempotency_key: string
          input_data: Json | null
          is_parallel: boolean | null
          max_retries: number | null
          output_data: Json | null
          parallel_group: string | null
          retry_count: number | null
          started_at: string | null
          status: string
          step_code: string
          step_index: number
          step_type: string
          timeout_ms: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string[] | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_id: string
          id?: string
          idempotency_key: string
          input_data?: Json | null
          is_parallel?: boolean | null
          max_retries?: number | null
          output_data?: Json | null
          parallel_group?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_code: string
          step_index: number
          step_type: string
          timeout_ms?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string[] | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          execution_id?: string
          id?: string
          idempotency_key?: string
          input_data?: Json | null
          is_parallel?: boolean | null
          max_retries?: number | null
          output_data?: Json | null
          parallel_group?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          step_code?: string
          step_index?: number
          step_type?: string
          timeout_ms?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_ghl_config: {
        Row: {
          created_at: string | null
          ghl_api_key_encrypted: string | null
          ghl_location_id: string | null
          ghl_webhook_secret: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          sync_contacts: boolean | null
          sync_messages: boolean | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          ghl_api_key_encrypted?: string | null
          ghl_location_id?: string | null
          ghl_webhook_secret?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_contacts?: boolean | null
          sync_messages?: boolean | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          ghl_api_key_encrypted?: string | null
          ghl_location_id?: string | null
          ghl_webhook_secret?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_contacts?: boolean | null
          sync_messages?: boolean | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ghl_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
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
      workspace_labor_rates: {
        Row: {
          created_at: string | null
          description: string | null
          hourly_rate: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_labor_rates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_layout_config: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          section_order: string[] | null
          updated_at: string
          visible_sections: string[]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          section_order?: string[] | null
          updated_at?: string
          visible_sections?: string[]
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          section_order?: string[] | null
          updated_at?: string
          visible_sections?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_layout_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
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
          created_by_admin: string | null
          custom_business_type: string | null
          id: string
          process_description: string | null
          requires_onboarding: boolean | null
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
          created_by_admin?: string | null
          custom_business_type?: string | null
          id?: string
          process_description?: string | null
          requires_onboarding?: boolean | null
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
          created_by_admin?: string | null
          custom_business_type?: string | null
          id?: string
          process_description?: string | null
          requires_onboarding?: boolean | null
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
      workspace_settings: {
        Row: {
          created_at: string
          id: string
          ip_restrictions_enabled: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_restrictions_enabled?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_restrictions_enabled?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_stripe_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          stripe_account_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key_encrypted: string | null
          stripe_webhook_secret_encrypted: string | null
          test_mode: boolean | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          test_mode?: boolean | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          stripe_account_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          test_mode?: boolean | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_stripe_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
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
          company_iban: string | null
          company_name: string | null
          company_status: string | null
          county: string | null
          created_at: string
          default_activity_profile_id: string | null
          facebook_url: string | null
          fax: string | null
          founding_date: string | null
          id: string
          instagram_url: string | null
          legal_nature: string | null
          linkedin_url: string | null
          logo_url: string | null
          managed_by_workspace_id: string | null
          name: string
          owner_id: string | null
          parish: string | null
          payment_info: string | null
          phone: string | null
          racius_url: string | null
          region: string | null
          signature_name: string | null
          signature_title: string | null
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
          company_iban?: string | null
          company_name?: string | null
          company_status?: string | null
          county?: string | null
          created_at?: string
          default_activity_profile_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          instagram_url?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          managed_by_workspace_id?: string | null
          name: string
          owner_id?: string | null
          parish?: string | null
          payment_info?: string | null
          phone?: string | null
          racius_url?: string | null
          region?: string | null
          signature_name?: string | null
          signature_title?: string | null
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
          company_iban?: string | null
          company_name?: string | null
          company_status?: string | null
          county?: string | null
          created_at?: string
          default_activity_profile_id?: string | null
          facebook_url?: string | null
          fax?: string | null
          founding_date?: string | null
          id?: string
          instagram_url?: string | null
          legal_nature?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          managed_by_workspace_id?: string | null
          name?: string
          owner_id?: string | null
          parish?: string | null
          payment_info?: string | null
          phone?: string | null
          racius_url?: string | null
          region?: string | null
          signature_name?: string | null
          signature_title?: string | null
          slug?: string
          status?: string | null
          tax_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_default_activity_profile_id_fkey"
            columns: ["default_activity_profile_id"]
            isOneToOne: false
            referencedRelation: "activity_profiles"
            referencedColumns: ["id"]
          },
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
      acquire_agent_lock: {
        Args: {
          p_agent_type: string
          p_entity_id: string
          p_job_id?: string
          p_ttl_seconds?: number
          p_workspace_id: string
        }
        Returns: Json
      }
      add_module_credits: {
        Args: {
          p_credits: number
          p_is_extra?: boolean
          p_module_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      add_workspace_member_admin: {
        Args: {
          p_role?: Database["public"]["Enums"]["workspace_role"]
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      advance_journey_stage: {
        Args: {
          p_conversation_id: string
          p_new_stage_code: string
          p_trigger_data?: Json
          p_trigger_type?: string
        }
        Returns: Json
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
      check_agent_rate_limit: {
        Args: {
          p_agent_type: string
          p_entity_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      check_custom_field_unique_value: {
        Args: { p_custom_field_id: string; p_entity_id: string; p_value: Json }
        Returns: boolean
      }
      check_invoice_settings_access: {
        Args: { check_workspace_id: string }
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
      check_workflow_idempotency: {
        Args: { p_idempotency_key: string; p_workspace_id: string }
        Returns: {
          already_executed: boolean
          executed_at: string
          result_data: Json
          result_status: string
        }[]
      }
      check_workspace_quota: {
        Args: { p_resource_type: string; p_workspace_id: string }
        Returns: Json
      }
      checkpoint_workflow_execution: {
        Args: { p_context: Json; p_execution_id: string; p_step_index: number }
        Returns: undefined
      }
      cleanup_expired_agent_memory: { Args: never; Returns: number }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_expired_sso_tokens: { Args: never; Returns: undefined }
      complete_objective: {
        Args: {
          p_collected_value: string
          p_conversation_id: string
          p_lead_id?: string
          p_objective_id: string
        }
        Returns: Json
      }
      consolidate_entity_memories: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_workspace_id: string
        }
        Returns: number
      }
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
      create_workspace_for_user: {
        Args: {
          p_name: string
          p_owner_user_id: string
          p_plan?: string
          p_slug: string
        }
        Returns: Json
      }
      create_workspace_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: Json
      }
      format_response_for_channel: {
        Args: { p_channel: string; p_response: string; p_workspace_id: string }
        Returns: Json
      }
      generate_invoice_number: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      generate_workflow_idempotency_key: {
        Args: {
          p_entity_id: string
          p_execution_id: string
          p_step_code: string
        }
        Returns: string
      }
      get_agent_funnel_metrics: {
        Args: {
          p_agent_type?: string
          p_end_date?: string
          p_start_date?: string
          p_workspace_id: string
        }
        Returns: {
          acceptance_rate: number
          accepted: number
          agent_type: string
          dismissed: number
          executed: number
          execution_rate: number
          generated: number
          outcome_rate: number
          outcomes_positive: number
          view_rate: number
          viewed: number
        }[]
      }
      get_applicable_rules: {
        Args: {
          p_channel?: string
          p_flow_id?: string
          p_persona_id?: string
          p_workspace_id: string
        }
        Returns: {
          action_config: Json
          action_message: string | null
          action_type: string
          condition_description: string | null
          condition_type: string
          condition_value: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          rule_type: Database["public"]["Enums"]["conversation_rule_type"]
          scope: Database["public"]["Enums"]["conversation_rule_scope"]
          scope_entity_id: string | null
          tags: string[] | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "conversation_rules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_autopilot_config: {
        Args: {
          p_channel?: string
          p_persona_id?: string
          p_workspace_id: string
        }
        Returns: {
          accept_files: boolean
          accept_images: boolean
          accept_voice: boolean
          auto_reactivate: boolean
          channel: string | null
          config_scope: string
          cooldown_after_limit: number | null
          created_at: string
          created_by: string | null
          id: string
          image_analysis_enabled: boolean | null
          is_active: boolean
          max_consecutive_bot_messages: number | null
          max_messages_per_conversation: number
          max_messages_per_hour: number | null
          out_of_hours_message: string | null
          persona_id: string | null
          reactivation_hours: number | null
          reactivation_message: string | null
          require_human_after_escalation: boolean | null
          respect_working_hours: boolean | null
          response_delay_max: number
          response_delay_min: number
          sleep_on_human_reply: boolean
          timezone: string | null
          typing_indicator: boolean
          updated_at: string
          voice_transcription_enabled: boolean | null
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "autopilot_config"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_channel_config: {
        Args: { p_channel: string; p_workspace_id: string }
        Returns: Json
      }
      get_entity_memory_stats: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_workspace_id: string
        }
        Returns: Json
      }
      get_module_trial_status: {
        Args: { p_module_id: string; p_workspace_id: string }
        Returns: Json
      }
      get_next_objective: {
        Args: {
          p_conversation_id: string
          p_lead_id?: string
          p_persona_id?: string
          p_workspace_id: string
        }
        Returns: {
          crm_field: string
          objective_code: string
          objective_id: string
          objective_name: string
          prompt_template: string
          sort_pos: number
        }[]
      }
      get_or_create_prospecting_usage: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          profiles_analyzed_count: number
          profiles_analyzed_limit: number
          searches_count: number
          searches_limit: number
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "professional_prospecting_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_persona_decision_config: {
        Args: { p_persona_id: string }
        Returns: Json
      }
      get_plan_limits: {
        Args: { p_plan: Database["public"]["Enums"]["subscription_plan"] }
        Returns: Json
      }
      get_sj_permission: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: string
      }
      get_source_priority: { Args: { source_type: string }; Returns: number }
      get_upcoming_renewals: {
        Args: { days_ahead?: number }
        Returns: {
          assigned_to: string
          company_name: string
          contact_name: string
          days_until_renewal: number
          mrr_amount: number
          opportunity_id: string
          renewal_date: string
          subscription_id: string
          workspace_id: string
        }[]
      }
      get_user_calendar_ids: { Args: never; Returns: string[] }
      get_user_workspace_ids: { Args: never; Returns: string[] }
      get_vibe_instructions: {
        Args: { p_vibe_profile_id: string }
        Returns: string
      }
      get_workspace_stripe_config: {
        Args: { p_workspace_id: string }
        Returns: {
          is_active: boolean
          stripe_secret_key: string
          stripe_webhook_secret: string
          test_mode: boolean
        }[]
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
      has_sj_module_access: {
        Args: { p_user_id: string; p_workspace_id: string }
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
      init_conversation_journey: {
        Args: {
          p_conversation_id: string
          p_lead_id?: string
          p_workspace_id: string
        }
        Returns: string
      }
      initialize_workspace_activity_profiles: {
        Args: { p_created_by?: string; p_workspace_id: string }
        Returns: undefined
      }
      is_calendar_owner: { Args: { cal_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { p_feature_key: string; p_workspace_id: string }
        Returns: boolean
      }
      is_metodopare_member: {
        Args: { check_workspace_id: string }
        Returns: boolean
      }
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
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
      log_memory_access: {
        Args: {
          p_access_type: string
          p_execution_id: string
          p_memory_id: string
          p_relevance_score?: number
        }
        Returns: string
      }
      match_historical_outcomes: {
        Args: {
          filter_outcome?: string
          filter_workspace_id: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          entity_snapshot: Json
          failure_factors: string[]
          id: string
          lessons_learned: string
          outcome: string
          outcome_reason: string
          outcome_value: number
          similarity: number
          source_entity_id: string
          source_entity_type: string
          success_factors: string[]
        }[]
      }
      match_knowledge_entries: {
        Args: {
          filter_knowledge_base_id?: string
          filter_status?: string
          filter_workspace_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          created_at: string
          entry_type: string
          id: string
          keywords: string[]
          knowledge_base_id: string
          question: string
          similarity: number
          status: string
          title: string
          usage_count: number
        }[]
      }
      rag_hybrid_search: {
        Args: {
          filter_workspace_id: string
          keyword_weight?: number
          match_count?: number
          query_embedding: string
          query_text: string
          semantic_weight?: number
        }
        Returns: {
          chunk_content: string
          chunk_metadata: Json
          combined_score: number
          keyword_score: number
          semantic_score: number
          source_id: string
          source_table: string
        }[]
      }
      release_agent_lock: {
        Args: {
          p_agent_type: string
          p_entity_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      remove_workspace_member_admin: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: Json
      }
      retrieve_entity_memories: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_include_strategic?: boolean
          p_max_results?: number
          p_min_relevance?: number
          p_query_embedding?: string
          p_workspace_id: string
        }
        Returns: {
          combined_score: number
          content: string
          created_at: string
          id: string
          is_validated: boolean
          memory_category: string
          memory_type: string
          relevance_score: number
          semantic_score: number
          version: number
        }[]
      }
      revoke_module_sessions: {
        Args: {
          p_module_id: string
          p_revoked_by?: string
          p_workspace_id: string
        }
        Returns: number
      }
      should_bot_respond: {
        Args: { p_conversation_id: string; p_workspace_id: string }
        Returns: Json
      }
      sj_match_profile_to_contact: {
        Args: { p_profile_id: string }
        Returns: string
      }
      start_module_trial: {
        Args: {
          p_module_id: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      store_entity_memory: {
        Args: {
          p_content: string
          p_created_by?: string
          p_entity_id: string
          p_entity_type: string
          p_expires_in_days?: number
          p_memory_category?: string
          p_memory_type: string
          p_relevance_score?: number
          p_source_execution_id?: string
          p_workspace_id: string
        }
        Returns: string
      }
      supersede_memory: {
        Args: {
          p_created_by?: string
          p_new_content: string
          p_old_memory_id: string
        }
        Returns: string
      }
      update_user_status_admin: {
        Args: { p_status: string; p_user_id: string }
        Returns: Json
      }
      update_workspace_member_role_admin: {
        Args: {
          p_new_role: Database["public"]["Enums"]["workspace_role"]
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      upsert_cache_metrics: {
        Args: {
          p_agent_type: string
          p_cache_hit: boolean
          p_latency_ms?: number
          p_tokens_saved?: number
          p_workspace_id: string
        }
        Returns: undefined
      }
      validate_memory: {
        Args: {
          p_is_valid: boolean
          p_memory_id: string
          p_validated_by?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_profile_type:
        | "formacao_educacao"
        | "produtos"
        | "servicos_financeiros"
        | "marketing_digital"
        | "avencas_contratos"
        | "servicos_profissionais"
        | "generico"
        | "custom"
      agent_trigger:
        | "manual"
        | "entity_created"
        | "status_changed"
        | "time_based"
        | "message_received"
      analytics_confidence: "low" | "medium" | "high"
      analytics_event_type:
        | "recommendation_generated"
        | "recommendation_viewed"
        | "recommendation_accepted"
        | "recommendation_dismissed"
        | "recommendation_rated"
        | "action_executed"
        | "entity_outcome_updated"
        | "agent_run_failed"
        | "rag_retrieval_quality"
      analytics_priority: "low" | "medium" | "high"
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
      billing_cycle:
        | "weekly"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
      billing_frequency:
        | "weekly"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "yearly"
      billing_type: "one_time" | "recurring"
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
      conversation_rule_scope: "workspace" | "ai_persona" | "flow" | "channel"
      conversation_rule_type: "DO" | "DONT" | "STOP" | "REDIRECT"
      crm_entity_type: "contacts" | "opportunities"
      crm_view_mode: "table" | "board"
      execution_status: "pending" | "running" | "completed" | "failed"
      feed_type: "workspace" | "team" | "user" | "client"
      flow_condition_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "greater_than"
        | "less_than"
        | "is_empty"
        | "is_not_empty"
        | "matches_intent"
      flow_status: "draft" | "active" | "paused" | "archived"
      flow_step_type:
        | "message"
        | "question"
        | "condition"
        | "action"
        | "goal"
        | "handoff"
      goal_period:
        | "daily"
        | "weekly"
        | "monthly"
        | "annual"
        | "quarterly"
        | "semiannual"
      goal_status: "not_started" | "in_progress" | "completed" | "failed"
      integration_mode: "embed" | "redirect" | "headless"
      job_status: "pending" | "running" | "completed" | "failed" | "cancelled"
      opportunity_subscription_status:
        | "draft"
        | "active"
        | "paused"
        | "past_due"
        | "canceled"
      payment_method_type:
        | "stripe"
        | "bank_transfer"
        | "check"
        | "cash"
        | "other"
      payment_provider: "stripe" | "manual" | "other"
      post_type:
        | "update"
        | "help_request"
        | "daily_checklist"
        | "winners"
        | "ai_alert"
      session_status: "active" | "completed" | "abandoned" | "handed_off"
      sso_token_status: "pending" | "active" | "used" | "expired" | "revoked"
      student_journey_stage:
        | "lead"
        | "inscrito"
        | "ativo"
        | "concluido"
        | "inativo"
        | "churn"
      subscription_event_type:
        | "created"
        | "payment_succeeded"
        | "payment_failed"
        | "paused"
        | "resumed"
        | "canceled"
        | "renewed"
        | "plan_changed"
        | "manual_adjustment"
      subscription_plan: "free" | "basic" | "pro" | "agency"
      subscription_status:
        | "draft"
        | "active"
        | "paused"
        | "cancelled"
        | "expired"
        | "past_due"
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
      activity_profile_type: [
        "formacao_educacao",
        "produtos",
        "servicos_financeiros",
        "marketing_digital",
        "avencas_contratos",
        "servicos_profissionais",
        "generico",
        "custom",
      ],
      agent_trigger: [
        "manual",
        "entity_created",
        "status_changed",
        "time_based",
        "message_received",
      ],
      analytics_confidence: ["low", "medium", "high"],
      analytics_event_type: [
        "recommendation_generated",
        "recommendation_viewed",
        "recommendation_accepted",
        "recommendation_dismissed",
        "recommendation_rated",
        "action_executed",
        "entity_outcome_updated",
        "agent_run_failed",
        "rag_retrieval_quality",
      ],
      analytics_priority: ["low", "medium", "high"],
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
      billing_cycle: [
        "weekly",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
      ],
      billing_frequency: [
        "weekly",
        "monthly",
        "quarterly",
        "semi_annual",
        "yearly",
      ],
      billing_type: ["one_time", "recurring"],
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
      conversation_rule_scope: ["workspace", "ai_persona", "flow", "channel"],
      conversation_rule_type: ["DO", "DONT", "STOP", "REDIRECT"],
      crm_entity_type: ["contacts", "opportunities"],
      crm_view_mode: ["table", "board"],
      execution_status: ["pending", "running", "completed", "failed"],
      feed_type: ["workspace", "team", "user", "client"],
      flow_condition_operator: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "is_empty",
        "is_not_empty",
        "matches_intent",
      ],
      flow_status: ["draft", "active", "paused", "archived"],
      flow_step_type: [
        "message",
        "question",
        "condition",
        "action",
        "goal",
        "handoff",
      ],
      goal_period: [
        "daily",
        "weekly",
        "monthly",
        "annual",
        "quarterly",
        "semiannual",
      ],
      goal_status: ["not_started", "in_progress", "completed", "failed"],
      integration_mode: ["embed", "redirect", "headless"],
      job_status: ["pending", "running", "completed", "failed", "cancelled"],
      opportunity_subscription_status: [
        "draft",
        "active",
        "paused",
        "past_due",
        "canceled",
      ],
      payment_method_type: [
        "stripe",
        "bank_transfer",
        "check",
        "cash",
        "other",
      ],
      payment_provider: ["stripe", "manual", "other"],
      post_type: [
        "update",
        "help_request",
        "daily_checklist",
        "winners",
        "ai_alert",
      ],
      session_status: ["active", "completed", "abandoned", "handed_off"],
      sso_token_status: ["pending", "active", "used", "expired", "revoked"],
      student_journey_stage: [
        "lead",
        "inscrito",
        "ativo",
        "concluido",
        "inativo",
        "churn",
      ],
      subscription_event_type: [
        "created",
        "payment_succeeded",
        "payment_failed",
        "paused",
        "resumed",
        "canceled",
        "renewed",
        "plan_changed",
        "manual_adjustment",
      ],
      subscription_plan: ["free", "basic", "pro", "agency"],
      subscription_status: [
        "draft",
        "active",
        "paused",
        "cancelled",
        "expired",
        "past_due",
      ],
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
