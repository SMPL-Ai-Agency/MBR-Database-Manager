import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export const initializeClient = (url: string, anonKey: string): SupabaseClient => {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and Anon Key must be provided.');
  }
  supabase = createClient(url, anonKey);
  return supabase;
};

export const getClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase client has not been initialized. Please configure credentials in Settings.');
  }
  return supabase;
};