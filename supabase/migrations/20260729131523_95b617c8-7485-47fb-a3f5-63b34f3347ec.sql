-- Recreate increment_visit as SECURITY INVOKER; rely on RLS-scoped UPDATE grants instead of definer privileges
DROP FUNCTION IF EXISTS public.increment_visit(boolean);

-- Allow anon/authenticated to update ONLY the two counter rows
GRANT SELECT, UPDATE ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;

DROP POLICY IF EXISTS "Visitors can increment counters" ON public.site_stats;
CREATE POLICY "Visitors can increment counters"
ON public.site_stats
FOR UPDATE
TO anon, authenticated
USING (key IN ('visits', 'unique_visitors'))
WITH CHECK (key IN ('visits', 'unique_visitors'));

CREATE OR REPLACE FUNCTION public.increment_visit(_unique boolean DEFAULT false)
RETURNS TABLE(visits bigint, unique_visitors bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.increment_visit(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_visit(boolean) TO anon, authenticated, service_role;