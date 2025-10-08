-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  first_name text not null,
  contact_method text not null check (contact_method in ('email', 'mobile')),
  contact_value text not null,
  user_type text not null check (user_type in ('scholar', 'alumni', 'parent', 'fan')),
  school_name text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, contact_method, contact_value, user_type, school_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'contact_method', 'email'),
    coalesce(new.raw_user_meta_data->>'contact_value', new.email),
    coalesce(new.raw_user_meta_data->>'user_type', 'fan'),
    coalesce(new.raw_user_meta_data->>'school_name', '')
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();