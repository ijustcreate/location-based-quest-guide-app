-- Quest Compass shared backend foundation.
-- This migration separates world definitions from player progress so quests,
-- locations, glyphs, sightings, invites, and rewards can be shared safely.

create extension if not exists pgcrypto;

create type public.app_role as enum ('player', 'admin');
create type public.visibility_level as enum ('private', 'shared', 'public');
create type public.quest_status as enum ('draft', 'active', 'archived');
create type public.progress_status as enum ('locked', 'unlocked', 'in_progress', 'complete');
create type public.glyph_shape as enum ('hollow-triangle', 'hollow-circle', 'hollow-square');
create type public.glyph_color_family as enum ('red', 'green', 'pink', 'blue');
create type public.reward_type as enum ('lore-page', 'creature-card', 'treasure', 'badge', 'artifact', 'puzzle-piece', 'story-fragment', 'resource');
create type public.reward_rarity as enum ('Common', 'Rare', 'Epic', 'Legendary');
create type public.invite_target_type as enum ('quest', 'location');
create type public.invite_status as enum ('pending', 'accepted', 'declined', 'expired');

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null check (char_length(username) between 1 and 32),
    display_name text,
    role public.app_role not null default 'player',
    resources jsonb not null default '{"glimmer":0,"relics":0,"keys":0,"crowns":0}'::jsonb,
    points integer not null default 0 check (points >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.locations (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete set null,
    name text not null,
    description text,
    hint text,
    clue text,
    visibility public.visibility_level not null default 'private',
    latitude numeric(10, 7) not null,
    longitude numeric(10, 7) not null,
    accuracy_m numeric(8, 2),
    address text,
    location_photo_url text,
    icon_url text,
    gps_anchors jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.quests (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete set null,
    title text not null,
    summary text,
    description text,
    visibility public.visibility_level not null default 'private',
    status public.quest_status not null default 'draft',
    starting_location_id uuid references public.locations(id) on delete set null,
    completion_bonus integer not null default 0 check (completion_bonus >= 0),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.quest_locations (
    id uuid primary key default gen_random_uuid(),
    quest_id uuid not null references public.quests(id) on delete cascade,
    location_id uuid not null references public.locations(id) on delete cascade,
    step_order integer not null default 0,
    branch_key text,
    next_options jsonb not null default '[]'::jsonb,
    clue_override text,
    created_at timestamptz not null default now(),
    unique (quest_id, location_id)
);

create table public.glyph_objectives (
    id uuid primary key default gen_random_uuid(),
    location_id uuid not null references public.locations(id) on delete cascade,
    quest_id uuid references public.quests(id) on delete cascade,
    label text not null,
    shape public.glyph_shape not null,
    color_family public.glyph_color_family not null,
    required boolean not null default true,
    points integer not null default 1 check (points >= 0),
    evidence_requirement text not null default 'photo',
    min_confidence integer not null default 75 check (min_confidence between 1 and 100),
    icon_url text,
    active boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.glyph_sightings (
    id uuid primary key default gen_random_uuid(),
    glyph_objective_id uuid not null references public.glyph_objectives(id) on delete cascade,
    location_id uuid not null references public.locations(id) on delete cascade,
    quest_id uuid references public.quests(id) on delete set null,
    user_id uuid references public.profiles(id) on delete set null,
    confidence integer not null check (confidence between 1 and 100),
    latitude numeric(10, 7),
    longitude numeric(10, 7),
    accuracy_m numeric(8, 2),
    evidence_url text,
    attuned boolean not null default false,
    captured_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);

create table public.user_glyph_progress (
    user_id uuid not null references public.profiles(id) on delete cascade,
    glyph_objective_id uuid not null references public.glyph_objectives(id) on delete cascade,
    status public.progress_status not null default 'locked',
    points_awarded integer not null default 0 check (points_awarded >= 0),
    completed_sighting_id uuid references public.glyph_sightings(id) on delete set null,
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, glyph_objective_id)
);

create table public.user_location_progress (
    user_id uuid not null references public.profiles(id) on delete cascade,
    location_id uuid not null references public.locations(id) on delete cascade,
    status public.progress_status not null default 'locked',
    glyphs_found integer not null default 0 check (glyphs_found >= 0),
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, location_id)
);

create table public.user_quest_progress (
    user_id uuid not null references public.profiles(id) on delete cascade,
    quest_id uuid not null references public.quests(id) on delete cascade,
    status public.progress_status not null default 'unlocked',
    active_location_id uuid references public.locations(id) on delete set null,
    accepted_at timestamptz not null default now(),
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, quest_id)
);

create table public.rewards (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete set null,
    quest_id uuid references public.quests(id) on delete cascade,
    location_id uuid references public.locations(id) on delete cascade,
    glyph_objective_id uuid references public.glyph_objectives(id) on delete cascade,
    type public.reward_type not null,
    rarity public.reward_rarity not null default 'Common',
    title text not null,
    description text,
    points integer not null default 0 check (points >= 0),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table public.user_rewards (
    user_id uuid not null references public.profiles(id) on delete cascade,
    reward_id uuid not null references public.rewards(id) on delete cascade,
    earned_at timestamptz not null default now(),
    source_sighting_id uuid references public.glyph_sightings(id) on delete set null,
    primary key (user_id, reward_id)
);

create table public.location_access (
    location_id uuid not null references public.locations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    can_edit boolean not null default false,
    can_visit boolean not null default true,
    created_at timestamptz not null default now(),
    primary key (location_id, user_id)
);

create table public.quest_access (
    quest_id uuid not null references public.quests(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    can_edit boolean not null default false,
    can_play boolean not null default true,
    created_at timestamptz not null default now(),
    primary key (quest_id, user_id)
);

create table public.invites (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid references public.profiles(id) on delete set null,
    recipient_id uuid references public.profiles(id) on delete cascade,
    invite_code text unique not null default encode(gen_random_bytes(8), 'hex'),
    target_type public.invite_target_type not null,
    target_id uuid not null,
    message text,
    status public.invite_status not null default 'pending',
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index locations_visibility_idx on public.locations (visibility);
create index locations_owner_idx on public.locations (owner_id);
create index locations_lat_lng_idx on public.locations (latitude, longitude);
create index quests_visibility_idx on public.quests (visibility);
create index glyph_objectives_location_idx on public.glyph_objectives (location_id);
create index glyph_sightings_location_idx on public.glyph_sightings (location_id);
create index invites_code_idx on public.invites (invite_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger locations_updated_at before update on public.locations for each row execute function public.set_updated_at();
create trigger quests_updated_at before update on public.quests for each row execute function public.set_updated_at();
create trigger glyph_objectives_updated_at before update on public.glyph_objectives for each row execute function public.set_updated_at();
create trigger user_glyph_progress_updated_at before update on public.user_glyph_progress for each row execute function public.set_updated_at();
create trigger user_location_progress_updated_at before update on public.user_location_progress for each row execute function public.set_updated_at();
create trigger user_quest_progress_updated_at before update on public.user_quest_progress for each row execute function public.set_updated_at();
create trigger invites_updated_at before update on public.invites for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, username, display_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'player-' || substr(new.id::text, 1, 8)),
        coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role = 'admin'
    );
$$;

create or replace function public.can_access_location(check_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.locations l
        where l.id = check_location_id
        and (
            l.visibility = 'public'
            or l.owner_id = auth.uid()
            or public.is_admin()
            or exists (
                select 1
                from public.location_access la
                where la.location_id = l.id
                and la.user_id = auth.uid()
                and la.can_visit
            )
        )
    );
$$;

create or replace function public.can_edit_location(check_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.locations l
        where l.id = check_location_id
        and (
            l.owner_id = auth.uid()
            or public.is_admin()
            or exists (
                select 1
                from public.location_access la
                where la.location_id = l.id
                and la.user_id = auth.uid()
                and la.can_edit
            )
        )
    );
$$;

create or replace function public.can_access_quest(check_quest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.quests q
        where q.id = check_quest_id
        and (
            q.visibility = 'public'
            or q.owner_id = auth.uid()
            or public.is_admin()
            or exists (
                select 1
                from public.quest_access qa
                where qa.quest_id = q.id
                and qa.user_id = auth.uid()
                and qa.can_play
            )
        )
    );
$$;

create or replace function public.can_edit_quest(check_quest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.quests q
        where q.id = check_quest_id
        and (
            q.owner_id = auth.uid()
            or public.is_admin()
            or exists (
                select 1
                from public.quest_access qa
                where qa.quest_id = q.id
                and qa.user_id = auth.uid()
                and qa.can_edit
            )
        )
    );
$$;

create or replace function public.distance_meters(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric
language sql
immutable
as $$
    select 6371000 * 2 * asin(
        sqrt(
            power(sin(radians((lat2 - lat1) / 2)), 2) +
            cos(radians(lat1)) * cos(radians(lat2)) *
            power(sin(radians((lon2 - lon1) / 2)), 2)
        )
    );
$$;

create or replace function public.nearby_public_locations(user_lat numeric, user_lng numeric, radius_m numeric default 5000)
returns table (
    id uuid,
    name text,
    hint text,
    latitude numeric,
    longitude numeric,
    visibility public.visibility_level,
    distance_m numeric
)
language sql
stable
as $$
    select
        l.id,
        l.name,
        l.hint,
        l.latitude,
        l.longitude,
        l.visibility,
        public.distance_meters(user_lat, user_lng, l.latitude, l.longitude) as distance_m
    from public.locations l
    where public.can_access_location(l.id)
    and public.distance_meters(user_lat, user_lng, l.latitude, l.longitude) <= radius_m
    order by distance_m asc;
$$;

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.quests enable row level security;
alter table public.quest_locations enable row level security;
alter table public.glyph_objectives enable row level security;
alter table public.glyph_sightings enable row level security;
alter table public.user_glyph_progress enable row level security;
alter table public.user_location_progress enable row level security;
alter table public.user_quest_progress enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;
alter table public.location_access enable row level security;
alter table public.quest_access enable row level security;
alter table public.invites enable row level security;

create policy "profiles can read public roster" on public.profiles for select using (true);
create policy "profiles can update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "locations readable by access" on public.locations for select using (public.can_access_location(id));
create policy "locations insert own" on public.locations for insert with check (auth.uid() is not null and (owner_id = auth.uid() or public.is_admin()));
create policy "locations update editable" on public.locations for update using (public.can_edit_location(id)) with check (public.can_edit_location(id));
create policy "locations delete editable" on public.locations for delete using (public.can_edit_location(id));

create policy "quests readable by access" on public.quests for select using (public.can_access_quest(id));
create policy "quests insert own" on public.quests for insert with check (auth.uid() is not null and (owner_id = auth.uid() or public.is_admin()));
create policy "quests update editable" on public.quests for update using (public.can_edit_quest(id)) with check (public.can_edit_quest(id));
create policy "quests delete editable" on public.quests for delete using (public.can_edit_quest(id));

create policy "quest locations readable by quest access" on public.quest_locations for select using (public.can_access_quest(quest_id));
create policy "quest locations editable by quest access" on public.quest_locations for all using (public.can_edit_quest(quest_id)) with check (public.can_edit_quest(quest_id));

create policy "glyph objectives readable by location or quest access" on public.glyph_objectives for select using (
    public.can_access_location(location_id) or (quest_id is not null and public.can_access_quest(quest_id))
);
create policy "glyph objectives editable by location or quest owner" on public.glyph_objectives for all using (
    public.can_edit_location(location_id) or (quest_id is not null and public.can_edit_quest(quest_id))
) with check (
    public.can_edit_location(location_id) or (quest_id is not null and public.can_edit_quest(quest_id))
);

create policy "sightings readable by owner or location editor" on public.glyph_sightings for select using (
    user_id = auth.uid() or public.can_edit_location(location_id) or public.is_admin()
);
create policy "sightings insert own" on public.glyph_sightings for insert with check (
    auth.uid() is not null and user_id = auth.uid() and public.can_access_location(location_id)
);

create policy "own glyph progress" on public.user_glyph_progress for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own location progress" on public.user_location_progress for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own quest progress" on public.user_quest_progress for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "rewards readable by related access" on public.rewards for select using (
    public.is_admin()
    or (quest_id is not null and public.can_access_quest(quest_id))
    or (location_id is not null and public.can_access_location(location_id))
    or owner_id = auth.uid()
);
create policy "rewards editable by owner admin" on public.rewards for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

create policy "own earned rewards" on public.user_rewards for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "location access readable by involved users" on public.location_access for select using (
    user_id = auth.uid() or public.can_edit_location(location_id) or public.is_admin()
);
create policy "location access editable by location editor" on public.location_access for all using (
    public.can_edit_location(location_id)
) with check (
    public.can_edit_location(location_id)
);

create policy "quest access readable by involved users" on public.quest_access for select using (
    user_id = auth.uid() or public.can_edit_quest(quest_id) or public.is_admin()
);
create policy "quest access editable by quest editor" on public.quest_access for all using (
    public.can_edit_quest(quest_id)
) with check (
    public.can_edit_quest(quest_id)
);

create policy "invites readable by sender recipient admin" on public.invites for select using (
    sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin()
);
create policy "invites insert by signed in sender" on public.invites for insert with check (
    auth.uid() is not null and (sender_id = auth.uid() or public.is_admin())
);
create policy "invites update by sender recipient admin" on public.invites for update using (
    sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin()
) with check (
    sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('quest-evidence', 'quest-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
    ('quest-glyph-icons', 'quest-glyph-icons', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "glyph icons public read" on storage.objects for select using (bucket_id = 'quest-glyph-icons');
create policy "glyph icons signed upload" on storage.objects for insert with check (bucket_id = 'quest-glyph-icons' and auth.uid() is not null);
create policy "evidence owner read" on storage.objects for select using (
    bucket_id = 'quest-evidence'
    and (
        owner = auth.uid()
        or public.is_admin()
    )
);
create policy "evidence signed upload" on storage.objects for insert with check (bucket_id = 'quest-evidence' and auth.uid() is not null);
