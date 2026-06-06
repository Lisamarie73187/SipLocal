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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cities: {
        Row: {
          center_lat: number
          center_lng: number
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          state: string
          timezone: string
          updated_at: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          state: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          state?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          city_id: string
          confidence: Database["public"]["Enums"]["scrape_confidence"] | null
          created_at: string
          day_of_week: number | null
          description: string | null
          end_time: string | null
          event_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_published: boolean
          last_scraped_at: string | null
          last_verified_at: string | null
          source_urls: string[]
          start_time: string
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          city_id: string
          confidence?: Database["public"]["Enums"]["scrape_confidence"] | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_published?: boolean
          last_scraped_at?: string | null
          last_verified_at?: string | null
          source_urls?: string[]
          start_time: string
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          city_id?: string
          confidence?: Database["public"]["Enums"]["scrape_confidence"] | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_published?: boolean
          last_scraped_at?: string | null
          last_verified_at?: string | null
          source_urls?: string[]
          start_time?: string
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      happy_hour_deals: {
        Row: {
          category: Database["public"]["Enums"]["deal_category"]
          created_at: string
          id: string
          label: string
          price_text: string | null
          slot_id: string
          sort_order: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["deal_category"]
          created_at?: string
          id?: string
          label: string
          price_text?: string | null
          slot_id: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["deal_category"]
          created_at?: string
          id?: string
          label?: string
          price_text?: string | null
          slot_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "happy_hour_deals_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "happy_hour_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      happy_hour_slots: {
        Row: {
          categories: Database["public"]["Enums"]["deal_category"][]
          confidence: Database["public"]["Enums"]["scrape_confidence"] | null
          conflicts: Json | null
          created_at: string
          data_status: Database["public"]["Enums"]["happy_hour_data_status"]
          day_of_week: number
          deal_summary: string | null
          end_time: string
          id: string
          is_active: boolean
          last_scraped_at: string | null
          source_urls: string[]
          start_time: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          categories?: Database["public"]["Enums"]["deal_category"][]
          confidence?: Database["public"]["Enums"]["scrape_confidence"] | null
          conflicts?: Json | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["happy_hour_data_status"]
          day_of_week: number
          deal_summary?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          source_urls?: string[]
          start_time: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          categories?: Database["public"]["Enums"]["deal_category"][]
          confidence?: Database["public"]["Enums"]["scrape_confidence"] | null
          conflicts?: Json | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["happy_hour_data_status"]
          day_of_week?: number
          deal_summary?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          source_urls?: string[]
          start_time?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "happy_hour_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: Database["public"]["Enums"]["profile_gender"] | null
          id: string
          is_admin: boolean
          neighborhood_or_zip: string | null
          notify_favorite_updates: boolean
          notify_new_venues_in_city: boolean
          notify_starting_soon: boolean
          preferred_city_id: string | null
          updated_at: string
          visitor_type:
            | Database["public"]["Enums"]["profile_visitor_type"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: Database["public"]["Enums"]["profile_gender"] | null
          id: string
          is_admin?: boolean
          neighborhood_or_zip?: string | null
          notify_favorite_updates?: boolean
          notify_new_venues_in_city?: boolean
          notify_starting_soon?: boolean
          preferred_city_id?: string | null
          updated_at?: string
          visitor_type?:
            | Database["public"]["Enums"]["profile_visitor_type"]
            | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: Database["public"]["Enums"]["profile_gender"] | null
          id?: string
          is_admin?: boolean
          neighborhood_or_zip?: string | null
          notify_favorite_updates?: boolean
          notify_new_venues_in_city?: boolean
          notify_starting_soon?: boolean
          preferred_city_id?: string | null
          updated_at?: string
          visitor_type?:
            | Database["public"]["Enums"]["profile_visitor_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_city_id_fkey"
            columns: ["preferred_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          bounds: Json | null
          city_id: string
          city_slug: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_kind: string
          max_venues: number
          research_targets: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["scrape_job_status"]
          target_venue_ids: string[] | null
          updated_at: string
          venues_found: number
          venues_with_happy_hours: number
          zip: string | null
        }
        Insert: {
          bounds?: Json | null
          city_id: string
          city_slug: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_kind?: string
          max_venues?: number
          research_targets?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
          target_venue_ids?: string[] | null
          updated_at?: string
          venues_found?: number
          venues_with_happy_hours?: number
          zip?: string | null
        }
        Update: {
          bounds?: Json | null
          city_id?: string
          city_slug?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_kind?: string
          max_venues?: number
          research_targets?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
          target_venue_ids?: string[] | null
          updated_at?: string
          venues_found?: number
          venues_with_happy_hours?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_revisions: {
        Row: {
          created_at: string
          id: string
          proposed_confidence:
            | Database["public"]["Enums"]["scrape_confidence"]
            | null
          proposed_deals: Json
          proposed_description: string | null
          proposed_slots: Json
          proposed_source_urls: Json
          research_events_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          scrape_error: string | null
          scrape_job_id: string
          status: Database["public"]["Enums"]["scrape_revision_status"]
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_confidence?:
            | Database["public"]["Enums"]["scrape_confidence"]
            | null
          proposed_deals?: Json
          proposed_description?: string | null
          proposed_slots?: Json
          proposed_source_urls?: Json
          research_events_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scrape_error?: string | null
          scrape_job_id: string
          status?: Database["public"]["Enums"]["scrape_revision_status"]
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_confidence?:
            | Database["public"]["Enums"]["scrape_confidence"]
            | null
          proposed_deals?: Json
          proposed_description?: string | null
          proposed_slots?: Json
          proposed_source_urls?: Json
          research_events_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scrape_error?: string | null
          scrape_job_id?: string
          status?: Database["public"]["Enums"]["scrape_revision_status"]
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_revisions_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_revisions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_claim_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["venue_claim_status"]
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["venue_claim_status"]
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["venue_claim_status"]
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_claim_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_managers: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["venue_manager_role"]
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["venue_manager_role"]
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["venue_manager_role"]
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_managers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_menu_submissions: {
        Row: {
          created_at: string
          id: string
          parsed_slots: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["menu_submission_source"]
          status: Database["public"]["Enums"]["menu_submission_status"]
          storage_path: string
          submitter_lat: number | null
          submitter_lng: number | null
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parsed_slots?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: Database["public"]["Enums"]["menu_submission_source"]
          status?: Database["public"]["Enums"]["menu_submission_status"]
          storage_path: string
          submitter_lat?: number | null
          submitter_lng?: number | null
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parsed_slots?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["menu_submission_source"]
          status?: Database["public"]["Enums"]["menu_submission_status"]
          storage_path?: string
          submitter_lat?: number | null
          submitter_lng?: number | null
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_menu_submissions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_suggestions: {
        Row: {
          city_id: string
          created_at: string
          id: string
          parsed_slots: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["menu_submission_status"]
          storage_path: string
          submitter_lat: number | null
          submitter_lng: number | null
          updated_at: string
          user_id: string
          venue_name: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          parsed_slots?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["menu_submission_status"]
          storage_path: string
          submitter_lat?: number | null
          submitter_lng?: number | null
          updated_at?: string
          user_id: string
          venue_name: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          parsed_slots?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["menu_submission_status"]
          storage_path?: string
          submitter_lat?: number | null
          submitter_lng?: number | null
          updated_at?: string
          user_id?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_suggestions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_line1: string
          address_line2: string | null
          archived_at: string | null
          city_id: string
          community_verified_at: string | null
          created_at: string
          data_status: Database["public"]["Enums"]["venue_data_status"]
          description: string | null
          featured_until: string | null
          happy_hour_menu_storage_path: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          last_scraped_at: string | null
          last_verified_at: string | null
          lat: number
          lng: number
          name: string
          phone: string | null
          place_id: string | null
          postal_code: string | null
          price_level: Database["public"]["Enums"]["venue_price_level"]
          schedule_cadence:
            | Database["public"]["Enums"]["schedule_cadence"]
            | null
          scrape_content_hash: string | null
          scraped_city: string | null
          scraped_zip: string | null
          slug: string
          updated_at: string
          venue_type: Database["public"]["Enums"]["venue_type"] | null
          website_url: string | null
          yelp_id: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          archived_at?: string | null
          city_id: string
          community_verified_at?: string | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["venue_data_status"]
          description?: string | null
          featured_until?: string | null
          happy_hour_menu_storage_path?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          last_scraped_at?: string | null
          last_verified_at?: string | null
          lat: number
          lng: number
          name: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          price_level?: Database["public"]["Enums"]["venue_price_level"]
          schedule_cadence?:
            | Database["public"]["Enums"]["schedule_cadence"]
            | null
          scrape_content_hash?: string | null
          scraped_city?: string | null
          scraped_zip?: string | null
          slug: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
          website_url?: string | null
          yelp_id?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          archived_at?: string | null
          city_id?: string
          community_verified_at?: string | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["venue_data_status"]
          description?: string | null
          featured_until?: string | null
          happy_hour_menu_storage_path?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          last_scraped_at?: string | null
          last_verified_at?: string | null
          lat?: number
          lng?: number
          name?: string
          phone?: string | null
          place_id?: string | null
          postal_code?: string | null
          price_level?: Database["public"]["Enums"]["venue_price_level"]
          schedule_cadence?:
            | Database["public"]["Enums"]["schedule_cadence"]
            | null
          scrape_content_hash?: string | null
          scraped_city?: string | null
          scraped_zip?: string | null
          slug?: string
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["venue_type"] | null
          website_url?: string | null
          yelp_id?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_venue_manager: { Args: { p_venue_id: string }; Returns: boolean }
      is_venue_manager_for_any_managed_venue: { Args: never; Returns: boolean }
    }
    Enums: {
      deal_category: "drinks" | "food" | "both" | "other"
      event_type: "trivia" | "live_music" | "special" | "other"
      happy_hour_data_status: "live" | "pending_review" | "flagged"
      menu_submission_source: "crowd" | "manager"
      menu_submission_status: "pending_review" | "approved" | "rejected"
      profile_gender: "woman" | "man" | "non_binary" | "prefer_not_to_say"
      profile_visitor_type: "local" | "visiting"
      schedule_cadence: "weekly" | "monthly" | "annually" | "seasonally"
      scrape_confidence: "high" | "medium" | "low"
      scrape_job_status: "pending" | "running" | "complete" | "failed"
      scrape_revision_status: "pending_review" | "approved" | "rejected"
      venue_claim_status: "pending" | "approved" | "rejected"
      venue_data_status:
        | "live"
        | "pending_review"
        | "no_happy_hour_found"
        | "flagged"
        | "discovered"
      venue_manager_role: "owner" | "manager"
      venue_price_level: "$" | "$$" | "$$$"
      venue_type:
        | "bar"
        | "brewery"
        | "taproom"
        | "restaurant"
        | "gastropub"
        | "wine_bar"
        | "cocktail_bar"
        | "sports_bar"
        | "pub"
        | "distillery"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      deal_category: ["drinks", "food", "both", "other"],
      event_type: ["trivia", "live_music", "special", "other"],
      happy_hour_data_status: ["live", "pending_review", "flagged"],
      menu_submission_source: ["crowd", "manager"],
      menu_submission_status: ["pending_review", "approved", "rejected"],
      profile_gender: ["woman", "man", "non_binary", "prefer_not_to_say"],
      profile_visitor_type: ["local", "visiting"],
      schedule_cadence: ["weekly", "monthly", "annually", "seasonally"],
      scrape_confidence: ["high", "medium", "low"],
      scrape_job_status: ["pending", "running", "complete", "failed"],
      scrape_revision_status: ["pending_review", "approved", "rejected"],
      venue_claim_status: ["pending", "approved", "rejected"],
      venue_data_status: [
        "live",
        "pending_review",
        "no_happy_hour_found",
        "flagged",
        "discovered",
      ],
      venue_manager_role: ["owner", "manager"],
      venue_price_level: ["$", "$$", "$$$"],
      venue_type: [
        "bar",
        "brewery",
        "taproom",
        "restaurant",
        "gastropub",
        "wine_bar",
        "cocktail_bar",
        "sports_bar",
        "pub",
        "distillery",
      ],
    },
  },
} as const
