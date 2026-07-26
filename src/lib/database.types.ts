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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      delivery_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: number
          notes: string | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: never
          notes?: string | null
          request_id: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: never
          notes?: string | null
          request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "distribution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: number
          last_error: string | null
          locked_at: string | null
          next_attempt_at: string
          notification_id: number
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          text_body: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id: number
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          text_body: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: never
          last_error?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          notification_id?: number
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          text_body?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_requests: {
        Row: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          decision_note: string | null
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          address: string
          assigned_driver_id?: string | null
          box_weight_lbs: number
          created_at?: string
          decision_note?: string | null
          email: string
          household_size: number
          id?: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number?: number
          season_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_driver_id?: string | null
          box_weight_lbs?: number
          created_at?: string
          decision_note?: string | null
          email?: string
          household_size?: number
          id?: string
          instructions?: string
          owner_id?: string
          phone?: string
          recipient_name?: string
          request_number?: number
          season_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_applications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "distribution_requests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_applications: {
        Row: {
          created_at: string
          decision_note: string | null
          email: string
          id: string
          name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_note?: string | null
          email: string
          id?: string
          name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_note?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          kind: string
          message: string
          read_at: string | null
          request_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          message: string
          read_at?: string | null
          request_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          message?: string
          read_at?: string | null
          request_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "distribution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          accepting_requests: boolean
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          accepting_requests?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          accepting_requests?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_season: {
        Args: {
          season_ends_on: string
          season_name: string
          season_starts_on: string
        }
        Returns: {
          accepting_requests: boolean
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bulk_assign_deliveries: {
        Args: { target_driver_id: string; target_request_ids: string[] }
        Returns: Database["public"]["Tables"]["distribution_requests"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      bulk_approve_driver_applications: {
        Args: { target_user_ids: string[] }
        Returns: Database["public"]["Tables"]["driver_applications"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "driver_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      bulk_set_request_status: {
        Args: {
          new_status: Database["public"]["Enums"]["request_status"]
          target_request_ids: string[]
        }
        Returns: Database["public"]["Tables"]["distribution_requests"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_request_intake: {
        Args: { accepting_requests: boolean }
        Returns: {
          accepting_requests: boolean
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_delivery: {
        Args: { target_driver_id: string; target_request_id: string }
        Returns: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_delivery: {
        Args: { target_request_id: string }
        Returns: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_email_outbox: {
        Args: { batch_size?: number }
        Returns: Database["public"]["Tables"]["email_outbox"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_email_outbox: {
        Args: { resend_message_id: string; target_outbox_id: number }
        Returns: undefined
      }
      email_delivery_summary: {
        Args: never
        Returns: { failed: number; pending: number; sent: number }[]
      }
      deny_driver_application: {
        Args: { denial_reason: string; target_user_id: string }
        Returns: Database["public"]["Tables"]["driver_applications"]["Row"]
        SetofOptions: {
          from: "*"
          to: "driver_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deny_request: {
        Args: { denial_reason: string; target_request_id: string }
        Returns: Database["public"]["Tables"]["distribution_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_email_outbox: {
        Args: { failure_message: string; target_outbox_id: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_driver: { Args: { candidate?: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: { Args: { target_notification_id: number }; Returns: undefined }
      set_delivery_status: {
        Args: {
          next_status: Database["public"]["Enums"]["request_status"]
          status_note?: string
          target_request_id: string
        }
        Returns: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_request_details: {
        Args: {
          new_address: string
          new_email: string
          new_household_size: number
          new_instructions: string
          new_phone: string
          new_recipient_name: string
          requested_box_weight_lbs: number
          target_request_id: string
        }
        Returns: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unclaim_delivery: {
        Args: { target_request_id: string }
        Returns: {
          address: string
          assigned_driver_id: string | null
          box_weight_lbs: number
          created_at: string
          email: string
          household_size: number
          id: string
          instructions: string
          owner_id: string
          phone: string
          recipient_name: string
          request_number: number
          season_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "distribution_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      driver_application_status: "pending" | "approved" | "denied"
      request_status:
        | "submitted"
        | "under_review"
        | "approved"
        | "driver_assigned"
        | "heading_to_pickup"
        | "picked_up"
        | "out_for_delivery"
        | "delivered"
        | "not_delivered"
        | "denied"
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
      driver_application_status: ["pending", "approved", "denied"],
      request_status: [
        "submitted",
        "under_review",
        "approved",
        "driver_assigned",
        "heading_to_pickup",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "not_delivered",
        "denied",
      ],
    },
  },
} as const
