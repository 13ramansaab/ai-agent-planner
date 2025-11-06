/*
  # Add competitor data fields to projects table

  1. Schema Changes
    - Add `competitor_links` (text array) to projects table for competitor URLs
    - Add `competitor_reviews` (text array) to projects table for user reviews
  
  2. Notes
    - These fields are optional and will be used by the Competitor & Review Miner agent
    - Default to empty arrays if not provided
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'competitor_links'
  ) THEN
    ALTER TABLE projects ADD COLUMN competitor_links text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'competitor_reviews'
  ) THEN
    ALTER TABLE projects ADD COLUMN competitor_reviews text[] DEFAULT '{}';
  END IF;
END $$;