import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "bpm_utils",
  title: "BPM & tempo utilities",
  description:
    "Convert between BPM, milliseconds per beat, and beats/bars for a given duration and time signature. Handy for planning setlist timing.",
  inputSchema: {
    bpm: z.number().min(20).max(400).describe("Tempo in beats per minute."),
    timeSignature: z
      .string()
      .optional()
      .describe("Time signature like '4/4', '3/4', '6/8'. Defaults to '4/4'."),
    durationSeconds: z
      .number()
      .min(0)
      .optional()
      .describe("Optional song duration; if provided, returns total beats and bars."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bpm, timeSignature, durationSeconds }) => {
    const ts = timeSignature ?? "4/4";
    const [numStr] = ts.split("/");
    const beatsPerBar = parseInt(numStr, 10) || 4;
    const msPerBeat = 60000 / bpm;
    const result: Record<string, number | string> = {
      bpm,
      timeSignature: ts,
      beatsPerBar,
      msPerBeat: Math.round(msPerBeat * 100) / 100,
      secondsPerBar: Math.round((msPerBeat * beatsPerBar) / 10) / 100,
    };
    if (durationSeconds != null) {
      const totalBeats = (durationSeconds * bpm) / 60;
      result.totalBeats = Math.round(totalBeats * 100) / 100;
      result.totalBars = Math.round((totalBeats / beatsPerBar) * 100) / 100;
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
