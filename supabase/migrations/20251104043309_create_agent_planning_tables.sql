/*
  # AI Agent Planning System Schema

  ## Overview
  This migration creates the database structure for an AI-powered project planning system
  that breaks down ideas into comprehensive implementation plans.

  ## New Tables

  ### `projects`
  Stores high-level project information and planning sessions
  - `id` (uuid, primary key) - Unique project identifier
  - `user_id` (uuid) - Owner of the project (for future auth integration)
  - `name` (text) - Project name
  - `description` (text) - Initial project idea/brief
  - `status` (text) - Current planning status (draft, planning, completed)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `planning_phases`
  Stores outputs from each specialized agent phase
  - `id` (uuid, primary key) - Unique phase identifier
  - `project_id` (uuid, foreign key) - Reference to parent project
  - `phase_type` (text) - Type of planning phase (strategy, ux, system, data, api, ui, prompts)
  - `output` (jsonb) - Structured JSON output from the agent
  - `status` (text) - Phase status (pending, processing, completed, failed)
  - `model_used` (text) - AI model used for this phase
  - `created_at` (timestamptz) - Creation timestamp
  - `completed_at` (timestamptz) - Completion timestamp

  ### `prompts`
  Stores generated implementation prompts for Bolt/Cursor
  - `id` (uuid, primary key) - Unique prompt identifier
  - `project_id` (uuid, foreign key) - Reference to parent project
  - `tool` (text) - Target tool (bolt, cursor)
  - `title` (text) - Prompt title
  - `content` (text) - Full prompt content
  - `order` (integer) - Execution order
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public read/write policies for demo (will be restricted with auth later)
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create planning_phases table
CREATE TABLE IF NOT EXISTS planning_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_type text NOT NULL,
  output jsonb,
  status text DEFAULT 'pending',
  model_used text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tool text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policies (public for demo, will be restricted with auth)
CREATE POLICY "Public read access to projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public insert access to projects"
  ON projects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public update access to projects"
  ON projects FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete access to projects"
  ON projects FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to planning_phases"
  ON planning_phases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public insert access to planning_phases"
  ON planning_phases FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public update access to planning_phases"
  ON planning_phases FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access to prompts"
  ON prompts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public insert access to prompts"
  ON prompts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_planning_phases_project_id ON planning_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);