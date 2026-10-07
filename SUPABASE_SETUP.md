# Supabase Setup

## 1. Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open the local URL shown by Vite, usually `http://localhost:5173`.

If you do not set Supabase environment variables, the app runs in local fallback mode using `localStorage`.

## 2. Configure Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Paste the SQL from `supabase-schema.sql` into the Supabase SQL Editor and run it.

## 3. What this schema gives you

1. Auth-owned `profiles`, `seeker_profiles`, and `worker_profiles` tables.
2. Automatic profile row creation when a user signs up.
3. Row-level security policies that keep personal rows private and public listing data readable.
4. Tables for requests, message threads, messages, and reviews so the backend is ready for the full product flow.

## 4. Manual Supabase steps still needed

1. Enable email/password auth in Supabase Auth.
2. Make sure your local `.env.local` is not committed.
3. If you want requests, messages, and reviews to leave localStorage and use Supabase fully, the app code still needs a follow-up wiring pass for those features.

## 5. Recommended production checks

1. Create a test account and confirm signup writes a profile row.
2. Confirm onboarding saves a seeker or worker profile.
3. Confirm public worker/search pages still load as expected.
