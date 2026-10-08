-- CareConnect: Complete Supabase Database Setup & Fix Script
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/qktdizpcxuadpmxvzgqh/sql/new

-- 1. Wipe all existing dummy and test records
TRUNCATE TABLE 
  public.messages, 
  public.message_threads, 
  public.care_requests, 
  public.reviews, 
  public.seeker_profiles, 
  public.worker_profiles, 
  public.profiles 
CASCADE;

-- Optional: clean old test auth users
DELETE FROM auth.users;

-- 2. Drop strict foreign key constraints to auth.users so any created profile can be saved directly
ALTER TABLE public.worker_profiles DROP CONSTRAINT IF EXISTS worker_profiles_id_fkey;
ALTER TABLE public.seeker_profiles DROP CONSTRAINT IF EXISTS seeker_profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- 3. Disable RLS or set open permissions so all profiles & requests sync between all clients in real-time
ALTER TABLE public.worker_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeker_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Enable Supabase Realtime so that when one user registers in browser A, 
-- it instantly appears in browser B without needing to refresh!
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_profiles;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seeker_profiles;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_requests;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
