-- CareConnect Supabase schema
-- Paste this script into the Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text not null default '',
    phone text not null default '',
    city text not null default '',
    area text not null default '',
    role text check (role in ('seeker', 'worker')),
    profile_id uuid unique,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.seeker_profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text not null,
    phone text not null,
    city text not null,
    area text not null,
    care_for text not null check (care_for in ('self', 'parent', 'spouse', 'relative', 'other')),
    persons jsonb not null default '[]'::jsonb,
    timing jsonb not null default '[]'::jsonb,
    days jsonb not null default '[]'::jsonb,
    notes text not null default '',
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.worker_profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text not null,
    phone text not null,
    city text not null,
    area text not null,
    gender text not null check (gender in ('male', 'female', 'other')),
    age integer not null check (age between 18 and 80),
    languages jsonb not null default '[]'::jsonb,
    experience text not null check (experience in ('fresher', '1-2', '3-5', '5+')),
    skills jsonb not null default '[]'::jsonb,
    availability_type jsonb not null default '[]'::jsonb,
    hours_min integer not null check (hours_min between 1 and 24),
    hours_max integer not null check (hours_max between 1 and 24),
    rate_min integer not null check (rate_min >= 0),
    rate_max integer not null check (rate_max >= 0),
    payment_methods jsonb not null default '[]'::jsonb,
    service_areas jsonb not null default '[]'::jsonb,
    contact_method text not null,
    bio text not null default '',
    days jsonb not null default '[]'::jsonb,
    rating numeric(3,2) not null default 0,
    reviews jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.care_requests (
    id uuid primary key default gen_random_uuid(),
    worker_id uuid not null references public.worker_profiles(id) on delete cascade,
    seeker_id uuid not null references public.seeker_profiles(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'responded', 'hired', 'completed')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    unique (worker_id, seeker_id)
);

create table if not exists public.message_threads (
    id uuid primary key default gen_random_uuid(),
    pair_key text not null unique,
    seeker_id uuid not null references public.seeker_profiles(id) on delete cascade,
    worker_id uuid not null references public.worker_profiles(id) on delete cascade,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    unique (seeker_id, worker_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references public.message_threads(id) on delete cascade,
    sender_id uuid not null references auth.users on delete cascade,
    content text not null,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    worker_id uuid not null references public.worker_profiles(id) on delete cascade,
    seeker_id uuid not null references public.seeker_profiles(id) on delete cascade,
    rating integer not null check (rating between 1 and 5),
    comment text not null default '',
    seeker_name text not null default '',
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_city_idx on public.profiles(city);
create index if not exists seeker_profiles_city_idx on public.seeker_profiles(city);
create index if not exists seeker_profiles_area_idx on public.seeker_profiles(area);
create index if not exists worker_profiles_city_idx on public.worker_profiles(city);
create index if not exists worker_profiles_area_idx on public.worker_profiles(area);
create index if not exists worker_profiles_rating_idx on public.worker_profiles(rating desc);
create index if not exists care_requests_worker_idx on public.care_requests(worker_id);
create index if not exists care_requests_seeker_idx on public.care_requests(seeker_id);
create index if not exists message_threads_worker_idx on public.message_threads(worker_id);
create index if not exists message_threads_seeker_idx on public.message_threads(seeker_id);
create index if not exists messages_thread_idx on public.messages(thread_id);
create index if not exists reviews_worker_idx on public.reviews(worker_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_seeker_profiles_updated_at on public.seeker_profiles;
create trigger set_seeker_profiles_updated_at
before update on public.seeker_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_worker_profiles_updated_at on public.worker_profiles;
create trigger set_worker_profiles_updated_at
before update on public.worker_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_care_requests_updated_at on public.care_requests;
create trigger set_care_requests_updated_at
before update on public.care_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_message_threads_updated_at on public.message_threads;
create trigger set_message_threads_updated_at
before update on public.message_threads
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, phone, city, area)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'phone', ''),
        coalesce(new.raw_user_meta_data->>'city', ''),
        coalesce(new.raw_user_meta_data->>'area', '')
    )
    on conflict (id) do update
    set full_name = excluded.full_name,
            phone = excluded.phone,
            city = excluded.city,
            area = excluded.area,
            updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.seeker_profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.care_requests enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Seekers are publicly readable" on public.seeker_profiles;
create policy "Seekers are publicly readable"
on public.seeker_profiles
for select
using (true);

drop policy if exists "Seekers are insertable by owner" on public.seeker_profiles;
create policy "Seekers are insertable by owner"
on public.seeker_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Seekers are updatable by owner" on public.seeker_profiles;
create policy "Seekers are updatable by owner"
on public.seeker_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Workers are publicly readable" on public.worker_profiles;
create policy "Workers are publicly readable"
on public.worker_profiles
for select
using (true);

drop policy if exists "Workers are insertable by owner" on public.worker_profiles;
create policy "Workers are insertable by owner"
on public.worker_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Workers are updatable by owner" on public.worker_profiles;
create policy "Workers are updatable by owner"
on public.worker_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Care requests are readable by participants" on public.care_requests;
create policy "Care requests are readable by participants"
on public.care_requests
for select
to authenticated
using (auth.uid() = seeker_id or auth.uid() = worker_id);

drop policy if exists "Care requests are creatable by seeker" on public.care_requests;
create policy "Care requests are creatable by seeker"
on public.care_requests
for insert
to authenticated
with check (auth.uid() = seeker_id);

drop policy if exists "Care requests are updatable by participants" on public.care_requests;
create policy "Care requests are updatable by participants"
on public.care_requests
for update
to authenticated
using (auth.uid() = seeker_id or auth.uid() = worker_id)
with check (auth.uid() = seeker_id or auth.uid() = worker_id);

drop policy if exists "Threads are readable by participants" on public.message_threads;
create policy "Threads are readable by participants"
on public.message_threads
for select
to authenticated
using (auth.uid() = seeker_id or auth.uid() = worker_id);

drop policy if exists "Threads are creatable by participants" on public.message_threads;
create policy "Threads are creatable by participants"
on public.message_threads
for insert
to authenticated
with check (auth.uid() = seeker_id or auth.uid() = worker_id);

drop policy if exists "Threads are updatable by participants" on public.message_threads;
create policy "Threads are updatable by participants"
on public.message_threads
for update
to authenticated
using (auth.uid() = seeker_id or auth.uid() = worker_id)
with check (auth.uid() = seeker_id or auth.uid() = worker_id);

drop policy if exists "Messages are readable by participants" on public.messages;
create policy "Messages are readable by participants"
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.message_threads t
        where t.id = messages.thread_id
            and (t.seeker_id = auth.uid() or t.worker_id = auth.uid())
    )
);

drop policy if exists "Messages are insertable by participants" on public.messages;
create policy "Messages are insertable by participants"
on public.messages
for insert
to authenticated
with check (
    sender_id = auth.uid()
    and exists (
        select 1
        from public.message_threads t
        where t.id = messages.thread_id
            and (t.seeker_id = auth.uid() or t.worker_id = auth.uid())
    )
);

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Reviews are publicly readable"
on public.reviews
for select
using (true);

drop policy if exists "Reviews are insertable by seeker" on public.reviews;
create policy "Reviews are insertable by seeker"
on public.reviews
for insert
to authenticated
with check (auth.uid() = seeker_id);

drop policy if exists "Reviews are updatable by seeker" on public.reviews;
create policy "Reviews are updatable by seeker"
on public.reviews
for update
to authenticated
using (auth.uid() = seeker_id)
with check (auth.uid() = seeker_id);
