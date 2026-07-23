import { defineMcp } from "@lovable.dev/mcp-js";
import listDefaultPlaylists from "./tools/list-default-playlists";
import searchMusicMetadata from "./tools/search-music-metadata";
import bpmUtils from "./tools/bpm-utils";

export default defineMcp({
  name: "beatmaster-mcp",
  title: "BeatMaster MCP",
  version: "0.1.0",
  instructions:
    "Tools for BeatMaster — a performance app with metronome, setlist, and sampler. Use `list_default_playlists` to browse built-in band/exercise setlists, `search_music_metadata` to look up songs on MusicBrainz, and `bpm_utils` for tempo/bar calculations.",
  tools: [listDefaultPlaylists, searchMusicMetadata, bpmUtils],
});
