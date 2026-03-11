import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mbUrl = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`;
    
    const mbResponse = await fetch(mbUrl, {
      headers: {
        'User-Agent': 'BeatMaster/1.0 (beatmaster-app)',
        'Accept': 'application/json',
      },
    });

    if (!mbResponse.ok) {
      throw new Error(`MusicBrainz API error: ${mbResponse.status}`);
    }

    const mbData = await mbResponse.json();
    
    const results = await Promise.all((mbData.recordings || []).map(async (rec: any) => {
      const artist = rec['artist-credit']?.[0]?.name || '';
      const durationMs = rec.length || 0;
      const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
      const releaseId = rec.releases?.[0]?.id;
      
      // Try to get cover art URL from Cover Art Archive
      let coverArt: string | undefined;
      if (releaseId) {
        try {
          const caResponse = await fetch(
            `https://coverartarchive.org/release/${releaseId}`,
            { headers: { 'Accept': 'application/json' } }
          );
          if (caResponse.ok) {
            const caData = await caResponse.json();
            const front = caData.images?.find((img: any) => img.front);
            coverArt = front?.thumbnails?.small || front?.thumbnails?.['250'] || front?.image;
          }
        } catch {
          // Cover art not available, that's fine
        }
      }
      
      return {
        id: rec.id,
        name: rec.title || '',
        artist,
        duration: durationSec,
        timeSignature: '4/4',
        bpm: 120,
        album: rec.releases?.[0]?.title || '',
        year: rec.releases?.[0]?.date?.substring(0, 4) || '',
        coverArt,
      };
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
