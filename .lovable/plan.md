

# BeatMaster Overhaul Plan

This is a significant refactor touching nearly every file. Here's a summary of all changes organized by module.

---

## 1. Vite Config — Base Path
- Add `base: '/smartbeat/'` to `vite.config.ts`
- Update `manifest.json` paths to use `/smartbeat/` prefix

## 2. Theme — Light Mode Support
- Add light mode CSS variables (glassmorphism with violet text accents)
- Add a theme toggle (light/dark) using `next-themes` (already installed)
- Beat 1 color changed to **green**, other beats stay purple

## 3. Types Update (`types/beatmaster.ts`)
- Add `PadMode` type: `'sampler' | 'loop'`
- Add `audioUrl?: string` to `PadConfig` for external URL support
- Add `mode?: PadMode` to `PadConfig`
- Add `12/8`, `7/4`, `13/8` to supported time signatures

## 4. Default Preset Data (new file `src/data/defaultPresets.ts`)
- Contains the full 68-song "Banda New Metal" playlist with all BPMs and time signatures
- Contains 5 default pad configs with Pixabay CDN URLs for Kick, Snare, Hihat, Crash, Air Horn
- On first load (no localStorage data), these presets are seeded into state

## 5. Metronome UI — Navigation Buttons Instead of Dropdowns
- Replace **Select dropdowns** for Time Signature, Subdivision, and Timbre with **< Previous / Next >** button pairs
- Each shows current value with arrow buttons on either side
- Keeps the slider for BPM and volume/pan

## 6. Beat Indicator — Color Update
- Beat 1: **Green** glow (`hsl(142, 70%, 50%)`)
- Other beats: Purple/violet (current primary)
- Add beat labels in footer: "Beat 1", "Beat 2", etc.

## 7. Sampler Pads — Major Refactor (`SamplerPad.tsx`)
- **Hybrid mode per pad**: Each pad has individual `sampler` or `loop` mode toggle (no more global tabs)
- **Momentary mode**: In sampler mode, audio plays on keydown/mousedown and stops with fade-out on keyup/mouseup
- **Context menu / gear icon**: Opens a config modal per pad with: rename, volume, pan, load local file, paste URL
- **Auto-cache from URL**: On app load, fetch audio from URLs, decode to `AudioBuffer`, store in memory for offline use
- **Default sounds**: Pre-load the 5 Pixabay URLs on first run
- Remove the old Pads/Sampler tabs layout — show all 5 pads in a single row

## 8. Keyboard Mapping (new hook `useKeyboardShortcuts.ts`)
- `1-5`: Trigger pads (keydown = play, keyup = stop for momentary mode)
- `Space`: Toggle metronome play/pause
- `T`: Tap tempo
- `ArrowLeft/Right`: In setlist mode, navigate songs. In free mode, BPM ±10
- `ArrowUp/Down`: Master volume ±5%
- `L`: Pan left (-1), `C`: Pan center (0), `R`: Pan right (1)
- `Ctrl+P`: Cycle through playlists

## 9. Setlist Manager — Import Multi-Sheet Excel
- Update `importXlsx` to read **all sheets** from an Excel file, creating one playlist per sheet tab
- Keep existing single-playlist export

## 10. Footer Player — Pan Control + Beat Labels
- Add pan control (L/C/R buttons or slider)
- Add beat number labels under each dot: "Beat 1", "Beat 2"...
- Show mode switch (Free/Setlist) with clearer labeling

## 11. Layout — Performance-Optimized Single Page
- Desktop: Metronome fixed on the **left column**, Sampler + Setlist stacked on the right
- Mobile: Metronome on top, Sampler below, Setlist below, all stacked
- Minimize scrolling — key controls always visible

## 12. Pan Correction
- Ensure pan slider: -1 = 100% Left, +1 = 100% Right (already correct in Web Audio API, just verify labels show "L" and "R" correctly)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `vite.config.ts` | Add `base: '/smartbeat/'` |
| `src/data/defaultPresets.ts` | **New** — 68 songs + 5 pad URLs |
| `src/hooks/useKeyboardShortcuts.ts` | **New** — all keyboard bindings |
| `src/types/beatmaster.ts` | Add PadMode, audioUrl, extra time sigs |
| `src/index.css` | Add light mode vars, green glow class |
| `src/pages/Index.tsx` | Refactor layout, wire keyboard hook |
| `src/components/beatmaster/Metronome.tsx` | Replace dropdowns with prev/next buttons |
| `src/components/beatmaster/BeatIndicator.tsx` | Green for beat 1, optional labels |
| `src/components/beatmaster/SamplerPad.tsx` | Hybrid pads, momentary, config modal, URL loading |
| `src/components/beatmaster/FooterPlayer.tsx` | Add pan, beat labels |
| `src/components/beatmaster/SetlistManager.tsx` | Multi-sheet import |
| `public/manifest.json` | Update paths for `/smartbeat/` |
| `index.html` | Update base href |

