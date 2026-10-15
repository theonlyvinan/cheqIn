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
      access_log: {
        Row: {
          action: string
          check_in_id: string | null
          created_at: string
          id: string
          senior_user_id: string
          viewer_user_id: string
        }
        Insert: {
          action: string
          check_in_id?: string | null
          created_at?: string
          id?: string
          senior_user_id: string
          viewer_user_id: string
        }
        Update: {
          action?: string
          check_in_id?: string | null
          created_at?: string
          id?: string
          senior_user_id?: string
          viewer_user_id?: string
        }
        Relationships: []
      }
      caregiver_assignments: {
        Row: {
          caregiver_user_id: string
          created_at: string
          id: string
          org_id: string
          senior_user_id: string
        }
        Insert: {
          caregiver_user_id: string
          created_at?: string
          id?: string
          org_id: string
          senior_user_id: string
        }
        Update: {
          caregiver_user_id?: string
          created_at?: string
          id?: string
          org_id?: string
          senior_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          audio_summary_generated_at: string | null
          audio_summary_text: string | null
          audio_summary_url: string | null
          audio_url: string | null
          concerns: Json | null
          created_at: string | null
          emotions: Json | null
          highlights: Json | null
          id: string
          mental_health_score: number | null
          mental_indicators: Json | null
          mood_rating: number | null
          notes: string | null
          overall_score: number | null
          pain_level: number | null
          physical_health_score: number | null
          physical_indicators: Json | null
          sentiment_label: string | null
          sentiment_score: number | null
          sleep_quality: number | null
          transcript: string
          user_id: string
        }
        Insert: {
          audio_summary_generated_at?: string | null
          audio_summary_text?: string | null
          audio_summary_url?: string | null
          audio_url?: string | null
          concerns?: Json | null
          created_at?: string | null
          emotions?: Json | null
          highlights?: Json | null
          id?: string
          mental_health_score?: number | null
          mental_indicators?: Json | null
          mood_rating?: number | null
          notes?: string | null
          overall_score?: number | null
          pain_level?: number | null
          physical_health_score?: number | null
          physical_indicators?: Json | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          sleep_quality?: number | null
          transcript: string
          user_id: string
        }
        Update: {
          audio_summary_generated_at?: string | null
          audio_summary_text?: string | null
          audio_summary_url?: string | null
          audio_url?: string | null
          concerns?: Json | null
          created_at?: string | null
          emotions?: Json | null
          highlights?: Json | null
          id?: string
          mental_health_score?: number | null
          mental_indicators?: Json | null
          mood_rating?: number | null
          notes?: string | null
          overall_score?: number | null
          pain_level?: number | null
          physical_health_score?: number | null
          physical_indicators?: Json | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          sleep_quality?: number | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          email: string | null
          family_user_id: string | null
          id: string
          name: string
          phone: string | null
          receive_alerts: boolean | null
          relationship: string | null
          senior_user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          family_user_id?: string | null
          id?: string
          name: string
          phone?: string | null
          receive_alerts?: boolean | null
          relationship?: string | null
          senior_user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          family_user_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          receive_alerts?: boolean | null
          relationship?: string | null
          senior_user_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          id: string
          medication_id: string | null
          notes: string | null
          taken_at: string | null
          user_id: string
          was_taken: boolean
        }
        Insert: {
          id?: string
          medication_id?: string | null
          notes?: string | null
          taken_at?: string | null
          user_id: string
          was_taken: boolean
        }
        Update: {
          id?: string
          medication_id?: string | null
          notes?: string | null
          taken_at?: string | null
          user_id?: string
          was_taken?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          time_of_day: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          time_of_day?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          time_of_day?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          org_id: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_seniors: {
        Row: {
          consent_status: string
          consented_at: string | null
          created_at: string
          id: string
          org_id: string
          senior_user_id: string
        }
        Insert: {
          consent_status?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          org_id: string
          senior_user_id: string
        }
        Update: {
          consent_status?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          org_id?: string
          senior_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_seniors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          mental_health_issues: string | null
          phone: string | null
          physical_health_issues: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          mental_health_issues?: string | null
          phone?: string | null
          physical_health_issues?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          mental_health_issues?: string | null
          phone?: string | null
          physical_health_issues?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          created_at: string
          delivery_time: string
          enabled: boolean
          family_member_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_time?: string
          enabled?: boolean
          family_member_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_time?: string
          enabled?: boolean
          family_member_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_settings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: true
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invite: { Args: { _token: string }; Returns: string }
      can_view_org_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      can_view_senior: {
        Args: { _senior: string; _viewer: string }
        Returns: boolean
      }
      create_organization: {
        Args: { _address: string; _name: string; _phone: string }
        Returns: string
      }
      is_org_manager: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      join_organization_by_code: { Args: { _code: string }; Returns: string }
      my_pending_invites: {
        Args: never
        Returns: {
          org_name: string
          role: string
          token: string
        }[]
      }
      set_my_center_consent: { Args: { _approve: boolean }; Returns: undefined }
    }
    Enums: {
      org_role: "org_manager" | "org_caregiver"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      org_role: ["org_manager", "org_caregiver"],
    },
  },
} as const
