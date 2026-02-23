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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academy_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          last_watched_at: string | null
          user_id: string
          video_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string | null
          user_id: string
          video_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string | null
          user_id?: string
          video_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "academy_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_videos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          instructor_name: string | null
          is_free: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          instructor_name?: string | null
          is_free?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          instructor_name?: string | null
          is_free?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          product_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          product_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          product_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          cta_text: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          message: string | null
          starts_at: string | null
          target: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          starts_at?: string | null
          target?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          starts_at?: string | null
          target?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string | null
          id: string
          role: string
          timestamp: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          id: string
          role: string
          timestamp?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          id?: string
          role?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      curated_links: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          location_id: string
          title: string
          updated_at: string
          url: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          location_id: string
          title: string
          updated_at?: string
          url?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string
          title?: string
          updated_at?: string
          url?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_links_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          original_name: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          original_name: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          original_name?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      host_ai_conversations: {
        Row: {
          conversation_context: Json | null
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          conversation_context?: Json | null
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          conversation_context?: Json | null
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string
          created_at: string
          id: string
          lat: number | null
          lon: number | null
          state: string
          zip: string | null
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          state: string
          zip?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          state?: string
          zip?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price_annual: number | null
          price_monthly: number | null
          sort_order: number | null
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          trial_limit: number | null
          trial_type: string | null
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number | null
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          trial_limit?: number | null
          trial_type?: string | null
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number | null
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          trial_limit?: number | null
          trial_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          security_answer_1: string | null
          security_answer_2: string | null
          security_answer_3: string | null
          security_question_1: string | null
          security_question_2: string | null
          security_question_3: string | null
          skip_onboarding: boolean | null
          skipped_onboarding_steps: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
          skip_onboarding?: boolean | null
          skipped_onboarding_steps?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
          skip_onboarding?: boolean | null
          skipped_onboarding_steps?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_instructions: string | null
          address: string
          amenities: Json | null
          check_in_time: string | null
          check_out_time: string | null
          cleaning_instructions: string | null
          code: string
          created_at: string
          directions_to_property: string | null
          emergency_contact: string | null
          house_rules: string | null
          id: string
          knowledge_base: string | null
          local_recommendations: string | null
          management_company_name: string | null
          parking_instructions: string | null
          property_name: string
          service_fees: Json | null
          special_notes: string | null
          updated_at: string
          user_id: string | null
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          access_instructions?: string | null
          address: string
          amenities?: Json | null
          check_in_time?: string | null
          check_out_time?: string | null
          cleaning_instructions?: string | null
          code: string
          created_at?: string
          directions_to_property?: string | null
          emergency_contact?: string | null
          house_rules?: string | null
          id?: string
          knowledge_base?: string | null
          local_recommendations?: string | null
          management_company_name?: string | null
          parking_instructions?: string | null
          property_name: string
          service_fees?: Json | null
          special_notes?: string | null
          updated_at?: string
          user_id?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          access_instructions?: string | null
          address?: string
          amenities?: Json | null
          check_in_time?: string | null
          check_out_time?: string | null
          cleaning_instructions?: string | null
          code?: string
          created_at?: string
          directions_to_property?: string | null
          emergency_contact?: string | null
          house_rules?: string | null
          id?: string
          knowledge_base?: string | null
          local_recommendations?: string | null
          management_company_name?: string | null
          parking_instructions?: string | null
          property_name?: string
          service_fees?: Json | null
          special_notes?: string | null
          updated_at?: string
          user_id?: string | null
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Relationships: []
      }
      property_codes: {
        Row: {
          address: string
          code: string
          created_at: string
          id: string
          property_id: string
          property_name: string
        }
        Insert: {
          address: string
          code: string
          created_at?: string
          id?: string
          property_id: string
          property_name: string
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          id?: string
          property_id?: string
          property_name?: string
        }
        Relationships: []
      }
      recommendation_rejections: {
        Row: {
          conversation_id: string | null
          corrected_content: string | null
          created_at: string | null
          id: string
          mismatched_content: string
          original_message: string
          phone_number: string
          property_id: string | null
          rejection_reason: string
          requested_category: string
          retry_attempted: boolean | null
          retry_successful: boolean | null
          session_metadata: Json | null
          validation_keywords_found: string[] | null
          validation_keywords_missing: string[] | null
        }
        Insert: {
          conversation_id?: string | null
          corrected_content?: string | null
          created_at?: string | null
          id?: string
          mismatched_content: string
          original_message: string
          phone_number: string
          property_id?: string | null
          rejection_reason: string
          requested_category: string
          retry_attempted?: boolean | null
          retry_successful?: boolean | null
          session_metadata?: Json | null
          validation_keywords_found?: string[] | null
          validation_keywords_missing?: string[] | null
        }
        Update: {
          conversation_id?: string | null
          corrected_content?: string | null
          created_at?: string | null
          id?: string
          mismatched_content?: string
          original_message?: string
          phone_number?: string
          property_id?: string | null
          rejection_reason?: string
          requested_category?: string
          retry_attempted?: boolean | null
          retry_successful?: boolean | null
          session_metadata?: Json | null
          validation_keywords_found?: string[] | null
          validation_keywords_missing?: string[] | null
        }
        Relationships: []
      }
      response_quality_ratings: {
        Row: {
          ai_response: string
          created_at: string
          feedback: string | null
          id: string
          property_id: string | null
          rating: string
          test_message: string
          user_id: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          feedback?: string | null
          id?: string
          property_id?: string | null
          rating: string
          test_message: string
          user_id: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          feedback?: string | null
          id?: string
          property_id?: string | null
          rating?: string
          test_message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_quality_ratings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      service_connections: {
        Row: {
          connection_details: Json
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          service_type: string
          store_url: string | null
          sync_status: string | null
          user_id: string
        }
        Insert: {
          connection_details?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          service_type: string
          store_url?: string | null
          sync_status?: string | null
          user_id: string
        }
        Update: {
          connection_details?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          service_type?: string
          store_url?: string | null
          sync_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sms_conversation_messages: {
        Row: {
          content: string
          created_at: string
          external_message_id: string | null
          id: string
          role: string
          sms_conversation_id: string
          timestamp: string
        }
        Insert: {
          content: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          role: string
          sms_conversation_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          role?: string
          sms_conversation_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversation_messages_sms_conversation_id_fkey"
            columns: ["sms_conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_conversations: {
        Row: {
          conversation_context: Json | null
          conversation_state: string
          created_at: string
          id: string
          last_intent: string | null
          last_interaction_timestamp: string | null
          last_message_type: string | null
          last_recommendations: string | null
          last_response: string | null
          phone_number: string
          preferences: Json | null
          property_confirmed: boolean | null
          property_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          conversation_context?: Json | null
          conversation_state?: string
          created_at?: string
          id?: string
          last_intent?: string | null
          last_interaction_timestamp?: string | null
          last_message_type?: string | null
          last_recommendations?: string | null
          last_response?: string | null
          phone_number: string
          preferences?: Json | null
          property_confirmed?: boolean | null
          property_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          conversation_context?: Json | null
          conversation_state?: string
          created_at?: string
          id?: string
          last_intent?: string | null
          last_interaction_timestamp?: string | null
          last_message_type?: string | null
          last_recommendations?: string | null
          last_response?: string | null
          phone_number?: string
          preferences?: Json | null
          property_confirmed?: boolean | null
          property_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_test_results: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          edge_function_version: string | null
          expected_keywords: string[] | null
          expected_not_keywords: string[] | null
          failure_reason: string | null
          id: string
          intent_detected: string | null
          keywords_found: string[] | null
          keywords_missing: string[] | null
          pass_score: number | null
          passed: boolean
          phone_number: string
          property_id: string | null
          response_text: string | null
          response_time_ms: number | null
          test_environment: string | null
          test_message: string
          test_name: string
          test_run_id: string | null
          unexpected_keywords_found: string[] | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          edge_function_version?: string | null
          expected_keywords?: string[] | null
          expected_not_keywords?: string[] | null
          failure_reason?: string | null
          id?: string
          intent_detected?: string | null
          keywords_found?: string[] | null
          keywords_missing?: string[] | null
          pass_score?: number | null
          passed: boolean
          phone_number: string
          property_id?: string | null
          response_text?: string | null
          response_time_ms?: number | null
          test_environment?: string | null
          test_message: string
          test_name: string
          test_run_id?: string | null
          unexpected_keywords_found?: string[] | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          edge_function_version?: string | null
          expected_keywords?: string[] | null
          expected_not_keywords?: string[] | null
          failure_reason?: string | null
          id?: string
          intent_detected?: string | null
          keywords_found?: string[] | null
          keywords_missing?: string[] | null
          pass_score?: number | null
          passed?: boolean
          phone_number?: string
          property_id?: string | null
          response_text?: string | null
          response_time_ms?: number | null
          test_environment?: string | null
          test_message?: string
          test_name?: string
          test_run_id?: string | null
          unexpected_keywords_found?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_test_results_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_test_results_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      snappro_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          optimized_url: string | null
          original_url: string | null
          settings: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          optimized_url?: string | null
          original_url?: string | null
          settings?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          optimized_url?: string | null
          original_url?: string | null
          settings?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_conversations: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          location_json: Json | null
          name: string | null
          phone_number: string
          preferences_json: Json | null
          step: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          location_json?: Json | null
          name?: string | null
          phone_number: string
          preferences_json?: Json | null
          step?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          location_json?: Json | null
          name?: string | null
          phone_number?: string
          preferences_json?: Json | null
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_conversations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          intent_tag: string | null
          role: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          intent_tag?: string | null
          role: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          intent_tag?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "travel_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          access_ends_at: string | null
          access_starts_at: string | null
          created_at: string | null
          grant_note: string | null
          granted_by: string | null
          id: string
          product_id: string
          source: string | null
          status: string
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_usage_count: number | null
          trial_usage_limit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          created_at?: string | null
          grant_note?: string | null
          granted_by?: string | null
          id?: string
          product_id: string
          source?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_usage_count?: number | null
          trial_usage_limit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          created_at?: string | null
          grant_note?: string | null
          granted_by?: string | null
          id?: string
          product_id?: string
          source?: string | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_usage_count?: number | null
          trial_usage_limit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_security_answer: { Args: { answer: string }; Returns: string }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      rpc_get_curated_links: {
        Args: { _categories?: string[]; _location_id: string }
        Returns: {
          category: string
          description: string
          id: string
          title: string
          url: string
          weight: number
        }[]
      }
      rpc_upsert_travel_conversation: {
        Args: {
          _location_id?: string
          _location_json?: Json
          _name?: string
          _phone_number: string
          _preferences_json?: Json
          _step?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
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
    },
  },
} as const
