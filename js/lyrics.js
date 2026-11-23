/**
 * lyrics.js — Real-time lyrics fetcher and parser using free lrclib.net API
 */

function cleanTrackTitle(title) {
  if (!title) return '';
  return title
    .replace(/(\(|\[)(official\s*(music\s*)?(video|audio|visualizer|lyric\s*video|hd|hq|4k)?|ft\.?.*|feat\.?.*)(\)|\])/gi, '')
    .replace(/\|\s*.*/g, '')
    .replace(/-\s*official\s*.*/gi, '')
    .trim();
}

function parseLrc(lrcText) {
  if (!lrcText) return null;
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseFloat('0.' + match[3]);
      const time = min * 60 + sec + ms;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.length > 0 ? result : null;
}

export const Lyrics = {
  async getLyrics(title, artist) {
    const cleanTitle = cleanTrackTitle(title);
    const cleanArtist = (artist || '').replace(/VEVO|Official|Topic/gi, '').trim();

    // 1. Try exact match
    try {
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics || data.plainLyrics) {
          return {
            synced: parseLrc(data.syncedLyrics),
            plain: data.plainLyrics,
            isSynced: Boolean(data.syncedLyrics),
          };
        }
      }
    } catch (e) {
      // Continue to search fallback
    }

    // 2. Try fuzzy search
    try {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const match = results.find(r => r.syncedLyrics || r.plainLyrics) || results[0];
          return {
            synced: parseLrc(match.syncedLyrics),
            plain: match.plainLyrics,
            isSynced: Boolean(match.syncedLyrics),
          };
        }
      }
    } catch (e) {
      console.warn('Lyrics fetch failed:', e);
    }

    return null;
  }
};
