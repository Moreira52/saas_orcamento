-- Create Squads Table
create table if not exists public.squads (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add Policy for Squads (Allow read to all authenticated, write to admins)
alter table public.squads enable row level security;

create policy "Enable read access for authenticated users"
on public.squads for select
to authenticated
using (true);

create policy "Enable insert access for admins"
on public.squads for insert
to authenticated
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Update Users Table (assuming 'users' is the public profile table linked to auth.users)
-- Note: Check if 'users' table exists as per types/database.ts.
-- Assuming 'users' table exists.

alter table public.users 
add column if not exists avatar_url text,
add column if not exists birth_date date,
add column if not exists squad_id uuid references public.squads(id) on delete set null;

-- Ensure Users can update their own profile
create policy "Users can update their own profile"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
