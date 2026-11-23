# Architecture: YouTube Music Clone (Web)

Stack: Static HTML + Tailwind CSS + Vanilla JS — zero backend, zero cost, localStorage persistence, YouTube IFrame Player API for audio.
Date: 2026-11-23

---

## 1 · Stack

| layer | choice | why |
| --- | --- | --- |
| markup | HTML5 (multi-page or hash-router SPA) | Zero build step; works on any static host |
| styling | Tailwind CSS (CDN or CLI build) | Utility-first; matches YTM's dark-first aesthetic fast |
| scripting | Vanilla JS (ES modules) | No framework overhead; <50 KB total JS budget |
| data / search | YouTube Data API v3 (key-only, no OAuth) | Free 10 000 units/day quota; search, videos, playlists endpoints |
| data fallback | Piped public API (`pipedapi.kavin.rocks`) | No API key; same data, no quota; CORS-friendly |
| audio playback | YouTube IFrame Player API | Embeds a hidden `<iframe>`; ad-free audio for single embeds; handles buffering, seek, duration |
| persistence | `localStorage` (JSON) | Playlists, liked songs, queue, playback position — all client-side |
| hosting | GitHub Pages / Cloudflare Pages / Vercel static | Zero cost; global CDN; push-to-deploy |

**No backend. No server functions. No database. No auth. No payments.**

---

## 2 · Data schema (localStorage JSON)

All keys prefixed `ytm_` to avoid collisions. Values are JSON strings.

### `ytm_liked` — liked song IDs (Set as array)

```jsonc
["videoId1", "videoId2"]   // order = most-recently-liked-first
```

### `ytm_playlists` — user playlists

```jsonc
[
  {
    "id": "pl_1700000000000",       // "pl_" + Date.now() at creation
    "name": "Chill Vibes",
    "createdAt": "2026-11-23T16:00:00Z",
    "updatedAt": "2026-11-23T16:05:00Z",
    "trackIds": ["videoId3", "videoId1"]   // ordered
  }
]
```

### `ytm_queue` — current playback queue

```jsonc
{
  "tracks": ["videoId1", "videoId2", "videoId3"],
  "currentIndex": 0,
  "shuffled": false,
  "repeatMode": "off"           // "off" | "one" | "all"
}
```

### `ytm_playback` — last playback state (restore on reload)

```jsonc
{
  "videoId": "videoId1",
  "positionSec": 42,
  "volume": 80
}
```

### `ytm_search_history` — recent queries (could-have)

```jsonc
["lofi beats", "arijit singh"]   // max 20, LIFO
```

### `ytm_track_cache` — lightweight metadata cache

```jsonc
{
  "videoId1": {
    "title": "Song Title",
    "artist": "Artist Name",
    "thumbnail": "https://i.ytimg.com/vi/videoId1/mqdefault.jpg",
    "duration": 234
  }
}
```

> No `user_id` columns — single-user, single-browser. All reads/writes go through a thin `store.js` module that wraps `JSON.parse(localStorage.getItem(...))`.

---

## 3 · External APIs (read-only, no OAuth)

### 3a · YouTube Data API v3 (primary)

| purpose | endpoint | quota cost | notes |
| --- | --- | --- | --- |
| Search | `GET /youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=…` | 100 units | Filter `videoCategoryId=10` (Music) |
| Trending | `GET /youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=10` | 1 unit | Region-aware via `regionCode` |
| Video details | `GET /youtube/v3/videos?part=snippet,contentDetails&id=…` | 1 unit | Batch up to 50 IDs |

**Daily budget:** 10 000 units free. ~100 searches/day + detail lookups. Enough for single-user MVP.

### 3b · Piped API (fallback / quota saver)

| purpose | endpoint | notes |
| --- | --- | --- |
| Search | `GET /search?q=…&filter=music_songs` | No key needed; CORS OK |
| Trending | `GET /trending?region=US` | |
| Stream URL | `GET /streams/{videoId}` | Returns direct audio stream URLs (use for metadata; playback via IFrame) |

Piped is community-hosted; instances may go down. App tries primary, falls back automatically.

### 3c · YouTube IFrame Player API (playback)

```html
<div id="yt-player" style="position:absolute;left:-9999px"></div>
```

```js
// player.js — singleton
let player;
function initPlayer(videoId) {
  player = new YT.Player('yt-player', {
    videoId,
    playerVars: { autoplay: 1, controls: 0 },
    events: {
      onReady: e => e.target.playVideo(),
      onStateChange: handleStateChange
    }
  });
}
```

Hidden off-screen iframe. All UI controls (play, pause, seek, volume, next, prev) call `player.playVideo()`, `player.seekTo()`, etc. No ads in embed mode for most videos.

---

## 4 · File / folder structure

```
index.html              ← S01 Home
search.html             ← S02 Search
library.html            ← S03 Library
css/
  output.css            ← Tailwind compiled (or CDN link)
js/
  app.js                ← Router / page init
  store.js              ← localStorage CRUD (liked, playlists, queue, playback, cache)
  api.js                ← YouTube Data API + Piped fetch wrappers
  player.js             ← YT IFrame Player singleton + queue logic
  ui/
    mini-player.js      ← P01 bottom bar (injected on every page)
    fullscreen-player.js← S04 overlay (lyrics + queue tabs)
    carousel.js         ← Horizontal shelf scroll
    search-bar.js       ← Autocomplete / chip filters
    modal.js            ← Create-playlist modal
    toast.js            ← Notification toasts
    drag-reorder.js     ← Queue drag-to-reorder
assets/
  icons/                ← SVG icons (play, pause, heart, etc.)
```

No build step required. Optionally add `npx tailwindcss -o css/output.css --minify` for production.

---

## 5 · Parts that bite

| concern | mitigation |
| --- | --- |
| **API quota (10 K/day)** | Cache responses in `sessionStorage` (TTL 5 min); fall back to Piped when quota nears limit |
| **IFrame Player restrictions** | Some videos block embed; catch `onError` → skip to next track, show toast |
| **CORS on Piped** | Piped instances set `Access-Control-Allow-Origin: *`; if an instance goes down, rotate to another from a list |
| **localStorage size (~5 MB)** | Track cache stores only id/title/artist/thumb/duration (~200 bytes each); 5 MB ≈ 25 000 cached tracks — plenty |
| **No offline** | Service worker could cache the shell, but audio always requires network — out of MVP |
| **Lyrics** | No free, legal lyrics API with broad coverage; MVP shows "Lyrics unavailable" with a link to external search; could-have: integrate a public lyrics API later |
| **Mobile responsiveness** | Tailwind breakpoints; test mini-player fixed positioning on iOS Safari (100dvh, safe-area-inset) |

---

## 6 · Build order

### Milestone 1 — Vertical slice (proves the stack)

> Search → play one track → hear audio. ≈ 1 day.

- S02 Search (bare input + results list) + `api.js` + `player.js`
- P01 Mini-player (play/pause only)
- Screens: S02, P01. Modules: `api.js`, `player.js`, `store.js` (queue only).

### Milestone 2 — Home + full playback (must-haves)

- S01 Home (trending shelf, quick picks, genre chips)
- S04 Fullscreen player (album art, full controls, progress bar, volume)
- Queue logic (next, prev, shuffle, repeat)
- Screens: S01, S04. Modules: `carousel.js`, `fullscreen-player.js`.

### Milestone 3 — Library (must-haves)

- S03 Library (liked songs, create/rename/delete playlist, add/remove tracks)
- Heart/like toggle on P01 and S04
- `store.js` CRUD for playlists + liked
- Screens: S03. Modules: `modal.js`.

### Milestone 4 — Should-haves

- Lyrics panel (S04 tab)
- Drag-to-reorder queue
- Loading skeletons
- Responsive layout (mobile bottom tabs ↔ desktop side rail)
- Keyboard shortcuts
- Empty states, toast notifications

### Milestone 5 — Could-haves

- Dark theme polish / album-art gradient
- Search history
- Audio visualizer

---

## Summary

**Stack:** Static HTML + Tailwind + Vanilla JS, localStorage, YouTube IFrame Player API — zero cost, zero backend.
**Tables:** 0 SQL tables; 6 localStorage keys.
**Routes:** 0 server routes; 3 external API endpoint groups (YT Data, Piped, IFrame).
**Three riskiest parts:** (1) YouTube API daily quota exhaustion, (2) IFrame embed-blocked videos, (3) lyrics sourcing.
**Next step:** `/replica-design`
