-- ── Lawn activity settings (interval & next scheduled date, one row per user per type) ──

create table if not exists lawn_settings (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references users(id) on delete cascade not null,
  activity_type    text        not null check (activity_type in ('watering', 'mowing', 'fertilizing')),
  interval_days    integer     not null default 3,
  next_recommended date,
  updated_at       timestamptz default now(),
  unique (user_id, activity_type)
);
alter table lawn_settings enable row level security;
create policy "Users manage own lawn_settings"
  on lawn_settings for all using (auth.uid() = user_id);

-- ── Lawn activity log entries ────────────────────────────────────────────────

create table if not exists lawn_activities (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references users(id) on delete cascade not null,
  activity_type    text        not null check (activity_type in ('watering', 'mowing', 'fertilizing')),
  date             date        not null,
  duration_minutes integer,
  created_at       timestamptz default now()
);
alter table lawn_activities enable row level security;
create policy "Users manage own lawn_activities"
  on lawn_activities for all using (auth.uid() = user_id);

-- ── Equipment records ────────────────────────────────────────────────────────

create table if not exists equipment (
  id                uuid        default gen_random_uuid() primary key,
  user_id           uuid        references users(id) on delete cascade not null,
  type              text        not null,
  mower_sub_type    text,
  year              text        not null default '',
  make              text        not null,
  model             text        not null,
  purchase_date     date,
  purchase_location text        not null default '',
  photo_url         text,
  receipt_url       text,
  created_at        timestamptz default now()
);
alter table equipment enable row level security;
create policy "Users manage own equipment"
  on equipment for all using (auth.uid() = user_id);

-- ── Maintenance task templates (one per maintenance task per piece of equipment) ──

create table if not exists maintenance_items (
  id              uuid        default gen_random_uuid() primary key,
  equipment_id    uuid        references equipment(id) on delete cascade not null,
  user_id         uuid        references users(id) on delete cascade not null,
  name            text        not null,
  interval_months integer     not null,
  created_at      timestamptz default now()
);
alter table maintenance_items enable row level security;
create policy "Users manage own maintenance_items"
  on maintenance_items for all using (auth.uid() = user_id);

-- ── Maintenance log entries (when each task was completed) ───────────────────

create table if not exists maintenance_logs (
  id                  uuid        default gen_random_uuid() primary key,
  maintenance_item_id uuid        references maintenance_items(id) on delete cascade not null,
  user_id             uuid        references users(id) on delete cascade not null,
  date                date        not null,
  created_at          timestamptz default now()
);
alter table maintenance_logs enable row level security;
create policy "Users manage own maintenance_logs"
  on maintenance_logs for all using (auth.uid() = user_id);

-- ── Scheduled calendar tasks ─────────────────────────────────────────────────

create table if not exists scheduled_tasks (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references users(id) on delete cascade not null,
  type       text        not null check (type in ('watering', 'mowing', 'fertilizing')),
  date       date        not null,
  note       text,
  created_at timestamptz default now()
);
alter table scheduled_tasks enable row level security;
create policy "Users manage own scheduled_tasks"
  on scheduled_tasks for all using (auth.uid() = user_id);

-- ── Lawn photo metadata (files stored in Supabase Storage) ───────────────────

create table if not exists lawn_photos (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references users(id) on delete cascade not null,
  url         text        not null,
  caption     text        not null default '',
  captured_at timestamptz not null default now(),
  created_at  timestamptz default now()
);
alter table lawn_photos enable row level security;
create policy "Users manage own lawn_photos"
  on lawn_photos for all using (auth.uid() = user_id);

-- ── Storage buckets ───────────────────────────────────────────────────────────
-- Run these separately in the Supabase Storage section of the dashboard,
-- or via the Storage API. The SQL editor does not create buckets directly.
--
-- Bucket: equipment-media  (private, for equipment photos & receipts)
-- Bucket: lawn-photos      (private, for lawn gallery photos)
--
-- Storage RLS policies (add under Storage > Policies):
--
-- For equipment-media:
--   Allow select: (auth.uid()::text = (storage.foldername(name))[1])
--   Allow insert: (auth.uid()::text = (storage.foldername(name))[1])
--   Allow update: (auth.uid()::text = (storage.foldername(name))[1])
--   Allow delete: (auth.uid()::text = (storage.foldername(name))[1])
--
-- For lawn-photos:
--   Same pattern as above.
