
# BeatMaster — Professional Music Performance App

## Overview
A single-page, all-in-one music performance tool with a dark purple glassmorphism aesthetic. All modules are visible on one scrollable page with a sticky footer player — optimized for live performance.

---

## 🎨 Design & Theme
- **Dark mode** by default with deep purple/violet gradient accents
- **Glassmorphism** cards with frosted-glass backgrounds, subtle borders, and soft shadows
- Purple glow effects on active elements and beat indicators
- Responsive layout: side-by-side grid on desktop/tablet, stacked on mobile
- Smooth animations and instant visual feedback on all interactions

---

## 🥁 Module 1: Metronome (Top Section)
- **BPM Control**: Large BPM display with a slider (40–240 BPM) and +/- fine-tune buttons
- **Tap Tempo**: Button to set BPM by tapping rhythmically
- **Time Signature Selector**: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
- **Subdivision Selector**: Quarter, eighth, triplet, sixteenth notes
- **Sound Selector**: 10+ timbres generated via Web Audio API oscillators (Triangle, Sine, Square, Sawtooth, Woodblock, Cowbell, Hi-Hat, Rim, Clave, Click)
- **Volume & Pan**: Sliders for metronome click volume and stereo panning (L/R)
- **Visual Beat Indicator**: Row of glowing dots/circles that flash in sync with the audio beat — accent on beat 1 in a distinct color
- **Audio Engine**: Built on Web Audio API with `audioContext.currentTime` scheduling for drift-free precision

---

## 📋 Module 2: Setlist Manager (Middle Section)
- **Playlist Management**: Create, rename, and delete multiple playlists
- **Song List**: Each song has Name, BPM, Time Signature, and Notes fields
- **CRUD Operations**: Add, edit, delete songs with inline editing
- **Drag & Drop Reordering**: Reorder songs within a playlist
- **Auto-Sync**: Clicking a song instantly updates the metronome's BPM and time signature
- **Import/Export**: Import and export setlists as Excel (.xlsx) files using the `xlsx` library
- **Active Song Highlight**: Currently selected song is visually highlighted

---

## 🎹 Module 3: Sampler Pad & Loop Player (Below Setlist)
- **Two Modes** toggled by tabs:
  - **Pads Mode**: 5 large buttons for one-shot sounds (Kick, Snare, Clap, Hi-Hat, Cymbal) — generated via Web Audio API
  - **Sampler Mode**: 5 buttons for longer audio loops with progress bars
- **Per-Pad Controls**: Individual volume and pan sliders for each pad
- **Stop All Button**: Immediately stops all playing samples/loops
- **Bank Management**: Import/export the full sound bank (including audio files) as a .zip file using the `jszip` library

---

## 🎵 Module 4: Footer Player (Sticky Bottom Bar)
- Fixed bar at the bottom of the screen, always visible
- **Play/Pause**: Global metronome start/stop
- **Previous/Next**: Navigate through songs in the active setlist
- **Beat Indicator**: Compact visual beat dots synced with the metronome
- **Volume Master**: Master volume control
- **Mode Toggle**: Switch between "Free Mode" (manual BPM) and "Setlist Mode" (BPM follows the selected song)
- **Current Song Display**: Shows the name and BPM of the active song

---

## 💾 Data & PWA
- **LocalStorage Persistence**: All playlists, songs, settings, and pad configurations saved locally
- **PWA Setup**: Service worker for offline support, installable on iOS/Android with app manifest and icons
- **No backend required** — fully client-side application

---

## 📱 Responsive Behavior
- **Desktop/Tablet**: Metronome and Sampler side by side, Setlist below or alongside
- **Mobile**: All modules stacked vertically, touch-optimized pad buttons, compact footer
