# Recon map: YouTube Music (Web)

Scope: Personal single-user MVP — Home (Trending / Quick Picks), Search, Library (LocalStorage playlists & liked songs), persistent Bottom Mini-Player + Fullscreen Lyrics/Queue view.
For: Personal project / portfolio piece.
Date: 2026-11-23

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | help center | https://support.google.com/youtubemusic | Feature list, settings, keyboard shortcuts |
| 2 | marketing / product page | https://music.youtube.com | Core pitch, layout reference |
| 3 | pricing page | https://music.youtube.com/music_premium | Free vs Premium tiers — guides priority |
| 4 | Google Play listing | https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.music | Screenshots, rating, description |
| 5 | public API docs (YouTube Data API v3) | https://developers.google.com/youtube/v3 | Data model for videos, playlists, search |

## Core loop

Browse or search for music → play a track → control playback from a persistent mini-player → manage a personal library of liked songs and playlists.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | `/` | Surface trending music, quick picks, mood/genre shelves | Navbar, CarouselShelf, ChipFilter, SongCard, AlbumCard, PlaylistCard | empty (new user), filled, loading skeleton |
| S02 | Search | `/search?q=` | Find songs, albums, artists, playlists by query | SearchBar, ChipFilter (songs/albums/artists/playlists), ResultRow, SongCard | idle (no query), results, no-results, loading |
| S03 | Library | `/library` | View & manage liked songs, user-created playlists | TabBar (Playlists / Liked Songs), PlaylistList, SongList, CreatePlaylistModal, EmptyState | empty, filled, editing |
| S04 | Fullscreen Player | overlay or `/watch?v=` | Full-art playback, lyrics, queue | AlbumArt, ProgressBar, PlaybackControls, LyricsPanel, QueueList, VolumeSlider | playing, paused, buffering, no-lyrics |

**Persistent element (not a screen):**

| ID | element | location | purpose | key components | states |
| --- | --- | --- | --- | --- | --- |
| P01 | Bottom Mini-Player | fixed bottom bar on S01-S03 | Ambient playback control without leaving current screen | Thumbnail, TrackInfo, Play/Pause, Next, ProgressBarMini, expand-to-S04 chevron | hidden (nothing queued), playing, paused |

## Flows

```
F01 Discover & play a trending track
    S01 (tap a SongCard) → P01 appears playing
    happy path clicks: 1
    edge: no data yet (loading), network error

F02 Search & play
    S01 → S02 (type query, tap result) → P01 plays
    happy path clicks: 3 (focus search, type, tap result)
    edge: no results, slow network, special characters

F03 Like a song
    P01 or S04 (tap heart icon) → song added to Liked Songs in S03
    happy path clicks: 1
    edge: already liked (toggle unlike)

F04 Create playlist & add songs
    S03 (tap "New Playlist") → modal (enter name) → confirm → empty playlist created
    Then: P01 or S04 (tap "Add to playlist") → pick playlist → song added
    happy path clicks: 4
    edge: duplicate name, empty name validation

F05 View queue & reorder
    P01 (tap chevron to expand) → S04 → Queue tab → drag to reorder
    happy path clicks: 2
    edge: empty queue, single-track queue

F06 View lyrics
    P01 (expand) → S04 → Lyrics tab
    happy path clicks: 2
    edge: lyrics unavailable
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Navbar | desktop (side rail), mobile (bottom tabs) | default, active-tab | S01, S02, S03 |
| SearchBar | collapsed (icon only), expanded (input) | idle, focused, filled | S01 (icon), S02 (expanded) |
| ChipFilter | genre/mood chips, category chips | default, selected | S01, S02 |
| SongCard | list-row, grid-card | default, hover, playing-indicator | S01, S02, S03 |
| AlbumCard | grid-card | default, hover | S01, S02 |
| PlaylistCard | grid-card, list-row | default, hover | S01, S02, S03 |
| CarouselShelf | horizontal scroll section with title | filled, loading-skeleton | S01 |
| MiniPlayer (P01) | — | hidden, playing, paused | persistent |
| AlbumArt | small (mini-player), large (fullscreen) | loaded, placeholder | P01, S04 |
| PlaybackControls | mini (play/pause + next), full (prev, play/pause, next, shuffle, repeat) | playing, paused, disabled | P01, S04 |
| ProgressBar | thin (mini), thick (fullscreen), seekable | default, seeking | P01, S04 |
| VolumeSlider | — | default, muted | S04 |
| LyricsPanel | — | loaded, no-lyrics, loading | S04 |
| QueueList | — | filled, empty | S04 |
| TabBar | Playlists / Liked Songs | default, active | S03 |
| PlaylistList | — | filled, empty | S03 |
| SongList | sortable list | filled, empty | S03 |
| CreatePlaylistModal | — | open, closed, validation-error | S03 |
| EmptyState | illustration + CTA | — | S03 (no playlists / no liked songs) |
| Toast | success, error | visible, fading-out | all |
| Button | primary, ghost, icon-only, danger | default, hover, focus, disabled, loading | all |

## Inferred data model

```
Track       id, title, artist, album, duration_sec, thumbnail_url, audio_src_url,
            lyrics_text (nullable), is_liked (boolean)
            evidence: S01 SongCard, S02 results, S04 now-playing, P01 mini-player
            confidence: high

Playlist    id, name, created_at, updated_at, track_ids (ordered array)
            evidence: S03 playlist list, F04 create flow, "Add to playlist" action
            confidence: high

Queue       current_index, track_ids (ordered array), shuffle_seed (nullable)
            evidence: S04 queue tab, F05 reorder flow
            confidence: high

PlaybackState   current_track_id, position_sec, is_playing, repeat_mode (off|one|all),
                is_shuffled, volume (0-100)
                evidence: P01 + S04 controls
                confidence: high

SearchResult    query, results (array of Track refs), filters_applied
                evidence: S02
                confidence: medium (transient, not persisted)
```

Relationships: Playlist 1→n Track (ordered), Queue 1→n Track (ordered), PlaybackState →1 Track.

**Storage:** All data persisted in browser `localStorage` (no backend). Tracks metadata fetched from YouTube Data API v3 at runtime; only user-generated data (playlists, liked-song IDs, queue) is stored locally.

## Feature matrix

See `features.csv`. Must: 18, should: 7, could: 4, skip: 8.

## Out of scope (cannot or should not be cloned)

- **Licensed music catalogue** — YouTube's licensed audio streams cannot be redistributed; the clone will use YouTube IFrame / Embed API for playback or link to public YouTube videos.
- **Personalized recommendation engine** — ML-driven home feed; clone substitutes trending/chart endpoints from YouTube Data API v3.
- **User authentication / Google sign-in** — explicitly excluded per scope.
- **Premium features** — offline downloads, background play (N/A for web), ad-free tier.
- **Podcasts** — excluded per scope.
- **Social features** — comments, sharing to social networks — excluded per scope.
- **Subscriptions / billing** — excluded per scope.
- **Chromecast / device casting** — hardware integration, out of MVP scope.

## Size

Screens 4 (+1 persistent mini-player), flows 6, entities 5. Hard parts: YouTube embed/audio playback legality & quota limits, lyrics sourcing, drag-to-reorder queue, responsive carousel shelves. Size: **S–M** (1–2 weeks for a solo developer).
