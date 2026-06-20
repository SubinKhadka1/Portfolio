-- Portfolio Admin Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  project_type TEXT NOT NULL CHECK (project_type IN ('design', 'video', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (designs, videos, clients)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('design', 'video', 'client')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_published ON projects(published);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public read: published projects & all categories
CREATE POLICY "public_read_published_projects" ON projects
  FOR SELECT USING (published = true);

CREATE POLICY "public_read_categories" ON categories
  FOR SELECT USING (true);

-- Authenticated admin: full access
CREATE POLICY "admin_all_projects" ON projects
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket (run in Supabase Dashboard > Storage, or via SQL):
-- 1. Create bucket: portfolio-media (public)
-- 2. Policies:
--    SELECT: public
--    INSERT/UPDATE/DELETE: authenticated

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-media', 'portfolio-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-media');

CREATE POLICY "admin_upload_storage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "admin_update_storage" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'portfolio-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "admin_delete_storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'portfolio-media' AND auth.role() = 'authenticated'
  );

-- Default categories
INSERT INTO categories (name, slug, project_type) VALUES
  ('Social Media', 'social-media', 'design'),
  ('Flyers & Posters', 'flyers-posters', 'design'),
  ('Branding', 'branding', 'design'),
  ('Commercial', 'commercial', 'video'),
  ('Social Reels', 'social-reels', 'video'),
  ('Motion Graphics', 'motion-graphics', 'video'),
  ('Partners', 'partners', 'client')
ON CONFLICT (slug) DO NOTHING;
