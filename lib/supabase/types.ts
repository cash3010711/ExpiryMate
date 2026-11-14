export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: "owner" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          created_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          household_id: string;
          created_by: string | null;
          type: "food" | "coupon";
          title: string;
          category_or_location: string | null;
          expiry_date: string;
          quantity: number;
          is_opened: boolean;
          barcode_image_url: string | null;
          notes: string | null;
          status: "active" | "consumed" | "discarded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          created_by?: string | null;
          type: "food" | "coupon";
          title: string;
          category_or_location?: string | null;
          expiry_date: string;
          quantity?: number;
          is_opened?: boolean;
          barcode_image_url?: string | null;
          notes?: string | null;
          status?: "active" | "consumed" | "discarded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          created_by?: string | null;
          type?: "food" | "coupon";
          title?: string;
          category_or_location?: string | null;
          expiry_date?: string;
          quantity?: number;
          is_opened?: boolean;
          barcode_image_url?: string | null;
          notes?: string | null;
          status?: "active" | "consumed" | "discarded";
          created_at?: string;
          updated_at?: string;
        };
      };
      line_bindings: {
        Row: {
          id: string;
          household_id: string;
          line_group_id: string | null;
          bound_at: string | null;
          temp_bind_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          line_group_id?: string | null;
          bound_at?: string | null;
          temp_bind_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          line_group_id?: string | null;
          bound_at?: string | null;
          temp_bind_code?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
