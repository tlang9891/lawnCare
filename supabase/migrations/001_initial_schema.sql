-- ── Users ─────────────────────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users). One row per authenticated user.

CREATE TABLE public.users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name          TEXT        NOT NULL,
  last_name           TEXT        NOT NULL,
  zip_code            TEXT        NOT NULL,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  lawn_size_sq_ft     INTEGER     NOT NULL DEFAULT 0,
  grass_type          TEXT        NOT NULL DEFAULT 'other',
  avatar_url          TEXT,
  onboarding_complete BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── Lawn Settings ─────────────────────────────────────────────────────────────
-- Per-user interval configuration for the three care activities.

CREATE TABLE public.lawn_settings (
  user_id                    UUID    PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  watering_interval_days     INTEGER NOT NULL DEFAULT 3,
  mowing_interval_days       INTEGER NOT NULL DEFAULT 10,
  fertilizing_interval_days  INTEGER NOT NULL DEFAULT 60,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lawn_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lawn settings"
  ON public.lawn_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Lawn Activity Logs ────────────────────────────────────────────────────────
-- One row per logged watering, mowing, or fertilizing session.

CREATE TABLE public.lawn_activity_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('watering', 'mowing', 'fertilizing')),
  logged_at        DATE        NOT NULL,
  duration_minutes INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.lawn_activity_logs (user_id, type, logged_at DESC);

ALTER TABLE public.lawn_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity logs"
  ON public.lawn_activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Equipment ─────────────────────────────────────────────────────────────────
-- Mowers, blowers, trimmers, and other gear stored in the user's shed.

CREATE TABLE public.equipment (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL,
  mower_sub_type    TEXT        CHECK (mower_sub_type IN ('riding', 'push')),
  year              TEXT,
  make              TEXT        NOT NULL,
  model             TEXT        NOT NULL,
  purchase_date     DATE,
  purchase_location TEXT,
  receipt_url       TEXT,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.equipment (user_id);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own equipment"
  ON public.equipment FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Maintenance Items ─────────────────────────────────────────────────────────
-- The tracked maintenance tasks for each piece of equipment.

CREATE TABLE public.maintenance_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID        NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  interval_months  INTEGER     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.maintenance_items (equipment_id);

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own maintenance items"
  ON public.maintenance_items FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM public.equipment WHERE id = equipment_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.equipment WHERE id = equipment_id
    )
  );


-- ── Maintenance Logs ──────────────────────────────────────────────────────────
-- A log entry each time a maintenance task is completed.

CREATE TABLE public.maintenance_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_item_id  UUID        NOT NULL REFERENCES public.maintenance_items(id) ON DELETE CASCADE,
  logged_at            DATE        NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.maintenance_logs (maintenance_item_id, logged_at DESC);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own maintenance logs"
  ON public.maintenance_logs FOR ALL
  USING (
    auth.uid() = (
      SELECT e.user_id
      FROM public.maintenance_items mi
      JOIN public.equipment e ON e.id = mi.equipment_id
      WHERE mi.id = maintenance_item_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT e.user_id
      FROM public.maintenance_items mi
      JOIN public.equipment e ON e.id = mi.equipment_id
      WHERE mi.id = maintenance_item_id
    )
  );


-- ── Scheduled Tasks ───────────────────────────────────────────────────────────
-- Future-dated lawn care tasks added via the calendar.

CREATE TABLE public.scheduled_tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('watering', 'mowing', 'fertilizing')),
  scheduled_date DATE        NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.scheduled_tasks (user_id, scheduled_date);

ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled tasks"
  ON public.scheduled_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Lawn Photos ───────────────────────────────────────────────────────────────
-- Photos of the user's lawn, stored in Supabase Storage.
-- storage_path is the object path within the "lawn-photos" storage bucket.

CREATE TABLE public.lawn_photos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,
  caption       TEXT        NOT NULL DEFAULT '',
  captured_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.lawn_photos (user_id, captured_at DESC);

ALTER TABLE public.lawn_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lawn photos"
  ON public.lawn_photos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run this in the Supabase Dashboard → Storage, or via the CLI.
-- Creates the private bucket used for lawn photos and equipment images.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('lawn-photos', 'lawn-photos', false);
--
-- CREATE POLICY "Users can upload own photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'lawn-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can read own photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'lawn-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'lawn-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
