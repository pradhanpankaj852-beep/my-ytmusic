# Build Log: YouTube Music Clone (Web)

Project: YouTube Music Single-User MVP
Date: 2026-11-23
Stack: Static HTML5, Tailwind / Tokens CSS, Vanilla ES Modules, YouTube IFrame Player API, localStorage

---

## Screen Build Summary

| Screen ID | Name | Status | Notes |
|---|---|---|---|
| **S01** | Home | Complete | Quick Picks, Trending Shelves, Genre Chips, Seed + API fallback |
| **S02** | Search | Complete | Debounced search, category chips, recent search history, loading skeletons |
| **S03** | Library | Complete | Tabbed view (Liked Songs vs Playlists), Create Playlist modal, delete playlist |
| **S04** | Fullscreen Player | Complete | Large album art, lyrics tab, queue tab, volume slider, shuffle/repeat |
| **P01** | Bottom Mini-Player | Complete | iOS-style frosted glass (`backdrop-filter: blur(20px)`), persistent playback |

## Key Technical Achievements

1. **Background Audio & Unbroken Playback:**
   - Architecture leverages single-page view routing (`#home`, `#search`, `#library`) so switching screens never unmounts the YouTube IFrame audio player.
   - Integrated `navigator.mediaSession` with metadata and hardware/OS lockscreen media key handlers.

2. **Zero-Backend Persistence:**
   - Playlists, liked songs, playback position, volume, and search history are all managed via client-side `localStorage` with events broadcasting updates across components.

3. **Fallback Resilience:**
   - Provides seed tracks (`SEED_TRACKS`) on first load so music plays immediately even if offline or if public API proxies encounter rate limits.
   - Dual API support: YouTube Data API v3 (when key is configured) + automatic Piped proxy fallback with instance rotation.

4. **WCAG AA Dark Theme & Glassmorphism:**
   - Clean room design with CSS tokens (`tokens.css`), 100% compliant with WCAG AA contrast ratios checked via Python script.
   - Frosted glass mini-player and fullscreen overlays.
