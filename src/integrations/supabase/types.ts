export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          security_answer_1: string | null
          security_answer_2: string | null
          security_answer_3: string | null
          security_question_1: string | null
          security_question_2: string | null
          security_question_3: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          security_answer_1?: string | null
          security_answer_2?: string | null
          security_answer_3?: string | null
          security_question_1?: string | null
          security_question_2?: string | null
          security_question_3?: string | null
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
          parking_instructions: string | null
          property_name: string
          special_notes: string | null
          updated_at: string
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
          parking_instructions?: string | null
          property_name: string
          special_notes?: string | null
          updated_at?: string
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
          parking_instructions?: string | null
          property_name?: string
          special_notes?: string | null
          updated_at?: string
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
          id: string
          role: string
          sms_conversation_id: string
          timestamp: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          sms_conversation_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          created_at?: string
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
          last_interaction_timestamp: string | null
          last_message_type: string | null
          last_recommendations: string | null
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
          last_interaction_timestamp?: string | null
          last_message_type?: string | null
          last_recommendations?: string | null
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
          last_interaction_timestamp?: string | null
          last_message_type?: string | null
          last_recommendations?: string | null
          phone_number?: string
          preferences?: Json | null
          property_confirmed?: boolean | null
          property_id?: string | null
          timezone?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hash_security_answer: {
        Args: { answer: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
