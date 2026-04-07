-- =====================================================
-- TaskFlow Pro — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  role          text not null default 'user',   -- 'user' | 'admin'
  reminder_days integer[] not null default '{30,7}',
  notify_email  boolean not null default true,
  notify_sms    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PAYMENT METHODS
create table if not exists public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,       -- 'credit_card' | 'ach' | 'wire' | 'check'
  label      text not null,
  last4      text,
  brand      text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);


-- 3. TASKS
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  vendor            text,
  description       text,
  amount            numeric(12,2),
  due_date          date,
  priority          text not null default 'medium',  -- 'high' | 'medium' | 'low'
  status            text not null default 'pending', -- 'pending' | 'in-progress' | 'completed' | 'cancelled'
  category          text not null default 'payment', -- 'payment' | 'subscription' | 'invoice' | 'domain' | 'tax' | 'insurance' | 'other'
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  reminder_days     integer[] not null default '{30,7}',
  tags              text[] not null default '{}',
  source            text not null default 'manual',  -- 'manual' | 'email'
  email_id          uuid,          -- FK set after emails table is created
  admin_service     boolean not null default false,
  admin_paid        boolean not null default false,
  admin_paid_at     timestamptz,
  admin_paid_by     uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);


-- 4. EMAILS
create table if not exists public.emails (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null default 'manual',  -- 'gmail' | 'outlook' | 'manual'
  subject      text not null,
  from_email   text not null,
  body         text,
  date         date,
  scanned      boolean not null default false,
  task_created boolean not null default false,
  task_id      uuid references public.tasks(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Now add the email FK to tasks
alter table public.tasks
  add constraint tasks_email_id_fkey
  foreign key (email_id) references public.emails(id) on delete set null;


-- 5. NOTIFICATIONS
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null default 'info',  -- 'info' | 'reminder' | 'payment'
  title      text not null,
  message    text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);


-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see/edit their own rows.
-- Admins can see everything.
-- =====================================================

alter table public.profiles        enable row level security;
alter table public.payment_methods enable row level security;
alter table public.tasks           enable row level security;
alter table public.emails          enable row level security;
alter table public.notifications   enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
create policy "Users can view own profile"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid());
create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin());

-- PAYMENT METHODS
create policy "Users manage own payment methods" on public.payment_methods
  for all using (user_id = auth.uid() or public.is_admin());

-- TASKS
create policy "Users manage own tasks" on public.tasks
  for all using (user_id = auth.uid() or public.is_admin());

-- EMAILS
create policy "Users manage own emails" on public.emails
  for all using (user_id = auth.uid() or public.is_admin());

-- NOTIFICATIONS
create policy "Users manage own notifications" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin());


-- =====================================================
-- INDEXES for performance
-- =====================================================
create index if not exists tasks_user_id_idx         on public.tasks(user_id);
create index if not exists tasks_due_date_idx        on public.tasks(due_date);
create index if not exists tasks_status_idx          on public.tasks(status);
create index if not exists tasks_admin_service_idx   on public.tasks(admin_service) where admin_service = true;
create index if not exists emails_user_id_idx        on public.emails(user_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx    on public.notifications(read) where read = false;


-- =====================================================
-- OPTIONAL: Promote a user to admin
-- Replace 'your@email.com' with your actual email
-- =====================================================
-- update public.profiles set role = 'admin' where email = 'your@email.com';


-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
