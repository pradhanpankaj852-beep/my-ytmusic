import { decodeHtml } from './utils/sanitize.js';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
];

let pipedIndex = 0;

function pipedBase() {
  return PIPED_INSTANCES[pipedIndex % PIPED_INSTANCES.length];
}

function rotatePiped() {
  pipedIndex++;
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

function mapPipedItem(item) {
  const id = item.url ? item.url.replace('/watch?v=', '') : (item.id || '');
  return {
    videoId: id,
    title: item.title || 'Untitled',
    artist: item.uploaderName || item.uploader || 'Unknown Artist',
    thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    duration: item.duration || 0,
  };
}

function mapYTItem(item, details) {
  const id = typeof item.id === 'object' ? item.id.videoId : item.id;
  const snippet = item.snippet || {};
  let duration = 0;
  if (details && details.contentDetails) {
    duration = parseDuration(details.contentDetails.duration);
  }
  return {
    videoId: id,
    title: decodeHtml(snippet.title || 'Untitled'),
    artist: decodeHtml(snippet.channelTitle || 'Unknown Artist'),
    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    duration,
  };
}

const API_KEY_STORAGE = 'ytm_api_key';

export const Api = {
  getApiKey() {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved && saved.trim() && saved.trim().startsWith('AIzaSy')) {
      return saved.trim();
    }
    return '';
  },
  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  },

  async searchPiped(query, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const url = `${pipedBase()}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        return (data.items || []).filter(i => i.type === 'stream').map(mapPipedItem);
      } catch {
        rotatePiped();
      }
    }
    return [];
  },

  async trendingPiped(region = 'US', retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const url = `${pipedBase()}/trending?region=${region}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        return (data || []).filter(i => i.duration > 0 && i.duration < 600).map(mapPipedItem);
      } catch {
        rotatePiped();
      }
    }
    return [];
  },

  async searchYT(query) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('API_KEY_REQUIRED');
    }
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(query)}&key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        console.error('YouTube Search API Error:', msg);
        throw new Error(msg);
      }
      let data = await res.json();
      if (!data.items || data.items.length === 0) {
        const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query + ' audio')}&key=${key}`;
        const fbRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(5000) });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData.items && fbData.items.length > 0) data = fbData;
        }
      }
      const ids = (data.items || []).map(i => i.id?.videoId).filter(Boolean).join(',');
      if (!ids) return [];
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${key}`;
      const detailRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(5000) });
      const detailData = detailRes.ok ? await detailRes.json() : { items: [] };
      const detailsMap = {};
      for (const d of (detailData.items || [])) detailsMap[d.id] = d;
      const mapped = data.items.map(i => mapYTItem(i, detailsMap[i.id?.videoId]));

      // Prioritize Clean Audio / Topic releases (these have 0 dialogue skits and minimal/no video ad pre-rolls)
      mapped.sort((a, b) => {
        const score = (t) => {
          let s = 0;
          const text = (t.title + ' ' + t.artist).toLowerCase();
          if (text.includes('- topic')) s += 10;
          if (text.includes('official audio') || text.includes('audio')) s += 6;
          if (text.includes('lyrics') || text.includes('lyric')) s += 4;
          if (text.includes('official music video') || text.includes('official video')) s -= 2;
          return s;
        };
        return score(b) - score(a);
      });

      return mapped;
    } catch (err) {
      console.warn('YouTube API failed, trying fallback:', err.message);
      const fallbackResults = await this.searchPiped(query);
      if (fallbackResults && fallbackResults.length > 0) return fallbackResults;
      throw err;
    }
  },

  async trendingYT(region = 'US') {
    const key = this.getApiKey();
    if (!key) return [];
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&maxResults=30&regionCode=${region}&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return data.items.map(i => mapYTItem(i, i));
    } catch {
      return [];
    }
  },

  async search(query) {
    return this.searchYT(query);
  },

  async trending(region = 'US') {
    return this.trendingYT(region);
  },
};
