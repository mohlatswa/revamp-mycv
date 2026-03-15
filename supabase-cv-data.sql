-- ======================================================================
-- Revamp MyCV — CV Data Persistence
-- Run this SQL in your Supabase SQL Editor to add CV data storage.
-- This allows all user CV data to be saved to the database for
-- admin review, cross-device access, and data persistence.
-- ======================================================================

-- CV Data table — stores each user's complete CV form data as JSONB
CREATE TABLE public.cv_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text DEFAULT 'My CV',
    template text DEFAULT 'classic',
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups by user
CREATE INDEX idx_cv_data_user_id ON public.cv_data(user_id);
CREATE INDEX idx_cv_data_active ON public.cv_data(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.cv_data ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- RLS Policies: CV Data
-- ======================================================================

-- Users can read their own CV data
CREATE POLICY "read own cv_data" ON public.cv_data
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own CV data
CREATE POLICY "insert own cv_data" ON public.cv_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own CV data
CREATE POLICY "update own cv_data" ON public.cv_data
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own CV data
CREATE POLICY "delete own cv_data" ON public.cv_data
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can read ALL CV data (for review)
CREATE POLICY "admin read all cv_data" ON public.cv_data
    FOR SELECT USING (public.is_admin());

-- Admins can update ALL CV data
CREATE POLICY "admin update all cv_data" ON public.cv_data
    FOR UPDATE USING (public.is_admin());

-- ======================================================================
-- Auto-update updated_at timestamp
-- ======================================================================
CREATE OR REPLACE FUNCTION public.update_cv_data_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cv_data_updated_at
    BEFORE UPDATE ON public.cv_data
    FOR EACH ROW EXECUTE FUNCTION public.update_cv_data_timestamp();
