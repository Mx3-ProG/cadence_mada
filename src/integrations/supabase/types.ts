export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          contact_id: string | null;
          created_at: string;
          description: string | null;
          ends_at: string;
          id: string;
          invite_sent_at: string | null;
          invite_token: string;
          location: string | null;
          owner_id: string;
          owner_notified_at: string | null;
          prep_notes: string | null;
          responded_at: string | null;
          response_message: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at: string;
          id?: string;
          invite_sent_at?: string | null;
          invite_token?: string;
          location?: string | null;
          owner_id: string;
          owner_notified_at?: string | null;
          prep_notes?: string | null;
          responded_at?: string | null;
          response_message?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string;
          id?: string;
          invite_sent_at?: string | null;
          invite_token?: string;
          location?: string | null;
          owner_id?: string;
          owner_notified_at?: string | null;
          prep_notes?: string | null;
          responded_at?: string | null;
          response_message?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          address: string | null;
          birthday: string | null;
          children_count: number | null;
          city: string | null;
          company: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          family_situation: string | null;
          gender: string | null;
          hobbies: string[];
          id: string;
          languages: string[];
          name: string;
          notes: string | null;
          owner_id: string;
          phone: string | null;
          role_title: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          birthday?: string | null;
          children_count?: number | null;
          city?: string | null;
          company?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          family_situation?: string | null;
          gender?: string | null;
          hobbies?: string[];
          id?: string;
          languages?: string[];
          name: string;
          notes?: string | null;
          owner_id: string;
          phone?: string | null;
          role_title?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          birthday?: string | null;
          children_count?: number | null;
          city?: string | null;
          company?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          family_situation?: string | null;
          gender?: string | null;
          hobbies?: string[];
          id?: string;
          languages?: string[];
          name?: string;
          notes?: string | null;
          owner_id?: string;
          phone?: string | null;
          role_title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          business_name: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          google_maps_url: string | null;
          google_rating: number | null;
          google_review_url: string | null;
          google_reviews_count: number | null;
          id: string;
          invite_message: string | null;
          plan: Database["public"]["Enums"]["plan_tier"];
          plan_renews_at: string | null;
          review_prompt_enabled: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          business_name?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          google_maps_url?: string | null;
          google_rating?: number | null;
          google_review_url?: string | null;
          google_reviews_count?: number | null;
          id: string;
          invite_message?: string | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          plan_renews_at?: string | null;
          review_prompt_enabled?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          business_name?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          google_maps_url?: string | null;
          google_rating?: number | null;
          google_review_url?: string | null;
          google_reviews_count?: number | null;
          id?: string;
          invite_message?: string | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          plan_renews_at?: string | null;
          review_prompt_enabled?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_weekly_stats: {
        Row: {
          acceptance_rate: number;
          accepted_count: number;
          appointments_total: number;
          cancelled_count: number;
          contacts_created: number;
          created_at: string;
          declined_count: number;
          id: string;
          invites_sent: number;
          pending_count: number;
          updated_at: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          acceptance_rate?: number;
          accepted_count?: number;
          appointments_total?: number;
          cancelled_count?: number;
          contacts_created?: number;
          created_at?: string;
          declined_count?: number;
          id?: string;
          invites_sent?: number;
          pending_count?: number;
          updated_at?: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          acceptance_rate?: number;
          accepted_count?: number;
          appointments_total?: number;
          cancelled_count?: number;
          contacts_created?: number;
          created_at?: string;
          declined_count?: number;
          id?: string;
          invites_sent?: number;
          pending_count?: number;
          updated_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_plan: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["plan_tier"];
      };
      delete_my_account: { Args: never; Returns: boolean };
      get_invite: {
        Args: { _token: string };
        Returns: {
          business_name: string;
          description: string;
          ends_at: string;
          google_maps_url: string;
          google_rating: number;
          google_review_url: string;
          google_reviews_count: number;
          guest_name: string;
          host_is_pro: boolean;
          host_name: string;
          invite_message: string;
          location: string;
          responded_at: string;
          response_message: string;
          review_prompt_enabled: boolean;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          title: string;
        }[];
      };
      get_plan_usage: {
        Args: never;
        Returns: {
          appointments_this_month: number;
          contacts_count: number;
          is_admin: boolean;
          plan: Database["public"]["Enums"]["plan_tier"];
          plan_renews_at: string;
          subscription_status: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      rebuild_weekly_stats: {
        Args: never;
        Returns: {
          acceptance_rate: number;
          accepted_count: number;
          appointments_total: number;
          cancelled_count: number;
          contacts_created: number;
          declined_count: number;
          invites_sent: number;
          pending_count: number;
          week_start: string;
        }[];
      };
      respond_to_invite: {
        Args: { _accept: boolean; _message?: string; _token: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      appointment_status: "pending" | "accepted" | "declined" | "cancelled";
      plan_tier: "free" | "pro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      appointment_status: ["pending", "accepted", "declined", "cancelled"],
      plan_tier: ["free", "pro"],
    },
  },
} as const;
