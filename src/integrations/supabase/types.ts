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
      fixtures: {
        Row: {
          away_school_id: string
          away_score: number | null
          created_at: string
          festival_id: string | null
          home_school_id: string
          home_score: number | null
          id: string
          is_derby: boolean | null
          is_visible: boolean | null
          match_date: string
          round_name: string | null
          season: string
          sport: string
          status: string
          updated_at: string
          venue: string
          year: number
        }
        Insert: {
          away_school_id: string
          away_score?: number | null
          created_at?: string
          festival_id?: string | null
          home_school_id: string
          home_score?: number | null
          id?: string
          is_derby?: boolean | null
          is_visible?: boolean | null
          match_date: string
          round_name?: string | null
          season: string
          sport?: string
          status?: string
          updated_at?: string
          venue: string
          year: number
        }
        Update: {
          away_school_id?: string
          away_score?: number | null
          created_at?: string
          festival_id?: string | null
          home_school_id?: string
          home_score?: number | null
          id?: string
          is_derby?: boolean | null
          is_visible?: boolean | null
          match_date?: string
          round_name?: string | null
          season?: string
          sport?: string
          status?: string
          updated_at?: string
          venue?: string
          year?: number
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          id: string
          score: number
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pool_members: {
        Row: {
          id: string
          joined_at: string | null
          pool_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          pool_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          pool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_school_votes: {
        Row: {
          created_at: string | null
          id: string
          pool_id: string
          school_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pool_id: string
          school_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pool_id?: string
          school_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_school_votes_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          schools: string[]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          schools: string[]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          schools?: string[]
        }
        Relationships: []
      }
      pools: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          invite_code: string
          is_active: boolean | null
          max_schools: number | null
          name: string
          schools: string[] | null
          updated_at: string | null
          voting_mode: boolean | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          invite_code: string
          is_active?: boolean | null
          max_schools?: number | null
          name: string
          schools?: string[] | null
          updated_at?: string | null
          voting_mode?: boolean | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          invite_code?: string
          is_active?: boolean | null
          max_schools?: number | null
          name?: string
          schools?: string[] | null
          updated_at?: string | null
          voting_mode?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_method: string
          contact_value: string
          created_at: string
          first_name: string
          id: string
          school_name: string
          updated_at: string
          user_type: string
        }
        Insert: {
          contact_method: string
          contact_value: string
          created_at?: string
          first_name: string
          id: string
          school_name: string
          updated_at?: string
          user_type: string
        }
        Update: {
          contact_method?: string
          contact_value?: string
          created_at?: string
          first_name?: string
          id?: string
          school_name?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      school_scores: {
        Row: {
          average_points: number | null
          created_at: string | null
          id: string
          rank: number | null
          school_name: string
          season_year: number
          total_users: number | null
          updated_at: string | null
          week_number: number
        }
        Insert: {
          average_points?: number | null
          created_at?: string | null
          id?: string
          rank?: number | null
          school_name: string
          season_year: number
          total_users?: number | null
          updated_at?: string | null
          week_number: number
        }
        Update: {
          average_points?: number | null
          created_at?: string | null
          id?: string
          rank?: number | null
          school_name?: string
          season_year?: number
          total_users?: number | null
          updated_at?: string | null
          week_number?: number
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          province: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          province?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          province?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at: string | null
          id: string
          season_year: number
          user_id: string
          week_number: number | null
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          earned_at?: string | null
          id?: string
          season_year: number
          user_id: string
          week_number?: number | null
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          earned_at?: string | null
          id?: string
          season_year?: number
          user_id?: string
          week_number?: number | null
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
      user_scores: {
        Row: {
          accuracy_percentage: number | null
          created_at: string | null
          id: string
          predictions_correct: number | null
          predictions_made: number | null
          rank_global: number | null
          rank_province: number | null
          rank_school: number | null
          season_points: number | null
          season_year: number
          updated_at: string | null
          user_id: string
          week_number: number
          weekly_points: number | null
        }
        Insert: {
          accuracy_percentage?: number | null
          created_at?: string | null
          id?: string
          predictions_correct?: number | null
          predictions_made?: number | null
          rank_global?: number | null
          rank_province?: number | null
          rank_school?: number | null
          season_points?: number | null
          season_year: number
          updated_at?: string | null
          user_id: string
          week_number: number
          weekly_points?: number | null
        }
        Update: {
          accuracy_percentage?: number | null
          created_at?: string | null
          id?: string
          predictions_correct?: number | null
          predictions_made?: number | null
          rank_global?: number | null
          rank_province?: number | null
          rank_school?: number | null
          season_points?: number | null
          season_year?: number
          updated_at?: string | null
          user_id?: string
          week_number?: number
          weekly_points?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pool_creator: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      is_pool_member: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      badge_type:
        | "top_dog"
        | "podium_place"
        | "climber"
        | "consistent_contender"
        | "school_hero"
        | "perfect_weekend"
        | "derby_winner"
        | "streak_master"
      leaderboard_type: "global" | "school" | "province" | "pool"
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
      app_role: ["admin", "moderator", "user"],
      badge_type: [
        "top_dog",
        "podium_place",
        "climber",
        "consistent_contender",
        "school_hero",
        "perfect_weekend",
        "derby_winner",
        "streak_master",
      ],
      leaderboard_type: ["global", "school", "province", "pool"],
    },
  },
} as const
