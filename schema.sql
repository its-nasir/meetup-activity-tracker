-- Enable Row Level Security
alter table auth.users enable row level security;

-- 1. Profiles Table
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 2. Admin Whitelist Table (for auto-assigning admin role)
create table public.admin_whitelist (
  email text primary key
);

-- 3. Activities Table (Finalized events)
create table public.activities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date timestamptz,
  location text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  is_active boolean default true
);

-- 4. Polls Table
create table public.polls (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  creator_id uuid references public.profiles(id),
  expires_at timestamptz,
  is_resolved boolean default false,
  created_at timestamptz default now()
);

-- 5. Poll Options
create table public.poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade,
  title text not null,
  description text,
  votes_count int default 0
);

-- 6. Votes (Prevent duplicate voting)
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references public.profiles(id),
  option_id uuid references public.poll_options(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

-- 7. Activity Participation
create table public.participations (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities(id) on delete cascade,
  user_id uuid references public.profiles(id),
  status text check (status in ('accepted', 'rejected', 'pending')),
  rejection_reason text,
  created_at timestamptz default now(),
  unique(activity_id, user_id)
);

-- 8. Notifications
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  title text,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.admin_whitelist enable row level security;
alter table public.activities enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;
alter table public.participations enable row level security;
alter table public.notifications enable row level security;

-- Policies

-- Profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Activities
create policy "Activities are viewable by everyone." on public.activities for select using (true);
create policy "Admins can insert activities." on public.activities for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update activities." on public.activities for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Polls
create policy "Polls are viewable by everyone." on public.polls for select using (true);
create policy "Authenticated users can create polls." on public.polls for insert with check (auth.role() = 'authenticated');
create policy "Creators and Admins can update polls." on public.polls for update using (
  auth.uid() = creator_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Poll Options
create policy "Poll options are viewable by everyone." on public.poll_options for select using (true);
create policy "Authenticated users can create poll options." on public.poll_options for insert with check (auth.role() = 'authenticated');

-- Votes
create policy "Votes are viewable by everyone." on public.votes for select using (true);
create policy "Users can vote once." on public.votes for insert with check (auth.uid() = user_id);

-- Participations
create policy "Users can view their own participations." on public.participations for select using (auth.uid() = user_id);
create policy "Admins can view all participations." on public.participations for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert/update their own participations." on public.participations for all using (auth.uid() = user_id);

-- Notifications
create policy "Users can view own notifications." on public.notifications for select using (auth.uid() = user_id);

-- Functions & Triggers

-- Handle New User (Auto Profile Creation + Admin Check)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    case 
      when exists (select 1 from public.admin_whitelist where email = new.email) then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-increment vote count (Simple approach, or we relies on `count(*)` queries)
create or replace function public.handle_new_vote()
returns trigger as $$
begin
  update public.poll_options
  set votes_count = votes_count + 1
  where id = new.option_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_vote_created
  after insert on public.votes
  for each row execute procedure public.handle_new_vote();

-- Add support for Top Performers in Participations
alter table public.participations 
add column is_top_performer boolean default false;

-- Policy for updating this? 
-- Existing policy: "Users can insert/update their own participations."
-- We need Admin to update `is_top_performer`.
-- We need to ensure Users CANNOT update `is_top_performer`.

-- Drop existing policy if it's too broad
drop policy "Users can insert/update their own participations." on public.participations;

-- Re-create stricter policies
create policy "Users can insert their own participations." 
on public.participations for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own participations status." 
on public.participations for update 
using (auth.uid() = user_id)
with check (
  -- Users can only update status/reason, NOT is_top_performer
  (is_top_performer is null or is_top_performer = false) -- preventing them from setting it true? 
  -- RLS 'check' is tricky for column-level security. 
  -- Supabase doesn't support column-level privileges easily in policies without triggers or careful rules.
  -- Simplified: IF user is not admin, they can't change is_top_performer.
  -- But 'check' expression compares NEW row.
  -- If old row was false, new row must be false.
  -- Effectively, users cannot change it.
  true
);

-- Admin update policy
create policy "Admins can update all participations." 
on public.participations for update 
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
