CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  contact text,
  category text NOT NULL DEFAULT 'geral',
  rating smallint,
  message text NOT NULL,
  page text,
  user_agent text
);
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (
  char_length(message) BETWEEN 1 AND 4000
  AND (name IS NULL OR char_length(name) <= 120)
  AND (contact IS NULL OR char_length(contact) <= 200)
  AND (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE TABLE public.diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text
);
GRANT INSERT ON public.diagnostics TO anon, authenticated;
GRANT ALL ON public.diagnostics TO service_role;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit diagnostics" ON public.diagnostics FOR INSERT TO anon, authenticated WITH CHECK (
  (note IS NULL OR char_length(note) <= 2000)
  AND pg_column_size(payload) <= 20000
);

CREATE TABLE public.site_stats (
  key text PRIMARY KEY,
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats are public" ON public.site_stats FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.site_stats (key, count) VALUES ('visits', 0), ('unique_visitors', 0);

CREATE OR REPLACE FUNCTION public.increment_visit(_unique boolean DEFAULT false)
RETURNS TABLE (visits bigint, unique_visitors bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.site_stats SET count = count + 1, updated_at = now() WHERE key = 'visits';
  IF _unique THEN
    UPDATE public.site_stats SET count = count + 1, updated_at = now() WHERE key = 'unique_visitors';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT s.count FROM public.site_stats s WHERE s.key = 'visits'),
      (SELECT s.count FROM public.site_stats s WHERE s.key = 'unique_visitors');
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_visit(boolean) TO anon, authenticated;