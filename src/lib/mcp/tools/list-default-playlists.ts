import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { defaultPlaylists, exercisePlaylists } from "../../../data/defaultPresets";

export default defineTool({
  name: "list_default_playlists",
  title: "List default BeatMaster playlists",
  description:
    "List BeatMaster's built-in playlists (band setlists and instrument exercises), each with their songs, BPMs, and time signatures.",
  inputSchema: {
    include_exercises: z
      .boolean()
      .optional()
      .describe("Include the 🎓 Exercícios instrument-training playlists. Defaults to true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ include_exercises }) => {
    const includeExercises = include_exercises ?? true;
    const all = includeExercises
      ? [...defaultPlaylists, ...exercisePlaylists]
      : defaultPlaylists;
    const summary = all.map((p) => ({
      name: p.name,
      band: p.band,
      songCount: p.songs.length,
      songs: p.songs.map((s) => ({
        name: s.name,
        artist: s.artist,
        bpm: s.bpm,
        timeSignature: s.timeSignature,
        durationSeconds: s.duration,
        notes: s.notes,
      })),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: { playlists: summary },
    };
  },
});
