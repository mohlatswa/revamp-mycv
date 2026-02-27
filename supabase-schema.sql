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

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own rows
CREATE POLICY "read own downloads" ON public.downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own downloads" ON public.downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own subscription" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own subscription" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);
