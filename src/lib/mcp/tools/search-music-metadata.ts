import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const MB_URL = "https://musicbrainz.org/ws/2/recording";

export default defineTool({
  name: "search_music_metadata",
  title: "Search music metadata (MusicBrainz)",
  description:
    "Search the MusicBrainz recording database for a song/artist. Returns matches with title, artist, release, and MBID — useful for enriching BeatMaster setlists.",
  inputSchema: {
    query: z.string().min(1).max(200).describe("Song title, artist, or 'title artist' query."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (1-25). Default 5."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit }) => {
    const url = `${MB_URL}?query=${encodeURIComponent(query)}&limit=${limit ?? 5}&fmt=json`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "BeatMaster-MCP/0.1.0 (https://beatmaster.lovable.app)" },
      });
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `MusicBrainz error: ${res.status}` }],
          isError: true,
        };
      }
      const data = await res.json();
      const results = (data.recordings ?? []).map((r: any) => ({
        title: r.title,
        artist: r["artist-credit"]?.map((a: any) => a.name).join(", "),
        release: r.releases?.[0]?.title,
        lengthMs: r.length,
        mbid: r.id,
        score: r.score,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        structuredContent: { results },
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Fetch failed: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
});
