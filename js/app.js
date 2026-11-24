import ICONS from './icons.js';
import { Store } from './store.js';
import { Api } from './api.js';
import { Player, onPlayerEvent } from './player.js';
import { initMiniPlayer } from './ui/mini-player.js';
import { showToast } from './ui/toast.js';
import { escapeHtml, maskApiKey } from './utils/sanitize.js';

// Seed tracks for instant playback & offline demo resilience
const SEED_TRACKS = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    artist: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
    duration: 3600
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio - Beats to Sleep/Chill to',
    artist: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/mqdefault.jpg',
    duration: 3600
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'Chillhop Radio - Jazzy & Lofi Hip Hop Beats',
    artist: 'Chillhop Music',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/mqdefault.jpg',
    duration: 3600
  },
  {
    videoId: '7NOSDKb0HlU',
    title: 'Synthwave Radio - Chill Synth / Retro Beats',
    artist: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/7NOSDKb0HlU/mqdefault.jpg',
    duration: 3600
  },
  {
    videoId: 'k3Vduy9t4mU',
    title: 'Acoustic Guitar Melodies - Peaceful Campfire',
    artist: 'Cozy Rain',
    thumbnail: 'https://i.ytimg.com/vi/k3Vduy9t4mU/mqdefault.jpg',
    duration: 1800
  },
  {
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill Synth',
    artist: 'Nightride FM',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/mqdefault.jpg',
    duration: 3600
  }
];

// Initialize cache with seed tracks
Store.cacheTracks(SEED_TRACKS);

// Global App State
let currentRoute = 'home';
let homeGenreFilter = 'All';
let searchCategoryFilter = 'All';
let activeLibraryTab = 'liked';

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Routing ──
function initRouter() {
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const valid = ['home', 'search', 'library'];
    currentRoute = valid.includes(hash) ? hash : 'home';
    updateRouteUI();
  }

  window.addEventListener('hashchange', handleHash);
  handleHash();
}

function updateRouteUI() {
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    const route = el.dataset.route;
    if (route === currentRoute) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const screens = {
    home: document.getElementById('screen-home'),
    search: document.getElementById('screen-search'),
    library: document.getElementById('screen-library'),
  };

  Object.keys(screens).forEach(key => {
    if (screens[key]) {
      screens[key].style.display = key === currentRoute ? 'block' : 'none';
    }
  });

  if (currentRoute === 'home') renderHomeScreen();
  if (currentRoute === 'search') renderSearchScreen();
  if (currentRoute === 'library') renderLibraryScreen();
}

// ── MediaSession API (Background Audio Controls) ──
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  onPlayerEvent((ev) => {
    if (ev.type === 'trackChange') {
      const info = Store.getTrack(ev.videoId);
      if (!info) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title,
        artist: info.artist,
        album: 'YouTube Music MVP',
        artwork: [
          { src: info.thumbnail, sizes: '320x180', type: 'image/jpeg' },
          { src: info.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }

    if (ev.type === 'playing') {
      navigator.mediaSession.playbackState = 'playing';
    } else if (ev.type === 'paused') {
      navigator.mediaSession.playbackState = 'paused';
    }

    if (ev.type === 'timeupdate') {
      if ('setPositionState' in navigator.mediaSession && ev.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(ev.duration, 0.1),
            playbackRate: 1,
            position: Math.min(Math.max(ev.current, 0), ev.duration)
          });
        } catch (e) {}
      }
    }
  });

  try {
    navigator.mediaSession.setActionHandler('play', () => Player.resume());
    navigator.mediaSession.setActionHandler('pause', () => Player.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => Player.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => Player.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) Player.seek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const cur = (Store.getPlayback().positionSec || 0) + (details.seekOffset || 10);
      Player.seek(cur);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const cur = Math.max(0, (Store.getPlayback().positionSec || 0) - (details.seekOffset || 10));
      Player.seek(cur);
    });
  } catch (e) {}
}

// ── Keyboard Shortcuts ──
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when focused on input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      Player.playPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      const cur = Player.getDuration() > 0 ? (Store.getPlayback().positionSec || 0) + 5 : 0;
      Player.seek(cur);
      showToast('Seek forward 5s', 'info');
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const cur = Math.max(0, (Store.getPlayback().positionSec || 0) - 5);
      Player.seek(cur);
      showToast('Seek back 5s', 'info');
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      const vol = Player.getVolume();
      Player.setVolume(vol > 0 ? 0 : 80);
      showToast(vol > 0 ? 'Muted' : 'Unmuted', 'info');
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      const vid = Player.currentVideoId();
      if (vid) {
        const liked = Store.toggleLike(vid);
        showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
      }
    }
  });
}

// ── S01 Home Screen ──
const GENRES = ['All', 'Chill', 'Relax', 'Workout', 'Energy', 'Focus', 'Lofi', 'Acoustic'];

function renderHomeScreen() {
  const container = document.getElementById('screen-home');
  if (!container) return;

  container.innerHTML = `
    <!-- Genre Chips -->
    <div class="chips-container" role="tablist" aria-label="Music genres">
      ${GENRES.map(g => `
        <button class="chip ${g === homeGenreFilter ? 'active' : ''}" data-genre="${g}" role="tab" aria-selected="${g === homeGenreFilter}">${g}</button>
      `).join('')}
    </div>

    <!-- Quick Picks Shelf -->
    <section class="shelf-section">
      <div class="shelf-header">
        <h2 class="shelf-title">Quick Picks</h2>
      </div>
      <div class="carousel-grid" id="quick-picks-shelf">
        ${renderSongCardSkeletons(4)}
      </div>
    </section>

    <!-- Trending Now Shelf -->
    <section class="shelf-section">
      <div class="shelf-header">
        <h2 class="shelf-title">Trending & Recommended</h2>
      </div>
      <div class="carousel-grid" id="trending-shelf">
        ${renderSongCardSkeletons(6)}
      </div>
    </section>
  `;

  // Attach chip events
  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      homeGenreFilter = btn.dataset.genre;
      renderHomeScreen();
      loadHomeData();
    });
  });

  loadHomeData();
}

function renderSongCardSkeletons(count) {
  return Array(count).fill(0).map(() => `
    <div class="song-card">
      <div class="song-card-thumb-wrap skeleton"></div>
      <div class="skeleton" style="height:14px;width:80%;margin-bottom:6px;"></div>
      <div class="skeleton" style="height:12px;width:50%;"></div>
    </div>
  `).join('');
}

async function loadHomeData() {
  const qpShelf = document.getElementById('quick-picks-shelf');
  const trShelf = document.getElementById('trending-shelf');
  if (!qpShelf || !trShelf) return;

  // Use seed tracks first for quick responsiveness
  let tracks = [...SEED_TRACKS];

  // Try fetching dynamic trending or genre query
  try {
    const query = homeGenreFilter === 'All' ? 'chill lofi beats' : `${homeGenreFilter} music`;
    const fetched = await Api.search(query);
    if (fetched && fetched.length > 0) {
      tracks = fetched;
      Store.cacheTracks(tracks);
    }
  } catch (err) {
    console.warn('API fetch fell back to seeds:', err);
  }

  // Populate Quick Picks Shelf (first 4)
  const quickPicks = tracks.slice(0, 4);
  qpShelf.innerHTML = quickPicks.map(t => renderSongCard(t)).join('');
  attachSongCardEvents(qpShelf, quickPicks);

  // Populate Trending Shelf
  const trending = tracks.slice(4);
  trShelf.innerHTML = (trending.length ? trending : quickPicks).map(t => renderSongCard(t)).join('');
  attachSongCardEvents(trShelf, trending.length ? trending : quickPicks);
}

function renderSongCard(track) {
  const safeId = escapeHtml(track.videoId);
  const safeTitle = escapeHtml(track.title);
  const safeArtist = escapeHtml(track.artist);
  const safeThumb = escapeHtml(track.thumbnail);

  return `
    <div class="song-card" data-video-id="${safeId}">
      <div class="song-card-thumb-wrap">
        <img class="song-card-thumb" src="${safeThumb}" alt="${safeTitle}" loading="lazy">
        <div class="song-card-play-overlay">
          <div class="play-circle-btn">
            ${ICONS.play}
          </div>
        </div>
      </div>
      <div class="song-card-title" title="${safeTitle}">${safeTitle}</div>
      <div class="song-card-artist" title="${safeArtist}">${safeArtist}</div>
    </div>
  `;
}

function attachSongCardEvents(container, trackList) {
  container.querySelectorAll('.song-card').forEach(card => {
    card.addEventListener('click', () => {
      const videoId = card.dataset.videoId;
      Player.play(videoId, trackList);
      showToast('Playing track...');
    });
  });
}

// ── S02 Search Screen ──
let searchDebounceTimer = null;
let lastSearchQuery = '';

function renderSearchScreen() {
  const container = document.getElementById('screen-search');
  if (!container) return;

  const history = Store.getSearchHistory();

  container.innerHTML = `
    <form id="search-form" class="search-bar-wrap" action="javascript:void(0);">
      <div style="position:relative;flex:1;">
        <span class="search-icon-pos">${ICONS.search}</span>
        <input type="search" class="search-input" id="search-input-field" placeholder="Search songs, artists, albums..." value="${escapeHtml(lastSearchQuery)}" enterkeyhint="search" autocomplete="off" spellcheck="false" autofocus>
        <button type="button" class="search-clear-btn" id="search-clear-btn" style="${lastSearchQuery ? 'display:flex;' : 'display:none;'}">${ICONS.x}</button>
      </div>
      <button type="submit" class="search-submit-btn focus-ring">Search</button>
    </form>

    <!-- Category Filters -->
    <div class="chips-container" id="search-chips">
      ${['All', 'Songs', 'Music Videos'].map(cat => `
        <button class="chip ${cat === searchCategoryFilter ? 'active' : ''}" data-cat="${cat}">${cat}</button>
      `).join('')}
    </div>

    <!-- Recent Searches -->
    <div id="search-history-section" style="${!lastSearchQuery && history.length > 0 ? 'display:block;' : 'display:none;'} margin-bottom: 24px;">
      <h3 style="font-size:var(--text-md);color:var(--color-text-secondary);margin-bottom:12px;">Recent Searches</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${history.map(q => `
          <button class="chip search-history-chip" data-query="${escapeHtml(q)}">${escapeHtml(q)}</button>
        `).join('')}
      </div>
    </div>

    <!-- Results Container -->
    <div id="search-results-container">
      ${lastSearchQuery ? renderListRowSkeletons(6) : renderSearchEmptyState()}
    </div>
  `;

  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input-field');
  const clearBtn = document.getElementById('search-clear-btn');

  // Keystrokes ONLY toggle clear button to avoid exhausting daily API quota
  input.addEventListener('input', (e) => {
    const val = e.target.value;
    clearBtn.style.display = val ? 'flex' : 'none';
  });

  // Searches run only when submitted (Enter key / Search button tap)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) executeSearch(val);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    lastSearchQuery = '';
    document.getElementById('search-results-container').innerHTML = renderSearchEmptyState();
    document.getElementById('search-history-section').style.display = 'block';
  });

  container.querySelectorAll('#search-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      searchCategoryFilter = chip.dataset.cat;
      container.querySelectorAll('#search-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (input.value.trim()) executeSearch(input.value.trim());
    });
  });

  container.querySelectorAll('.search-history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.query;
      clearBtn.style.display = 'flex';
      executeSearch(chip.dataset.query);
    });
  });

  if (lastSearchQuery) {
    executeSearch(lastSearchQuery);
  }
}

function renderListRowSkeletons(count) {
  return Array(count).fill(0).map(() => `
    <div class="list-row">
      <div class="list-row-thumb skeleton"></div>
      <div class="list-row-info">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:6px;"></div>
        <div class="skeleton" style="height:12px;width:30%;"></div>
      </div>
    </div>
  `).join('');
}

function renderSearchEmptyState() {
  return `
    <div style="text-align:center;padding:60px 20px;">
      <div style="color:var(--color-text-muted);font-size:48px;margin-bottom:16px;">${ICONS.search}</div>
      <div style="font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:8px;">Find your favorite music</div>
      <div style="color:var(--color-text-secondary);font-size:var(--text-base);">Search for songs, artists, or lofi playlists to listen ad-free.</div>
    </div>
  `;
}

async function executeSearch(query) {
  const trimmed = query.trim();
  const resultsContainer = document.getElementById('search-results-container');
  const historySec = document.getElementById('search-history-section');
  if (!resultsContainer) return;

  if (!trimmed) {
    resultsContainer.innerHTML = renderSearchEmptyState();
    if (historySec) historySec.style.display = 'block';
    return;
  }

  if (historySec) historySec.style.display = 'none';
  lastSearchQuery = trimmed;
  Store.addSearchQuery(trimmed);

  // Check cache first to save API quota
  const cacheKey = 'ytm_sq_' + trimmed.toLowerCase();
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) {
        renderSearchResults(parsed, trimmed, resultsContainer);
        return;
      }
    } catch (e) {}
  }

  resultsContainer.innerHTML = renderListRowSkeletons(6);

  try {
    const results = await Api.search(trimmed);
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:var(--text-lg);color:var(--color-text);margin-bottom:8px;">No results found for "${escapeHtml(trimmed)}"</div>
          <div style="color:var(--color-text-secondary);font-size:var(--text-base);">Check your spelling or try different keywords.</div>
        </div>
      `;
      return;
    }

    // Save to cache
    try { sessionStorage.setItem(cacheKey, JSON.stringify(results)); } catch (e) {}
    Store.cacheTracks(results);
    renderSearchResults(results, trimmed, resultsContainer);
  } catch (err) {
    const isQuota = (err.message || '').toLowerCase().includes('quota');
    if (isQuota) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;max-width:480px;margin:20px auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:24px;">
          <div style="font-size:2.5rem;margin-bottom:12px;">⏳</div>
          <div style="font-size:var(--text-lg);font-weight:700;color:var(--color-text);margin-bottom:8px;">Daily Search Quota Reached</div>
          <div style="color:var(--color-text-secondary);font-size:var(--text-sm);line-height:1.6;margin-bottom:20px;">
            Google limits free YouTube searches to 100 queries/day per project. This quota resets automatically at midnight.
            <br><br>
            To continue searching immediately, paste a fresh free Google API key below:
          </div>
          <div style="display:flex;gap:8px;max-width:380px;margin:0 auto 12px auto;">
            <input type="text" id="quota-key-input" class="search-input" placeholder="Paste AIzaSy... key" style="padding:10px 14px;font-size:var(--text-sm);">
            <button id="quota-key-save-btn" class="search-submit-btn" style="padding:10px 18px;font-size:var(--text-sm);">Save</button>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);">
            Your songs in Library and cached searches continue to play without limit!
          </div>
        </div>
      `;
      const qInput = document.getElementById('quota-key-input');
      const qBtn = document.getElementById('quota-key-save-btn');
      if (qBtn && qInput) {
        qBtn.addEventListener('click', () => {
          const val = qInput.value.trim();
          if (val) {
            Api.setApiKey(val);
            showToast('New API Key saved!');
            executeSearch(trimmed);
          }
        });
      }
    } else {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
          <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
          <div style="font-size:var(--text-lg);font-weight:600;color:var(--color-text);margin-bottom:8px;">Search Request Issue</div>
          <div style="color:var(--color-text-secondary);font-size:var(--text-base);max-width:460px;margin:0 auto;line-height:1.5;">
            ${escapeHtml(err.message)}
          </div>
        </div>
      `;
    }
  }
}

function renderSearchResults(results, query, container) {
  container.innerHTML = results.map(t => {
    const safeId = escapeHtml(t.videoId);
    const safeTitle = escapeHtml(t.title);
    const safeArtist = escapeHtml(t.artist);
    const safeThumb = escapeHtml(t.thumbnail);
    const isLiked = Store.isLiked(t.videoId);

    return `
      <div class="list-row" data-video-id="${safeId}">
        <img class="list-row-thumb" src="${safeThumb}" alt="${safeTitle}" loading="lazy">
        <div class="list-row-info">
          <div class="list-row-title">${safeTitle}</div>
          <div class="list-row-artist">${safeArtist} ${t.duration ? '· ' + formatDuration(t.duration) : ''}</div>
        </div>
        <div class="list-row-actions">
          <button class="row-like-btn focus-ring" data-video-id="${safeId}" aria-label="Like" style="background:none;border:none;color:${isLiked ? 'var(--color-danger)' : 'var(--color-text-secondary)'};cursor:pointer;padding:8px;display:flex;">
            ${isLiked ? ICONS.heartFilled : ICONS.heart}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.list-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-like-btn')) return;
      const vid = row.dataset.videoId;
      Player.play(vid, results);
      showToast('Playing track...');
    });
  });

  container.querySelectorAll('.row-like-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const vid = btn.dataset.videoId;
      const liked = Store.toggleLike(vid);
      btn.innerHTML = liked ? ICONS.heartFilled : ICONS.heart;
      btn.style.color = liked ? 'var(--color-danger)' : 'var(--color-text-secondary)';
      showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    });
  });
}
}

// ── S03 Library Screen ──
function renderLibraryScreen() {
  const container = document.getElementById('screen-library');
  if (!container) return;

  const playlists = Store.getPlaylists();
  const liked = Store.getLiked();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-text);">Your Library</h1>
      <button id="btn-create-playlist" class="focus-ring" style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--color-accent);color:var(--color-text-on-accent);border:none;border-radius:var(--radius-full);font-size:var(--text-base);font-weight:var(--weight-medium);cursor:pointer;">
        ${ICONS.plus} New Playlist
      </button>
    </div>

    <!-- Tabs: Liked vs Playlists -->
    <div class="chips-container" style="margin-bottom:20px;">
      <button class="chip ${activeLibraryTab === 'liked' ? 'active' : ''}" id="tab-liked">Liked Songs (${liked.length})</button>
      <button class="chip ${activeLibraryTab === 'playlists' ? 'active' : ''}" id="tab-playlists">Playlists (${playlists.length})</button>
    </div>

    <!-- Content Area -->
    <div id="library-content-view"></div>
  `;

  document.getElementById('tab-liked').addEventListener('click', () => {
    activeLibraryTab = 'liked';
    renderLibraryScreen();
  });

  document.getElementById('tab-playlists').addEventListener('click', () => {
    activeLibraryTab = 'playlists';
    renderLibraryScreen();
  });

  document.getElementById('btn-create-playlist').addEventListener('click', () => {
    showCreatePlaylistModal();
  });

  const contentView = document.getElementById('library-content-view');
  if (activeLibraryTab === 'liked') {
    renderLikedSongs(contentView);
  } else {
    renderPlaylistsList(contentView);
  }
}

function renderLikedSongs(container) {
  const likedIds = Store.getLiked();
  if (likedIds.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="color:var(--color-text-muted);font-size:48px;margin-bottom:16px;">${ICONS.heart}</div>
        <div style="font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:8px;">No liked songs yet</div>
        <div style="color:var(--color-text-secondary);font-size:var(--text-base);">Tap the heart icon on any song while listening to save it here.</div>
      </div>
    `;
    return;
  }

  const tracks = likedIds.map(id => Store.getTrack(id) || {
    videoId: id,
    title: 'Cached Track',
    artist: 'Unknown Artist',
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    duration: 0
  });

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <button id="play-all-liked-btn" class="focus-ring" style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-full);cursor:pointer;font-weight:var(--weight-medium);">
        ${ICONS.play} Play All
      </button>
    </div>
    <div class="liked-songs-list">
      ${tracks.map((t, idx) => {
        const safeTitle = escapeHtml(t.title);
        const safeArtist = escapeHtml(t.artist);
        const safeThumb = escapeHtml(t.thumbnail);
        const safeId = escapeHtml(t.videoId);

        return `
          <div class="list-row" data-video-id="${safeId}">
            <span style="color:var(--color-text-muted);font-size:var(--text-sm);width:24px;text-align:center;">${idx + 1}</span>
            <img class="list-row-thumb" src="${safeThumb}" alt="${safeTitle}" loading="lazy">
            <div class="list-row-info">
              <div class="list-row-title">${safeTitle}</div>
              <div class="list-row-artist">${safeArtist}</div>
            </div>
            <button class="unlike-btn focus-ring" data-video-id="${safeId}" aria-label="Unlike" style="background:none;border:none;color:var(--color-danger);cursor:pointer;padding:8px;display:flex;">
              ${ICONS.heartFilled}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('play-all-liked-btn').addEventListener('click', () => {
    Player.play(tracks[0].videoId, tracks);
  });

  container.querySelectorAll('.list-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.unlike-btn')) return;
      const vid = row.dataset.videoId;
      Player.play(vid, tracks);
    });
  });

  container.querySelectorAll('.unlike-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const vid = btn.dataset.videoId;
      Store.toggleLike(vid);
      renderLibraryScreen();
      showToast('Removed from Liked Songs');
    });
  });
}

function renderPlaylistsList(container) {
  const playlists = Store.getPlaylists();
  if (playlists.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="color:var(--color-text-muted);font-size:48px;margin-bottom:16px;">${ICONS.listMusic}</div>
        <div style="font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:8px;">No playlists created yet</div>
        <div style="color:var(--color-text-secondary);font-size:var(--text-base);margin-bottom:16px;">Build your custom collections for workouts, focus, or travel.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:16px;">
      ${playlists.map(pl => {
        const safeName = escapeHtml(pl.name);
        const safeId = escapeHtml(pl.id);

        return `
          <div class="song-card playlist-card" data-playlist-id="${safeId}" style="padding:16px;">
            <div style="width:100%;aspect-ratio:1;background:var(--color-bg-elevated);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);margin-bottom:12px;font-size:36px;border:1px solid var(--color-border);">
              ${ICONS.listMusic}
            </div>
            <div style="font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:12px;">${pl.trackIds.length} tracks</div>
            <div style="display:flex;gap:8px;">
              <button class="pl-play-btn focus-ring" data-playlist-id="${safeId}" style="flex:1;padding:6px 12px;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-sm);display:flex;align-items:center;justify-content:center;gap:4px;">
                ${ICONS.play} Play
              </button>
              <button class="pl-delete-btn focus-ring" data-playlist-id="${safeId}" aria-label="Delete playlist" style="padding:6px 10px;background:var(--color-surface-hover);color:var(--color-danger);border:none;border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;">
                ${ICONS.trash}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.pl-play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pl = Store.getPlaylist(btn.dataset.playlistId);
      if (pl && pl.trackIds.length > 0) {
        const tracks = pl.trackIds.map(id => Store.getTrack(id) || { videoId: id, title: 'Track', artist: '' });
        Player.play(tracks[0].videoId, tracks);
        showToast(`Playing "${pl.name}"`);
      } else {
        showToast('Playlist is empty', 'info');
      }
    });
  });

  container.querySelectorAll('.pl-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this playlist?')) {
        Store.deletePlaylist(btn.dataset.playlistId);
        renderLibraryScreen();
        showToast('Playlist deleted');
      }
    });
  });
}

function showCreatePlaylistModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:16px;">Create Playlist</h3>
      <input type="text" id="modal-pl-name" class="search-input" placeholder="Playlist title" style="padding:10px 14px;margin-bottom:20px;" autofocus>
      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button id="modal-cancel-btn" style="padding:8px 16px;background:none;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:var(--text-base);">Cancel</button>
        <button id="modal-save-btn" style="padding:8px 20px;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-full);cursor:pointer;font-size:var(--text-base);font-weight:var(--weight-medium);">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#modal-pl-name');
  const saveBtn = modal.querySelector('#modal-save-btn');
  const cancelBtn = modal.querySelector('#modal-cancel-btn');

  function close() {
    modal.remove();
  }

  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  saveBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) {
      input.style.borderColor = 'var(--color-danger)';
      return;
    }
    Store.createPlaylist(name);
    close();
    renderLibraryScreen();
    showToast(`Created playlist "${name}"`);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') close();
  });
}

function showSettingsModal() {
  const currentKey = Api.getApiKey();
  const maskedKey = maskApiKey(currentKey);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);color:var(--color-text);margin-bottom:12px;">Security & API Key Settings</h3>
      <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:16px;line-height:1.5;">
        ${currentKey ? `✅ <strong style="color:var(--color-success)">Custom API Key Active:</strong> <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#fff;">${escapeHtml(maskedKey)}</code>` : 'ℹ️ Currently using the <strong>public Piped fallback</strong>. Paste your own key below if desired.'}
      </p>
      
      <div style="margin-bottom:16px;position:relative;">
        <label style="display:block;font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:6px;">YouTube Data API v3 Key</label>
        <div style="position:relative;display:flex;align-items:center;">
          <input type="password" id="modal-api-key-input" class="search-input" placeholder="Paste your API key here..." value="${escapeHtml(currentKey)}" autocomplete="off" spellcheck="false" style="padding:10px 44px 10px 14px;">
          <button id="modal-toggle-vis" type="button" aria-label="Toggle Key Visibility" style="position:absolute;right:12px;background:none;border:none;color:var(--color-text-muted);cursor:pointer;padding:4px;display:flex;">
            👁️
          </button>
        </div>
      </div>

      <div style="background:rgba(255, 152, 0, 0.08);border:1px solid rgba(255, 152, 0, 0.25);border-radius:var(--radius-md);padding:12px;margin-bottom:20px;font-size:var(--text-xs);color:var(--color-text-secondary);line-height:1.4;">
        <strong style="color:#ffb74d;">🛡️ Cyber Security Best Practice:</strong><br>
        To prevent unauthorized use if someone discovers your key, go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--color-accent);text-decoration:underline;">Google Cloud Console → Credentials</a>, click on your key, and under <strong>Application restrictions</strong>, select <strong>Websites</strong> and restrict it to:
        <br><code style="color:#fff;background:rgba(0,0,0,0.4);padding:1px 4px;border-radius:3px;">http://localhost:*/*</code>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        ${currentKey ? `<button id="modal-clear-key-btn" style="padding:8px 12px;background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:var(--text-sm);">Remove Key</button>` : '<div></div>'}
        <div style="display:flex;gap:12px;">
          <button id="modal-api-cancel-btn" style="padding:8px 16px;background:none;border:none;color:var(--color-text-secondary);cursor:pointer;font-size:var(--text-base);">Close</button>
          <button id="modal-api-save-btn" style="padding:8px 20px;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-full);cursor:pointer;font-size:var(--text-base);font-weight:var(--weight-medium);">Save Key</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#modal-api-key-input');
  const visBtn = modal.querySelector('#modal-toggle-vis');
  const saveBtn = modal.querySelector('#modal-api-save-btn');
  const cancelBtn = modal.querySelector('#modal-api-cancel-btn');
  const clearBtn = modal.querySelector('#modal-clear-key-btn');

  let isMasked = true;
  visBtn.addEventListener('click', () => {
    isMasked = !isMasked;
    input.type = isMasked ? 'password' : 'text';
    visBtn.textContent = isMasked ? '👁️' : '🔒';
  });

  function close() {
    modal.remove();
  }

  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  saveBtn.addEventListener('click', () => {
    const key = input.value.trim();
    Api.setApiKey(key);
    close();
    showToast(key ? 'YouTube API Key updated securely' : 'Switched to public fallback');
    if (currentRoute === 'home') renderHomeScreen();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      Api.setApiKey('');
      close();
      showToast('API Key removed; using public fallback');
      if (currentRoute === 'home') renderHomeScreen();
    });
  }
}

// ── App Bootstrapper ──
function bootstrap() {
  Player.init();
  initMiniPlayer();
  initRouter();
  initMediaSession();
  initKeyboardShortcuts();

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showSettingsModal);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
