/*
  # Create projects and collaboration tables

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text)
      - `code` (text)
      - `language` (text)
      - `version` (text)
      - `user_id` (text) - Clerk user ID
      - `is_public` (boolean)
      - `share_token` (text, unique, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `collaborators`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `user_id` (text) - Clerk user ID
      - `permission` (enum: 'view', 'edit')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own projects
    - Add policies for collaborators to access shared projects
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  code text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'javascript',
  version text NOT NULL DEFAULT 'latest',
  user_id text NOT NULL,
  is_public boolean DEFAULT false,
  share_token text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  permission text CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Public projects are viewable by everyone"
  ON projects FOR SELECT
  USING (is_public = true);

CREATE POLICY "Shared projects are viewable by token"
  ON projects FOR SELECT
  USING (share_token IS NOT NULL);

-- Collaborators policies
CREATE POLICY "Users can view collaborations on their projects"
  ON collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = collaborators.project_id 
      AND projects.user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can manage collaborators on their projects"
  ON collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = collaborators.project_id 
      AND projects.user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Collaborators can view their collaborations"
  ON collaborators FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token);
CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();