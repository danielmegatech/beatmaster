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

    // Search MusicBrainz recordings
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
    
    const results = (mbData.recordings || []).map((rec: any) => {
      const artist = rec['artist-credit']?.[0]?.name || '';
      const durationMs = rec.length || 0;
      const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
      
      // Try to extract time signature from tags if available
      let timeSignature = '4/4'; // default
      
      return {
        id: rec.id,
        name: rec.title || '',
        artist,
        duration: durationSec,
        timeSignature,
        // MusicBrainz doesn't provide BPM directly, but AcousticBrainz did (now deprecated)
        // Default to 120, user can adjust
        bpm: 120,
        album: rec.releases?.[0]?.title || '',
        year: rec.releases?.[0]?.date?.substring(0, 4) || '',
      };
    });

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
