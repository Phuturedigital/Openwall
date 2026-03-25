import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  city: string | null;
  area: string | null;
  daily_request_limit: number;
  role: string;
  user_type: string;
  verified: boolean;
  profession: string | null;
  skills: string[];
  bio: string | null;
  portfolio: FileAttachment[];
  experience: string | null;
  industry: string | null;
  service_category: string | null;
  services_offered: string[];
  work_mode: string | null;
  looking_for: string[];
  help_needed: string[];
  intent: string | null;
  discovery_preference: string | null;
  post_visibility: string;
  last_active: string;
  created_at: string;
};

export type PublicNote = {
  id: string;
  title: string | null;
  body: string;
  category: string | null;
  budget: number | null;
  city: string | null;
  area: string | null;
  work_mode: string | null;
  prio: boolean;
  prioritised_until: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  is_currently_prioritised: boolean;
  is_owner: boolean;
  poster_name: string | null;
  poster_profession: string | null;
  unlock_count: number;
};

export type FileAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export type ContactInfo = {
  email?: string;
  phone?: string;
};

export type Note = {
  id: string;
  user_id: string;
  body: string;
  title: string | null;
  budget: number | null;
  city: string | null;
  category: string | null;
  files: FileAttachment[];
  contact: ContactInfo | null;
  prio: boolean;
  color: string;
  daily_request_count: number;
  last_request_reset: string;
  status: 'open' | 'in_progress' | 'fulfilled' | 'deleted';
  created_at: string;
  updated_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  profiles?: Profile;
};

export type ConnectionRequest = {
  id: string;
  note_id: string;
  freelancer_id: string;
  status: 'pending' | 'approved' | 'declined' | 'closed';
  notified: boolean;
  notification_read: boolean;
  created_at: string;
  notes?: Note;
  profiles?: Profile;
};

export type Unlock = {
  id: string;
  note_id: string;
  freelancer_id: string;
  payment_status: 'paid' | 'pending' | 'failed';
  created_at: string;
  notes?: Note;
};

export type Transaction = {
  id: string;
  user_id: string;
  note_id: string | null;
  amount: number;
  kind: 'unlock' | 'prio';
  status: 'pending' | 'paid' | 'failed';
  stripe_id: string | null;
  created_at: string;
};
