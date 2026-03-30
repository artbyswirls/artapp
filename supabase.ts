import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://gowxztpxpzezwsovxuyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvd3h6dHB4cHplendzb3Z4dXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzcwODMsImV4cCI6MjA5MDQxMzA4M30.wgIaA3MmLNSrTtIwBnpnSYMhuuV1ORRWWtaYtiQVaU0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});