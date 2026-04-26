-- 1. Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  friend_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create availability table
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

-- 3. Create budget_entries table
CREATE TABLE public.budget_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create proposed_events table
CREATE TABLE public.proposed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost NUMERIC(10,2) NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('per_person', 'total')),
  proposed_start TIMESTAMPTZ NOT NULL,
  proposed_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS on all four tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposed_events ENABLE ROW LEVEL SECURITY;

-- 5b. Auto-create public.users row on auth signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Write RLS policies

-- users policies
CREATE POLICY "Select allowed for authenticated users"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Update own row or be paired"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id OR friend_id = auth.uid())
WITH CHECK (auth.uid() = id OR friend_id = auth.uid());

CREATE POLICY "Insert own row"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- availability policies
CREATE POLICY "Select own and friend availability"
ON public.availability FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  auth.uid() = (SELECT friend_id FROM public.users WHERE id = availability.user_id)
);

CREATE POLICY "Insert/Update/Delete own availability"
ON public.availability FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- budget_entries policies
CREATE POLICY "All operations only for own budget"
ON public.budget_entries FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- proposed_events policies
CREATE POLICY "Select for both users in the pair"
ON public.proposed_events FOR SELECT
TO authenticated
USING (
  proposed_by = auth.uid() OR
  auth.uid() = (SELECT friend_id FROM public.users WHERE id = proposed_events.proposed_by)
);

CREATE POLICY "Insert/Update only for proposed_by"
ON public.proposed_events FOR INSERT
TO authenticated
WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Update for both users in pair"
ON public.proposed_events FOR UPDATE
TO authenticated
USING (
  proposed_by = auth.uid() OR
  auth.uid() = (SELECT friend_id FROM public.users WHERE id = proposed_events.proposed_by)
)
WITH CHECK (
  proposed_by = auth.uid() OR
  auth.uid() = (SELECT friend_id FROM public.users WHERE id = proposed_events.proposed_by)
);

-- 7. Availability Intersection Query Reference
/*
SELECT a.start_time, a.end_time
FROM availability a
JOIN availability b
  ON a.user_id = :userA_id
 AND b.user_id = :userB_id
WHERE a.start_time < b.end_time
  AND a.end_time   > b.start_time
ORDER BY a.start_time;
*/
