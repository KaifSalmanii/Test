import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  bw_price: number;
  color_price: number;
  delivery_charge: number;
  auto_print: boolean;
  color_ink: boolean;
  status: 'active' | 'warning' | 'banned';
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone?: string;
  pages: number;
  print_type: 'bw' | 'color';
  amount: number;
  status: 'pending' | 'printed' | 'delivered';
  payment_method: 'paytm' | 'upi' | 'cash';
  payment_status: 'paid' | 'pending';
  delivery: boolean;
  delivery_address?: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  shop_id: string;
  type: string;
  description: string;
  impressions: number;
  active: boolean;
}
