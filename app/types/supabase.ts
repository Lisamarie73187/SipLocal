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
          display_name: string | null
          id: string
          is_admin: boolean
          preferred_city_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          preferred_city_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          preferred_city_id?: string | null
          updated_at?: string
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
          max_venues: number
          started_at: string | null
          status: Database["public"]["Enums"]["scrape_job_status"]
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
          max_venues?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
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
          max_venues?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["scrape_job_status"]
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
      venues: {
        Row: {
          address_line1: string
          address_line2: string | null
          city_id: string
          created_at: string
          data_status: Database["public"]["Enums"]["venue_data_status"]
          description: string | null
          featured_until: string | null
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
          scrape_content_hash: string | null
          scraped_city: string | null
          scraped_zip: string | null
          slug: string
          updated_at: string
          website_url: string | null
          yelp_id: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city_id: string
          created_at?: string
          data_status?: Database["public"]["Enums"]["venue_data_status"]
          description?: string | null
          featured_until?: string | null
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
          scrape_content_hash?: string | null
          scraped_city?: string | null
          scraped_zip?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
          yelp_id?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city_id?: string
          created_at?: string
          data_status?: Database["public"]["Enums"]["venue_data_status"]
          description?: string | null
          featured_until?: string | null
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
          scrape_content_hash?: string | null
          scraped_city?: string | null
          scraped_zip?: string | null
          slug?: string
          updated_at?: string
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
    }
    Enums: {
      deal_category: "drinks" | "food" | "both" | "other"
      happy_hour_data_status: "live" | "pending_review" | "flagged"
      scrape_confidence: "high" | "medium" | "low"
      scrape_job_status: "pending" | "running" | "complete" | "failed"
      venue_data_status:
        | "live"
        | "pending_review"
        | "no_happy_hour_found"
        | "flagged"
      venue_price_level: "$" | "$$" | "$$$"
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
      happy_hour_data_status: ["live", "pending_review", "flagged"],
      scrape_confidence: ["high", "medium", "low"],
      scrape_job_status: ["pending", "running", "complete", "failed"],
      venue_data_status: [
        "live",
        "pending_review",
        "no_happy_hour_found",
        "flagged",
      ],
      venue_price_level: ["$", "$$", "$$$"],
    },
  },
} as const
