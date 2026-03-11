-- ======================================================================
-- Revamp MyCV — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the required tables.
-- ======================================================================

-- Downloads tracking
CREATE TABLE public.downloads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Subscriptions
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    paystack_reference text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    plan text DEFAULT 'monthly',
    amount integer DEFAULT 4900,
    started_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- User profiles — server-side role management (prevents role spoofing)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    full_name text,
    role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    suspended boolean DEFAULT false,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- Helper function: check if current user is admin
-- ======================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ======================================================================
-- Auto-create profile on signup (role always 'user' — prevents spoofing)
-- ======================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================================================
-- RLS Policies: Downloads
-- ======================================================================
CREATE POLICY "read own downloads" ON public.downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own downloads" ON public.downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin read all downloads" ON public.downloads
    FOR SELECT USING (public.is_admin());

-- ======================================================================
-- RLS Policies: Subscriptions
-- ======================================================================
CREATE POLICY "read own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own subscription" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own subscription" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admin read all subscriptions" ON public.subscriptions
    FOR SELECT USING (public.is_admin());

CREATE POLICY "admin update all subscriptions" ON public.subscriptions
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin insert subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (public.is_admin());

-- ======================================================================
-- RLS Policies: Profiles
-- ======================================================================

-- Users can read their own profile
CREATE POLICY "read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own name only (not role, not suspended)
CREATE POLICY "update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        suspended = (SELECT suspended FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can read all profiles
CREATE POLICY "admin read all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- Admins can update all profiles (set roles, suspend users)
CREATE POLICY "admin update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin());
