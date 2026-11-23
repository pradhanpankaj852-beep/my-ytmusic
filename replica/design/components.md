# Component Specs — YouTube Music Clone

All components reference `tokens.css` variables. No external component libraries.
Icon set: **Lucide** (MIT, SVG, tree-shakeable).

---

## Navbar

| | |
|---|---|
| **variants** | desktop (vertical side-rail, 240px), mobile (bottom tab bar, 56px) |
| **states** | default, active-tab (accent indicator bar + text-text) |
| **tokens** | bg `bg-elevated`, border-right `border`, text `text-secondary`, active `text` + accent bar |
| **a11y** | `<nav>` landmark, `aria-current="page"` on active, keyboard tab-navigable |
| **used on** | S01, S02, S03 |

## SearchBar

| | |
|---|---|
| **variants** | collapsed (icon-only in nav), expanded (full input on S02) |
| **sizes** | md 40px height |
| **states** | idle, focused (border-focus ring), filled, loading (spinner) |
| **tokens** | bg `surface`, border `border-input`, focus ring `border-focus` 2px, text `text`, placeholder `text-muted`, radius `radius-full` |
| **a11y** | `<input type="search">`, `role="searchbox"`, `aria-label`, clear button visible when filled |
| **used on** | S01 (icon), S02 (expanded) |

## ChipFilter

| | |
|---|---|
| **variants** | genre/mood (Home), category (Search: Songs/Albums/Artists/Playlists) |
| **sizes** | sm 28px height |
| **states** | default, selected (accent-soft bg + accent text), hover (surface-hover) |
| **tokens** | bg `surface` / `accent-soft`, text `text-secondary` / `accent`, radius `radius-full`, font `text-sm`/`weight-medium` |
| **transition** | background `duration-fast` `ease-out` |
| **a11y** | `role="tablist"` + `role="tab"`, `aria-selected`, keyboard arrow-key navigation |
| **used on** | S01, S02 |

## SongCard

| | |
|---|---|
| **variants** | list-row (search results, library), grid-card (home shelves) |
| **sizes** | row 56px height, grid 160×200px |
| **states** | default, hover (hover-lift, play overlay on thumbnail), playing (accent equalizer icon), liked (filled heart) |
| **tokens** | bg `surface`, hover `surface-hover`, text `text` (title) + `text-secondary` (artist), radius `radius-md`, shadow on hover `shadow-sm` |
| **transition** | transform + bg `duration-normal` `ease-out` |
| **a11y** | `<button>` or `<a>` with `aria-label="Play {title} by {artist}"`, heart toggle `aria-pressed` |
| **used on** | S01, S02, S03 |

## CarouselShelf

| | |
|---|---|
| **variants** | — (horizontal scrollable row with section title) |
| **states** | filled, loading-skeleton (pulsing placeholders) |
| **tokens** | gap `space-3`, scroll snap `scroll-snap-type: x mandatory`, title font `text-md`/`weight-semibold`, text `text` |
| **a11y** | `role="region"` + `aria-label`, left/right arrow buttons visible on hover, keyboard scrollable |
| **used on** | S01 |

## MiniPlayer (P01)

| | |
|---|---|
| **variants** | — |
| **sizes** | height `mini-player-height` (64px), full-width fixed bottom |
| **states** | hidden (no track), playing, paused |
| **tokens** | `.glass-player` (glassmorphism), border-top subtle white 6%, text `text` (title) + `text-secondary` (artist), z `z-mini-player` |
| **transition** | slide-up `duration-slow` `ease-spring` on first appear |
| **a11y** | `role="region"` `aria-label="Now playing"`, transport buttons are `<button>` with labels, progress bar `role="slider"` |
| **used on** | persistent on S01, S02, S03 |

## PlaybackControls

| | |
|---|---|
| **variants** | mini (play/pause + next), full (prev, play/pause, next, shuffle, repeat) |
| **sizes** | mini icons 24px, full icons 28px, play/pause 40px |
| **states** | playing (pause icon), paused (play icon), disabled (text-muted, no pointer), shuffle/repeat active (accent) |
| **tokens** | icon color `text` / `accent` (active), hover `hover-brighten`, focus `focus-ring` |
| **a11y** | `<button aria-label="Play">` / `"Pause"`, toggle buttons `aria-pressed` |
| **used on** | P01, S04 |

## ProgressBar

| | |
|---|---|
| **variants** | thin (mini-player, 3px), thick (fullscreen, 6px) |
| **states** | default, seeking (thumb visible), buffering (pulsing) |
| **tokens** | track bg `border`, fill `accent`, thumb `text-on-accent` 12px circle, radius `radius-full` |
| **a11y** | `<input type="range">` or custom `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label="Seek"` |
| **used on** | P01, S04 |

## VolumeSlider

| | |
|---|---|
| **variants** | — |
| **sizes** | 100px wide, 4px track |
| **states** | default, muted (icon swap, fill at 0) |
| **tokens** | same as ProgressBar, icon `text-secondary` |
| **a11y** | `role="slider"` `aria-label="Volume"`, mute button toggles `aria-pressed` |
| **used on** | S04 |

## LyricsPanel

| | |
|---|---|
| **variants** | — |
| **states** | loaded (scrollable text), no-lyrics (empty state illustration), loading (skeleton) |
| **tokens** | text `text-secondary`, active line `text` + `weight-semibold`, bg `transparent`, font `text-base`/`leading-normal` |
| **a11y** | `role="region"` `aria-label="Lyrics"`, auto-scroll follows playback, user scroll pauses auto-scroll |
| **used on** | S04 |

## QueueList

| | |
|---|---|
| **variants** | — |
| **states** | filled (ordered tracks), empty (empty state CTA) |
| **tokens** | rows same as SongCard list-row, current track highlight `accent-soft` bg, drag handle `text-muted` |
| **a11y** | `role="listbox"`, drag-reorder via grab handle `role="button"` with `aria-roledescription="reorder"`, keyboard up/down reorder |
| **used on** | S04 |

## TabBar (Library)

| | |
|---|---|
| **variants** | Playlists, Liked Songs |
| **sizes** | 44px height |
| **states** | default, active (underline `accent`, text `text`) |
| **tokens** | text `text-secondary` / `text`, underline 2px `accent`, font `text-base`/`weight-medium` |
| **a11y** | `role="tablist"` + `role="tab"` + `role="tabpanel"`, `aria-selected`, keyboard arrows |
| **used on** | S03 |

## CreatePlaylistModal

| | |
|---|---|
| **variants** | — |
| **sizes** | 400px max-width, centered |
| **states** | open, closed (removed from DOM), validation-error (red border on input) |
| **tokens** | `.glass` bg, radius `radius-xl`, shadow `shadow-lg`, overlay `overlay`, z `z-modal` |
| **transition** | fade-in + scale 0.95→1 `duration-normal` `ease-spring` |
| **a11y** | `role="dialog"` `aria-modal="true"`, focus trap, Escape closes, `aria-labelledby` title, autofocus on name input |
| **used on** | S03 |

## Toast

| | |
|---|---|
| **variants** | success (success border-left), error (danger), info (accent) |
| **sizes** | auto-width, max 360px, 48px min-height |
| **states** | visible (slide-in from bottom-right), fading-out (3s auto-dismiss) |
| **tokens** | `.glass` bg, radius `radius-lg`, shadow `shadow-md`, text `text`, z `z-toast` |
| **transition** | slide-up `duration-normal` `ease-spring`, fade-out `duration-slow` |
| **a11y** | `role="status"` `aria-live="polite"`, not focus-stealing |
| **used on** | all screens |

## EmptyState

| | |
|---|---|
| **variants** | library-empty, no-results, no-lyrics, empty-queue |
| **states** | — (static) |
| **tokens** | illustration 120px (Lucide icon, `text-muted`), title `text-md`/`weight-semibold` `text`, subtitle `text-base` `text-secondary`, CTA button (accent) |
| **a11y** | decorative illustration `aria-hidden="true"`, CTA is focusable `<button>` |
| **used on** | S02, S03, S04 |

## Button

| | |
|---|---|
| **variants** | primary (accent bg), ghost (transparent, text-secondary), icon-only (round), danger (danger bg) |
| **sizes** | sm 32px, md 40px, lg 48px |
| **states** | default, hover (brighten 15%), active (scale 0.97), focus-visible (focus-ring), disabled (opacity 0.4, no pointer), loading (spinner replaces icon, label kept for SR) |
| **tokens** | primary: bg `accent`, text `text-on-accent`, radius `radius-md`; ghost: bg transparent, hover `surface-hover` |
| **transition** | all `duration-fast` `ease-out` |
| **a11y** | real `<button>`, visible focus ring, `aria-disabled` over HTML disabled for SR label access, loading `aria-busy="true"` |
| **used on** | all screens |
