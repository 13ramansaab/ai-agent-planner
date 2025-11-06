import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Project = {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  competitor_links?: string[];
  competitor_reviews?: string[];
  status: 'draft' | 'planning' | 'completed';
  created_at: string;
  updated_at: string;
};

export type PlanningPhase = {
  id: string;
  project_id: string;
  phase_type: 'competitor' | 'strategy' | 'ux' | 'system' | 'data' | 'api' | 'ui' | 'prompts' | 'critic' | 'composer';
  output: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_used?: string;
  created_at: string;
  completed_at?: string;
};

export type Prompt = {
  id: string;
  project_id: string;
  tool: 'bolt' | 'cursor';
  title: string;
  content: string;
  order: number;
  created_at: string;
};
