-- ======================================================================
-- Revamp MyCV — Fix Super Admin Role
-- Run this SQL in your Supabase SQL Editor to ensure both admin
-- emails have super_admin role.
-- ======================================================================

-- Promote mohlatswa96@gmail.com to super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'mohlatswa96@gmail.com';

-- Also ensure hennie.mohlatswa@outlook.com remains super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'hennie.mohlatswa@outlook.com';

-- Verify the changes
SELECT email, role, created_at FROM public.profiles
WHERE role = 'super_admin';
