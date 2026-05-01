import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* variables must be accessed with direct static property access
// so that Next.js/webpack can inline them into the client bundle.
// Dynamic access (process.env[name]) is NOT replaced in the browser bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          cuit: string | null;
          country: string | null;
          city: string | null;
          logo_url: string | null;
          description: string | null;
          theme_mode: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          font_family: string | null;
          font_size: string | null;
          email_cc_admin: boolean | null;
          email_template_header: string | null;
          email_template_footer: string | null;
          plan: string;
          is_active: boolean;
          phone: string | null;
          email: string | null;
          address: string | null;
          data_sharing_consent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["companies"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          full_name: string;
          email: string;
          role: string;
          phone: string | null;
          avatar_url: string | null;
          first_name: string | null;
          last_name: string | null;
          display_name: string | null;
          theme_preference: string | null;
          notification_preferences: Record<string, unknown> | null;
          email_preferences: Record<string, unknown> | null;
          is_active: boolean;
          is_super_admin: boolean;
          is_mantix_admin: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      admin_company_assignments: {
        Row: {
          id: string;
          admin_id: string;
          company_id: string;
          assigned_at: string;
          assigned_by: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["admin_company_assignments"]["Row"], "id" | "assigned_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["admin_company_assignments"]["Insert"]>;
      };
      locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string | null;
          city: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      assets: {
        Row: {
          id: string;
          company_id: string;
          location_id: string | null;
          name: string;
          internal_code: string | null;
          category: string | null;
          status: string;
          criticality: string;
          last_maintenance_at: string | null;
          next_maintenance_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      work_orders: {
        Row: {
          id: string;
          company_id: string;
          asset_id: string | null;
          provider_id: string | null;
          title: string;
          type: string;
          priority: string;
          status: string;
          estimated_cost: number | null;
          actual_cost: number | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      providers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          category: string | null;
          phone: string | null;
          rating: number;
          total_jobs: number;
          is_active: boolean;
          created_at: string;
        };
      };
    };
  };
};
