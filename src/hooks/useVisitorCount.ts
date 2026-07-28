import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VISITOR_KEY = 'bm-visitor-registered';
const SESSION_KEY = 'bm-visit-counted';

export interface VisitorStats {
  visits: number;
  uniqueVisitors: number;
  loading: boolean;
}

export function useVisitorCount(track = true): VisitorStats {
  const [stats, setStats] = useState<VisitorStats>({ visits: 0, uniqueVisitors: 0, loading: true });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const isNewVisitor = !localStorage.getItem(VISITOR_KEY);
        const alreadyCountedSession = sessionStorage.getItem(SESSION_KEY) === '1';

        if (track && !alreadyCountedSession) {
          const { data, error } = await supabase.rpc('increment_visit', { _unique: isNewVisitor });
          if (!error) {
            localStorage.setItem(VISITOR_KEY, '1');
            sessionStorage.setItem(SESSION_KEY, '1');
            const row = Array.isArray(data) ? data[0] : data;
            if (!cancelled && row) {
              setStats({ visits: Number(row.visits) || 0, uniqueVisitors: Number(row.unique_visitors) || 0, loading: false });
              return;
            }
          }
        }

        const { data: rows } = await supabase.from('site_stats').select('key, count');
        if (!cancelled) {
          const find = (k: string) => Number(rows?.find(r => r.key === k)?.count ?? 0);
          setStats({ visits: find('visits'), uniqueVisitors: find('unique_visitors'), loading: false });
        }
      } catch {
        if (!cancelled) setStats(s => ({ ...s, loading: false }));
      }
    };

    run();
    return () => { cancelled = true; };
  }, [track]);

  return stats;
}
