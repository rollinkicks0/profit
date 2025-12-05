import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Expense {
  id: string;
  shop: string;
  location_name: string;
  amount: number;
  description: string;
  expense_date: string;
  expense_type: 'one-off' | 'recurring';
  category: string;
  created_at: string;
  updated_at: string;
}


