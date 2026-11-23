const KEYS = {
  liked: 'ytm_liked',
  playlists: 'ytm_playlists',
  queue: 'ytm_queue',
  playback: 'ytm_playback',
  searchHistory: 'ytm_search_history',
  trackCache: 'ytm_track_cache',
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const Store = {
  // ── Liked Songs ──
  getLiked() {
    return read(KEYS.liked) || [];
  },
  isLiked(videoId) {
    return this.getLiked().includes(videoId);
  },
  toggleLike(videoId) {
    const liked = this.getLiked();
    const idx = liked.indexOf(videoId);
    if (idx >= 0) {
      liked.splice(idx, 1);
    } else {
      liked.unshift(videoId);
    }
    write(KEYS.liked, liked);
    window.dispatchEvent(new CustomEvent('store:liked', { detail: { videoId, liked: idx < 0 } }));
    return idx < 0;
  },

  // ── Playlists ──
  getPlaylists() {
    return read(KEYS.playlists) || [];
  },
  getPlaylist(id) {
    return this.getPlaylists().find(p => p.id === id) || null;
  },
  createPlaylist(name) {
    const playlists = this.getPlaylists();
    const pl = {
      id: 'pl_' + Date.now(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackIds: [],
    };
    playlists.unshift(pl);
    write(KEYS.playlists, playlists);
    window.dispatchEvent(new CustomEvent('store:playlists'));
    return pl;
  },
  renamePlaylist(id, newName) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === id);
    if (pl) {
      pl.name = newName.trim();
      pl.updatedAt = new Date().toISOString();
      write(KEYS.playlists, playlists);
      window.dispatchEvent(new CustomEvent('store:playlists'));
    }
  },
  deletePlaylist(id) {
    const playlists = this.getPlaylists().filter(p => p.id !== id);
    write(KEYS.playlists, playlists);
    window.dispatchEvent(new CustomEvent('store:playlists'));
  },
  addToPlaylist(playlistId, videoId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl && !pl.trackIds.includes(videoId)) {
      pl.trackIds.push(videoId);
      pl.updatedAt = new Date().toISOString();
      write(KEYS.playlists, playlists);
      window.dispatchEvent(new CustomEvent('store:playlists'));
      return true;
    }
    return false;
  },
  removeFromPlaylist(playlistId, videoId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.trackIds = pl.trackIds.filter(id => id !== videoId);
      pl.updatedAt = new Date().toISOString();
      write(KEYS.playlists, playlists);
      window.dispatchEvent(new CustomEvent('store:playlists'));
    }
  },

  // ── Queue ──
  getQueue() {
    return read(KEYS.queue) || { tracks: [], currentIndex: 0, shuffled: false, repeatMode: 'off' };
  },
  saveQueue(queue) {
    write(KEYS.queue, queue);
    window.dispatchEvent(new CustomEvent('store:queue'));
  },

  // ── Playback State ──
  getPlayback() {
    return read(KEYS.playback) || { videoId: null, positionSec: 0, volume: 80 };
  },
  savePlayback(state) {
    write(KEYS.playback, state);
  },

  // ── Track Cache ──
  getTrack(videoId) {
    const cache = read(KEYS.trackCache) || {};
    return cache[videoId] || null;
  },
  cacheTracks(tracks) {
    const cache = read(KEYS.trackCache) || {};
    for (const t of tracks) {
      cache[t.videoId] = {
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        duration: t.duration,
      };
    }
    write(KEYS.trackCache, cache);
  },
  getAllCachedTracks() {
    return read(KEYS.trackCache) || {};
  },

  // ── Search History ──
  getSearchHistory() {
    return read(KEYS.searchHistory) || [];
  },
  addSearchQuery(query) {
    const q = query.trim();
    if (!q) return;
    let history = this.getSearchHistory().filter(h => h !== q);
    history.unshift(q);
    if (history.length > 20) history = history.slice(0, 20);
    write(KEYS.searchHistory, history);
  },
};
