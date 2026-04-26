-- Mutuals reconfiguration migration
-- 1) pair_requests table + RLS
-- 2) tasks table + RLS
-- 3) users.avatar_color column

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#7C3AED';

CREATE TABLE IF NOT EXISTS public.pair_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pair_requests_no_self_request CHECK (from_user_id <> to_user_id),
  CONSTRAINT pair_requests_unique_pending UNIQUE (from_user_id, to_user_id, status)
);

ALTER TABLE public.pair_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pair_requests'
      AND policyname = 'pair_requests_insert_own'
  ) THEN
    CREATE POLICY pair_requests_insert_own
      ON public.pair_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pair_requests'
      AND policyname = 'pair_requests_delete_own'
  ) THEN
    CREATE POLICY pair_requests_delete_own
      ON public.pair_requests
      FOR DELETE
      TO authenticated
      USING (from_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pair_requests'
      AND policyname = 'pair_requests_select_to_user'
  ) THEN
    CREATE POLICY pair_requests_select_to_user
      ON public.pair_requests
      FOR SELECT
      TO authenticated
      USING (to_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pair_requests'
      AND policyname = 'pair_requests_update_status_to_user'
  ) THEN
    CREATE POLICY pair_requests_update_status_to_user
      ON public.pair_requests
      FOR UPDATE
      TO authenticated
      USING (to_user_id = auth.uid())
      WITH CHECK (to_user_id = auth.uid() AND status IN ('accepted', 'declined'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'tasks_owner_full_crud'
  ) THEN
    CREATE POLICY tasks_owner_full_crud
      ON public.tasks
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'tasks_friend_read_only'
  ) THEN
    CREATE POLICY tasks_friend_read_only
      ON public.tasks
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = public.tasks.user_id
            AND u.friend_id = auth.uid()
        )
      );
  END IF;
END $$;
