import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
          plan: string;
          is_active: boolean;
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
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
