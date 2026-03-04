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
      admin_audit_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          campaign_name: string
          clicks: number | null
          created_at: string | null
          display_order: number | null
          expires_at: string | null
          id: string
          image_url: string
          impressions: number | null
          is_active: boolean | null
          link_url: string
          sponsor_name: string
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          clicks?: number | null
          created_at?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          image_url: string
          impressions?: number | null
          is_active?: boolean | null
          link_url: string
          sponsor_name: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          clicks?: number | null
          created_at?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string
          impressions?: number | null
          is_active?: boolean | null
          link_url?: string
          sponsor_name?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          created_at: string
          id: string
          is_derby: boolean | null
          is_visible: boolean | null
          match_date: string
          round_name: string | null
          school_a_id: string
          school_b_id: string
          score_a: number | null
          score_b: number | null
          season: string
          source_url: string | null
          sport: string
          status: string
          tournament_id: string | null
          updated_at: string
          venue_id: string | null
          venue_type: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_derby?: boolean | null
          is_visible?: boolean | null
          match_date: string
          round_name?: string | null
          school_a_id: string
          school_b_id: string
          score_a?: number | null
          score_b?: number | null
          season: string
          source_url?: string | null
          sport?: string
          status?: string
          tournament_id?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_type?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_derby?: boolean | null
          is_visible?: boolean | null
          match_date?: string
          round_name?: string | null
          school_a_id?: string
          school_b_id?: string
          score_a?: number | null
          score_b?: number | null
          season?: string
          source_url?: string | null
          sport?: string
          status?: string
          tournament_id?: string | null
          updated_at?: string
          venue_id?: string | null
          venue_type?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_school_a_id_fkey"
            columns: ["school_a_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_school_b_id_fkey"
            columns: ["school_b_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_editions"
            referencedColumns: ["id"]
          },
        ]
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
      news_articles: {
        Row: {
          created_at: string | null
          display_order: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          starts_at: string | null
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          starts_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          starts_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      parental_consent_requests: {
        Row: {
          child_user_id: string
          consent_token: string
          created_at: string | null
          email_sent_at: string | null
          expires_at: string | null
          first_request_at: string | null
          id: string
          parent_email: string
          parent_user_id: string | null
          request_count: number | null
          status: string
          verified_at: string | null
        }
        Insert: {
          child_user_id: string
          consent_token?: string
          created_at?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          first_request_at?: string | null
          id?: string
          parent_email: string
          parent_user_id?: string | null
          request_count?: number | null
          status?: string
          verified_at?: string | null
        }
        Update: {
          child_user_id?: string
          consent_token?: string
          created_at?: string | null
          email_sent_at?: string | null
          expires_at?: string | null
          first_request_at?: string | null
          id?: string
          parent_email?: string
          parent_user_id?: string | null
          request_count?: number | null
          status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      pool_members: {
        Row: {
          id: string
          is_fake: boolean
          joined_at: string | null
          pool_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_fake?: boolean
          joined_at?: string | null
          pool_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_fake?: boolean
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
          metadata: Json | null
          name: string
          schools: string[]
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          schools: string[]
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          schools?: string[]
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pools: {
        Row: {
          color_id: string | null
          created_at: string | null
          creator_id: string
          icon_id: string | null
          id: string
          invite_code: string
          is_active: boolean | null
          is_fake: boolean
          is_voting_finalized: boolean | null
          max_schools: number | null
          name: string
          schools: string[] | null
          updated_at: string | null
          voting_closes_at: string | null
          voting_mode: boolean | null
        }
        Insert: {
          color_id?: string | null
          created_at?: string | null
          creator_id: string
          icon_id?: string | null
          id?: string
          invite_code: string
          is_active?: boolean | null
          is_fake?: boolean
          is_voting_finalized?: boolean | null
          max_schools?: number | null
          name: string
          schools?: string[] | null
          updated_at?: string | null
          voting_closes_at?: string | null
          voting_mode?: boolean | null
        }
        Update: {
          color_id?: string | null
          created_at?: string | null
          creator_id?: string
          icon_id?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean | null
          is_fake?: boolean
          is_voting_finalized?: boolean | null
          max_schools?: number | null
          name?: string
          schools?: string[] | null
          updated_at?: string | null
          voting_closes_at?: string | null
          voting_mode?: boolean | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          fixture_id: string
          id: string
          is_fake: boolean
          points_earned: number | null
          predicted_margin: number
          predicted_school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fixture_id: string
          id?: string
          is_fake?: boolean
          points_earned?: number | null
          predicted_margin: number
          predicted_school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fixture_id?: string
          id?: string
          is_fake?: boolean
          points_earned?: number | null
          predicted_margin?: number
          predicted_school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_predicted_school_id_fkey"
            columns: ["predicted_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          age_band: string | null
          consent_status: string | null
          contact_method: string
          contact_value: string
          country: string | null
          created_at: string
          display_name: string | null
          first_name: string
          id: string
          is_fake: boolean
          onboarding_completed_at: string | null
          parent_email: string | null
          province: string | null
          school_changed_at: string | null
          school_id: string | null
          school_name_legacy: string | null
          updated_at: string
          user_type: string
          username: string | null
          year_of_birth: number | null
        }
        Insert: {
          account_type?: string | null
          age_band?: string | null
          consent_status?: string | null
          contact_method: string
          contact_value: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name: string
          id: string
          is_fake?: boolean
          onboarding_completed_at?: string | null
          parent_email?: string | null
          province?: string | null
          school_changed_at?: string | null
          school_id?: string | null
          school_name_legacy?: string | null
          updated_at?: string
          user_type: string
          username?: string | null
          year_of_birth?: number | null
        }
        Update: {
          account_type?: string | null
          age_band?: string | null
          consent_status?: string | null
          contact_method?: string
          contact_value?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string
          id?: string
          is_fake?: boolean
          onboarding_completed_at?: string | null
          parent_email?: string | null
          province?: string | null
          school_changed_at?: string | null
          school_id?: string | null
          school_name_legacy?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          year_of_birth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      school_invitations: {
        Row: {
          contact_email: string
          created_at: string
          expires_at: string
          expiry_days: number
          id: string
          otp_attempts: number
          otp_code: string | null
          otp_expires_at: string | null
          otp_verified: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          school_name: string
          status: string
          submitted_at: string | null
          token_hash: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          expires_at?: string
          expiry_days?: number
          id?: string
          otp_attempts?: number
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name: string
          status?: string
          submitted_at?: string | null
          token_hash: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          expires_at?: string
          expiry_days?: number
          id?: string
          otp_attempts?: number
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name?: string
          status?: string
          submitted_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          alias: Json | null
          archived_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          emblem_url: string | null
          established_year: number | null
          icon_url: string | null
          id: string
          invitation_id: string | null
          is_archived: boolean
          is_visible: boolean | null
          jersey_config: Json | null
          jersey_url: string | null
          main_rival: string | null
          motto: string | null
          name: string
          nickname: string | null
          note_to_admin: string | null
          primary_color: string | null
          province: string | null
          request_logo_url: string | null
          school_type: string | null
          secondary_color: string | null
          slug: string
          springboks_count: number | null
          status: string
          submission_metadata: Json | null
          submitted_by_user_id: string | null
          trivia_fact: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          alias?: Json | null
          archived_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          emblem_url?: string | null
          established_year?: number | null
          icon_url?: string | null
          id?: string
          invitation_id?: string | null
          is_archived?: boolean
          is_visible?: boolean | null
          jersey_config?: Json | null
          jersey_url?: string | null
          main_rival?: string | null
          motto?: string | null
          name: string
          nickname?: string | null
          note_to_admin?: string | null
          primary_color?: string | null
          province?: string | null
          request_logo_url?: string | null
          school_type?: string | null
          secondary_color?: string | null
          slug: string
          springboks_count?: number | null
          status?: string
          submission_metadata?: Json | null
          submitted_by_user_id?: string | null
          trivia_fact?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          alias?: Json | null
          archived_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          emblem_url?: string | null
          established_year?: number | null
          icon_url?: string | null
          id?: string
          invitation_id?: string | null
          is_archived?: boolean
          is_visible?: boolean | null
          jersey_config?: Json | null
          jersey_url?: string | null
          main_rival?: string | null
          motto?: string | null
          name?: string
          nickname?: string | null
          note_to_admin?: string | null
          primary_color?: string | null
          province?: string | null
          request_logo_url?: string | null
          school_type?: string | null
          secondary_color?: string | null
          slug?: string
          springboks_count?: number | null
          status?: string
          submission_metadata?: Json | null
          submitted_by_user_id?: string | null
          trivia_fact?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "school_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      springboks: {
        Row: {
          cap_number: number
          craven_week: string | null
          created_at: string
          debut_year: number
          high_school: string
          id: string
          matric_year: string | null
          player_name: string
          sa_schools: string | null
          school_id: string | null
        }
        Insert: {
          cap_number: number
          craven_week?: string | null
          created_at?: string
          debut_year: number
          high_school: string
          id?: string
          matric_year?: string | null
          player_name: string
          sa_schools?: string | null
          school_id?: string | null
        }
        Update: {
          cap_number?: number
          craven_week?: string | null
          created_at?: string
          debut_year?: number
          high_school?: string
          id?: string
          matric_year?: string | null
          player_name?: string
          sa_schools?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "springboks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_editions: {
        Row: {
          created_at: string
          end_date: string
          format_notes: string | null
          host_school: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          province: string | null
          sponsor_logo_url: string | null
          sponsor_name: string | null
          start_date: string
          tournament_id: string
          updated_at: string
          venue: string | null
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          format_notes?: string | null
          host_school?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          province?: string | null
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          start_date: string
          tournament_id: string
          updated_at?: string
          venue?: string | null
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          format_notes?: string | null
          host_school?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          province?: string | null
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          start_date?: string
          tournament_id?: string
          updated_at?: string
          venue?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_editions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      user_reports: {
        Row: {
          created_at: string | null
          id: string
          report_details: string | null
          report_reason: string
          reported_by_user_id: string | null
          reported_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason: string
          reported_by_user_id?: string | null
          reported_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason?: string
          reported_by_user_id?: string | null
          reported_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
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
      user_sanctions: {
        Row: {
          created_at: string | null
          duration_days: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          sanction_type: string
          sanctioned_at: string | null
          sanctioned_by: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          sanction_type: string
          sanctioned_at?: string | null
          sanctioned_by: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          sanction_type?: string
          sanctioned_at?: string | null
          sanctioned_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_school_follows: {
        Row: {
          created_at: string
          id: string
          is_fake: boolean
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fake?: boolean
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fake?: boolean
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_school_follows_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_school_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_school_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tournament_follows: {
        Row: {
          created_at: string | null
          id: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tournament_follows_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          country: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          province: string | null
          school_name: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_prediction_points: {
        Args: { p_fixture_id: string }
        Returns: number
      }
      can_change_parent_email: {
        Args: { p_user_id: string }
        Returns: {
          can_change: boolean
          changes_remaining: number
          next_change_at: string
        }[]
      }
      check_all_members_voted: {
        Args: { pool_id_param: string }
        Returns: boolean
      }
      check_parent_email_limit: { Args: { p_email: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests: number
          p_window_minutes: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      delete_duplicate_fixtures: { Args: never; Returns: number }
      finalize_pool_voting: {
        Args: { pool_id_param: string }
        Returns: undefined
      }
      fixture_match_day: { Args: { ts: string }; Returns: string }
      get_leaderboard_stats:
        | {
            Args: { p_school_id?: string; p_season_year: number }
            Returns: {
              avg_efficiency: number
              picks_correct: number
              picks_made: number
              total_brags: number
              user_id: string
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_school_id?: string
              p_season_year: number
            }
            Returns: {
              avg_efficiency: number
              display_name: string
              picks_correct: number
              picks_made: number
              school_id: string
              school_name: string
              total_brags: number
              user_id: string
            }[]
          }
      get_match_history_batch: {
        Args: { p_fixture_ids: string[] }
        Returns: {
          fixture_id: string
          has_history: boolean
        }[]
      }
      get_next_friday_8pm: { Args: { from_time: string }; Returns: string }
      get_pool_by_invite_code: {
        Args: { code: string }
        Returns: {
          creator_id: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      get_user_season_stats: {
        Args: { p_season_year: number; p_user_id: string }
        Returns: {
          accuracy_pct: number
          current_streak: number
          global_rank: number
          picks_correct: number
          picks_made: number
          school_rank: number
          total_brags: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_click: { Args: { ad_id: string }; Returns: undefined }
      increment_ad_impression: { Args: { ad_id: string }; Returns: undefined }
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
      school_request_status: "pending" | "approved" | "declined"
      school_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "archived"
      school_type: "boys" | "girls" | "co-ed"
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
      school_request_status: ["pending", "approved", "declined"],
      school_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "archived",
      ],
      school_type: ["boys", "girls", "co-ed"],
    },
  },
} as const
