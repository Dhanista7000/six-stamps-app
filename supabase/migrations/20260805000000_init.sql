-- supabase/migrations/20260805000000_init.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now() not null
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. Game Config (single row)
create table game_config (
  id integer primary key default 1 check (id = 1),
  stamps_required integer default 6 not null,
  card_validity_days integer default 30 not null,
  code_ttl_hours integer default 24 not null,
  daily_claim_cap integer default 2 not null
);
alter table game_config enable row level security;
create policy "Anyone can read game config" on game_config for select to public using (true);
-- Insert default config
insert into game_config (id, stamps_required, card_validity_days, code_ttl_hours, daily_claim_cap) values (1, 6, 30, 24, 2);

-- 3. Stamp Codes (pre-generated pool)
create table stamp_codes (
  code text primary key,
  outlet_id text not null,
  issued_at timestamptz not null default now(),
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  constraint single_use unique (claimed_by, code) -- Or just rely on claimed_by IS NULL before claiming
);
-- Enforce single-use by ensuring claimed_by is unique across claims? No, code is primary key, it can only have one claimed_by.
-- The spec says: "unique constraint on the code row's claimed-by field". That means a single user can't claim the same code? A code can only have one claimed_by anyway.
alter table stamp_codes enable row level security;
create policy "Users can read own claims" on stamp_codes for select using (auth.uid() = claimed_by);
-- No direct insert/update from client

-- 4. Cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null,
  is_completed boolean default false not null,
  reward_claimed boolean default false not null
);
alter table cards enable row level security;
create policy "Users can read own cards" on cards for select using (auth.uid() = user_id);

-- 5. Card Stamps
create table card_stamps (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) not null,
  stamp_slot integer not null,
  code text references stamp_codes(code) not null,
  claimed_at timestamptz default now() not null,
  unique (card_id, stamp_slot),
  unique (code) -- one code per stamp globally
);
alter table card_stamps enable row level security;
create policy "Users can read own stamps" on card_stamps for select using (
  exists (select 1 from cards where cards.id = card_stamps.card_id and cards.user_id = auth.uid())
);

-- 6. Reward Options
create table reward_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  is_active boolean default true not null
);
alter table reward_options enable row level security;
create policy "Anyone can read active reward options" on reward_options for select using (is_active = true);
insert into reward_options (name, description) values ('Triple-Decker', 'Free Triple-Decker Pizza');

-- 7. Rewards (issued to users)
create table rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  card_id uuid references cards(id) not null,
  reward_option_id uuid references reward_options(id) not null,
  redemption_code text unique not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_outlet text
);
alter table rewards enable row level security;
create policy "Users can read own rewards" on rewards for select using (auth.uid() = user_id);

-- 8. Claim Stamp RPC (Security Definer)
create or replace function claim_stamp(p_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_code_row stamp_codes%rowtype;
  v_config game_config%rowtype;
  v_today_claims int;
  v_card cards%rowtype;
  v_next_slot int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- 1. Check code exists and TTL and not claimed
  select * into v_code_row from stamp_codes where code = p_code for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid code');
  end if;

  if v_code_row.claimed_by is not null then
    return jsonb_build_object('success', false, 'error', 'Code already claimed');
  end if;

  select * into v_config from game_config where id = 1;

  if now() > v_code_row.issued_at + (v_config.code_ttl_hours || ' hours')::interval then
    return jsonb_build_object('success', false, 'error', 'Code expired');
  end if;

  -- 2. Daily claim cap
  select count(*) into v_today_claims from stamp_codes 
  where claimed_by = v_user_id and claimed_at > current_date;
  
  if v_today_claims >= v_config.daily_claim_cap then
    return jsonb_build_object('success', false, 'error', 'Daily claim cap reached');
  end if;

  -- 3. Get or create active card
  select * into v_card from cards 
  where user_id = v_user_id and is_completed = false and expires_at > now()
  order by created_at desc limit 1;

  if not found then
    insert into cards (user_id, expires_at) 
    values (v_user_id, now() + (v_config.card_validity_days || ' days')::interval)
    returning * into v_card;
  end if;

  -- 4. Determine next slot
  select coalesce(max(stamp_slot), 0) + 1 into v_next_slot from card_stamps where card_id = v_card.id;
  
  if v_next_slot > v_config.stamps_required then
    return jsonb_build_object('success', false, 'error', 'Card already full'); -- should not happen as it would be marked completed
  end if;

  -- 5. Mark code claimed
  update stamp_codes set claimed_by = v_user_id, claimed_at = now() where code = p_code;

  -- 6. Insert stamp
  insert into card_stamps (card_id, stamp_slot, code) values (v_card.id, v_next_slot, p_code);

  -- 7. Check completion
  if v_next_slot = v_config.stamps_required then
    update cards set is_completed = true where id = v_card.id;
  end if;

  return jsonb_build_object(
    'success', true, 
    'card_id', v_card.id, 
    'slot', v_next_slot, 
    'is_completed', v_next_slot = v_config.stamps_required
  );
end;
$$;

-- Helper to handle user creation automatically
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
