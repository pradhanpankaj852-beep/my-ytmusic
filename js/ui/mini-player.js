import ICONS from '../icons.js';
import { Store } from '../store.js';
import { Player, onPlayerEvent } from '../player.js';
import { Lyrics } from '../lyrics.js';
import { showToast } from './toast.js';
import { escapeHtml } from '../utils/sanitize.js';

let miniEl = null;
let fullscreenEl = null;
let currentTab = 'queue';
let currentLyricsData = null;
let activeLyricsVideoId = null;

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTrackInfo(videoId) {
  return Store.getTrack(videoId) || { title: 'Loading...', artist: '', thumbnail: '', duration: 0 };
}

export function initMiniPlayer() {
  miniEl = document.getElementById('mini-player');
  if (!miniEl) return;

  miniEl.innerHTML = `
    <div class="mini-player-inner glass-player" style="display:none;position:fixed;bottom:16px;left:50%;transform:translateX(-50%);width:min(860px,calc(100% - 32px));height:66px;z-index:var(--z-mini-player);padding:0 16px;align-items:center;gap:14px;cursor:pointer;border-radius:22px;border:1px solid rgba(255,255,255,0.12);box-shadow:0 16px 40px rgba(0,0,0,0.65),0 0 24px rgba(52,120,198,0.15);overflow:hidden;" role="region" aria-label="Now playing">
      <div style="position:relative;width:46px;height:46px;flex-shrink:0;">
        <img class="mp-thumb" src="" alt="" style="width:100%;height:100%;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
      </div>
      <div class="mp-info" style="flex:1;min-width:0;">
        <div class="mp-title" style="color:var(--color-text);font-size:var(--text-base);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em;"></div>
        <div class="mp-artist" style="color:var(--color-text-secondary);font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      </div>
      <button class="mp-like focus-ring hover-brighten" aria-label="Like" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:8px;display:flex;">${ICONS.heart}</button>
      <button class="mp-prev focus-ring hover-brighten" aria-label="Previous" style="background:none;border:none;color:var(--color-text);cursor:pointer;padding:8px;display:flex;">${ICONS.skipPrev}</button>
      <button class="mp-play focus-ring" aria-label="Play" style="background:var(--color-text);border:none;color:var(--color-bg);cursor:pointer;padding:8px;border-radius:var(--radius-full);display:flex;width:38px;height:38px;align-items:center;justify-content:center;transition:transform var(--duration-fast) var(--ease-spring);box-shadow:0 2px 8px rgba(255,255,255,0.2);">${ICONS.play}</button>
      <button class="mp-next focus-ring hover-brighten" aria-label="Next" style="background:none;border:none;color:var(--color-text);cursor:pointer;padding:8px;display:flex;">${ICONS.skipNext}</button>
      <div class="mp-progress-wrap" style="position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.08);cursor:pointer;">
        <div class="mp-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--color-accent),#6e9eff);width:0%;transition:width 0.5s linear;border-radius:0 var(--radius-full) var(--radius-full) 0;box-shadow:0 0 8px rgba(74,144,217,0.5);"></div>
      </div>
    </div>
  `;

  const inner = miniEl.querySelector('.mini-player-inner');
  const thumb = miniEl.querySelector('.mp-thumb');
  const title = miniEl.querySelector('.mp-title');
  const artist = miniEl.querySelector('.mp-artist');
  const playBtn = miniEl.querySelector('.mp-play');
  const prevBtn = miniEl.querySelector('.mp-prev');
  const nextBtn = miniEl.querySelector('.mp-next');
  const likeBtn = miniEl.querySelector('.mp-like');
  const progressWrap = miniEl.querySelector('.mp-progress-wrap');
  const progressBar = miniEl.querySelector('.mp-progress-bar');

  function updateTrackDisplay(videoId) {
    if (!videoId) { inner.style.display = 'none'; return; }
    inner.style.display = 'flex';
    const info = getTrackInfo(videoId);
    thumb.src = info.thumbnail;
    thumb.alt = info.title;
    title.textContent = info.title;
    artist.textContent = info.artist;
    updateLikeBtn(videoId);
  }

  function updateLikeBtn(videoId) {
    const liked = Store.isLiked(videoId);
    likeBtn.innerHTML = liked ? ICONS.heartFilled : ICONS.heart;
    likeBtn.style.color = liked ? 'var(--color-danger)' : 'var(--color-text-secondary)';
    likeBtn.setAttribute('aria-pressed', liked);
  }

  playBtn.addEventListener('click', (e) => { e.stopPropagation(); Player.playPause(); });
  playBtn.addEventListener('mousedown', () => { playBtn.style.transform = 'scale(0.90)'; });
  playBtn.addEventListener('mouseup', () => { playBtn.style.transform = 'scale(1)'; });
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); Player.prev(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); Player.next(); });
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const vid = Player.currentVideoId();
    if (vid) {
      const liked = Store.toggleLike(vid);
      updateLikeBtn(vid);
      showToast(liked ? 'Added to liked songs' : 'Removed from liked songs');
    }
  });

  progressWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = progressWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    Player.seek(pct * Player.getDuration());
  });

  inner.addEventListener('click', () => openFullscreen());

  onPlayerEvent((ev) => {
    if (ev.type === 'trackChange') updateTrackDisplay(ev.videoId);
    if (ev.type === 'playing') { playBtn.innerHTML = ICONS.pause; playBtn.setAttribute('aria-label', 'Pause'); }
    if (ev.type === 'paused') { playBtn.innerHTML = ICONS.play; playBtn.setAttribute('aria-label', 'Play'); }
    if (ev.type === 'timeupdate') {
      const pct = ev.duration > 0 ? (ev.current / ev.duration) * 100 : 0;
      progressBar.style.width = pct + '%';
    }
  });

  window.addEventListener('store:liked', () => {
    const vid = Player.currentVideoId();
    if (vid) updateLikeBtn(vid);
  });

  const savedQ = Store.getQueue();
  if (savedQ.tracks.length > 0) {
    updateTrackDisplay(savedQ.tracks[savedQ.currentIndex]);
  }
}

// ── Fullscreen Player with Liquid Glass & Apple Music-Style Synced Lyrics ──

export function openFullscreen() {
  if (fullscreenEl) {
    fullscreenEl.style.display = 'flex';
    const vid = Player.currentVideoId();
    if (vid) updateFsTrack(vid);
    return;
  }

  fullscreenEl = document.createElement('div');
  fullscreenEl.id = 'fullscreen-player';
  fullscreenEl.style.cssText = `
    position:fixed;inset:0;z-index:var(--z-fullscreen);display:flex;flex-direction:column;
    align-items:center;justify-content:space-between;
    padding:0 16px max(16px, env(safe-area-inset-bottom)) 16px;
    background:linear-gradient(180deg, #141b27 0%, #090c12 40%, #030303 100%);
    overflow-y:auto;overflow-x:hidden;backdrop-filter:blur(36px);
  `;

  fullscreenEl.innerHTML = `
    <!-- Top Bar with Safe-Area Inset (Clean Header, no dummy buttons) -->
    <div class="fs-top-bar" style="width:100%;max-width:500px;display:flex;align-items:center;justify-content:space-between;padding:max(14px,env(safe-area-inset-top)) 4px 10px 4px;z-index:10;flex-shrink:0;">
      <button class="fs-close focus-ring hover-brighten" aria-label="Collapse" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:50%;color:var(--color-text);cursor:pointer;padding:10px;display:flex;backdrop-filter:blur(10px);">${ICONS.chevronDown}</button>
      
      <div style="font-size:13px;font-weight:600;color:var(--color-text-secondary);letter-spacing:0.04em;text-transform:uppercase;">
        Now Playing
      </div>

      <div style="width:36px;height:36px;"></div>
    </div>
    
    <!-- Ambient Art Wrap -->
    <div style="position:relative;margin:4px 0 14px 0;display:flex;justify-content:center;flex-shrink:0;">
      <div id="fs-art-glow" style="position:absolute;inset:-10px;filter:blur(36px);opacity:0.6;border-radius:var(--radius-xl);background:var(--color-accent);z-index:0;transition:all 1s ease;"></div>
      <img class="fs-art" src="" alt="" style="position:relative;z-index:1;width:min(280px,64vw);height:min(280px,64vw);border-radius:20px;object-fit:cover;box-shadow:0 16px 40px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.12);">
    </div>

    <!-- Title and Artist Row -->
    <div style="width:min(440px,90vw);display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0;">
      <div style="flex:1;min-width:0;text-align:left;padding-right:12px;">
        <div class="fs-title" style="color:var(--color-text);font-size:1.25rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.02em;"></div>
        <div class="fs-artist" style="color:var(--color-text-secondary);font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;font-weight:500;"></div>
      </div>
      <button class="fs-like focus-ring hover-brighten" aria-label="Like" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:8px;display:flex;flex-shrink:0;">${ICONS.heart}</button>
    </div>

    <!-- Progress Bar -->
    <div class="fs-progress-container" style="width:min(440px,90vw);margin-bottom:12px;flex-shrink:0;">
      <div class="fs-progress-wrap" style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:var(--radius-full);cursor:pointer;position:relative;">
        <div class="fs-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--color-accent),#6e9eff);width:0%;border-radius:var(--radius-full);transition:width 0.5s linear;box-shadow:0 0 10px rgba(110,158,255,0.5);"></div>
        <div class="fs-progress-thumb" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#ffffff;opacity:0;transition:opacity var(--duration-fast) var(--ease-out);left:0;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;">
        <span class="fs-time-current" style="color:var(--color-text-muted);font-size:var(--text-sm);font-variant-numeric:tabular-nums;">0:00</span>
        <span class="fs-time-total" style="color:var(--color-text-muted);font-size:var(--text-sm);font-variant-numeric:tabular-nums;">0:00</span>
      </div>
    </div>

    <!-- Transport Buttons -->
    <div class="fs-controls" style="display:flex;align-items:center;gap:24px;margin-bottom:14px;flex-shrink:0;">
      <button class="fs-shuffle focus-ring hover-brighten" aria-label="Shuffle" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:8px;display:flex;">${ICONS.shuffle}</button>
      <button class="fs-prev focus-ring hover-brighten" aria-label="Previous" style="background:none;border:none;color:var(--color-text);cursor:pointer;padding:8px;display:flex;">${ICONS.skipPrev}</button>
      <button class="fs-play focus-ring" aria-label="Play" style="background:#ffffff;border:none;color:#030303;cursor:pointer;padding:12px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;width:56px;height:56px;transition:transform var(--duration-fast) var(--ease-spring);box-shadow:0 8px 24px rgba(255,255,255,0.3);">${ICONS.play}</button>
      <button class="fs-next focus-ring hover-brighten" aria-label="Next" style="background:none;border:none;color:var(--color-text);cursor:pointer;padding:8px;display:flex;">${ICONS.skipNext}</button>
      <button class="fs-repeat focus-ring hover-brighten" aria-label="Repeat" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:8px;display:flex;">${ICONS.repeat}</button>
    </div>

    <!-- Secondary Utilities -->
    <div class="fs-secondary" style="display:flex;align-items:center;gap:18px;margin-bottom:14px;flex-shrink:0;">
      <button class="fs-add-playlist focus-ring hover-brighten" aria-label="Add to playlist" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:8px;display:flex;">${ICONS.addToPlaylist}</button>
      <div class="fs-volume-wrap" style="display:flex;align-items:center;gap:8px;">
        <button class="fs-vol-btn focus-ring hover-brighten" aria-label="Mute" style="background:none;border:none;color:var(--color-text-secondary);cursor:pointer;padding:4px;display:flex;">${ICONS.volume}</button>
        <input class="fs-vol-slider" type="range" min="0" max="100" value="80" aria-label="Volume" style="width:100px;accent-color:var(--color-accent);cursor:pointer;">
      </div>
    </div>

    <!-- Pill Tabs -->
    <div class="fs-tabs" style="display:flex;gap:8px;background:rgba(255,255,255,0.06);padding:4px;border-radius:var(--radius-full);width:min(460px,90vw);margin-bottom:10px;border:1px solid rgba(255,255,255,0.08);flex-shrink:0;">
      <button class="fs-tab focus-ring" data-tab="queue" style="flex:1;padding:8px;background:var(--color-accent);border:none;border-radius:var(--radius-full);color:#fff;font-size:var(--text-base);font-weight:600;cursor:pointer;transition:all 0.2s ease;">Queue</button>
      <button class="fs-tab focus-ring" data-tab="lyrics" style="flex:1;padding:8px;background:transparent;border:none;border-radius:var(--radius-full);color:var(--color-text-secondary);font-size:var(--text-base);font-weight:600;cursor:pointer;transition:all 0.2s ease;">✨ Live Lyrics</button>
    </div>

    <!-- Tab Panels Container (Flex-1 fills remaining space cleanly to avoid black void) -->
    <div class="fs-panel" style="width:min(460px,94vw);flex:1;min-height:180px;max-height:360px;overflow-y:auto;scroll-behavior:smooth;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);padding:8px;margin-bottom:4px;">
      <div class="fs-queue-panel"></div>
      <div class="fs-lyrics-panel" style="display:none;padding:12px 6px;min-height:100%;"></div>
    </div>
  `;

  document.body.appendChild(fullscreenEl);

  const closeBtn = fullscreenEl.querySelector('.fs-close');
  const art = fullscreenEl.querySelector('.fs-art');
  const fsTitle = fullscreenEl.querySelector('.fs-title');
  const fsArtist = fullscreenEl.querySelector('.fs-artist');
  const fsPlay = fullscreenEl.querySelector('.fs-play');
  const fsPrev = fullscreenEl.querySelector('.fs-prev');
  const fsNext = fullscreenEl.querySelector('.fs-next');
  const fsShuffle = fullscreenEl.querySelector('.fs-shuffle');
  const fsRepeat = fullscreenEl.querySelector('.fs-repeat');
  const fsLike = fullscreenEl.querySelector('.fs-like');
  const fsAddPl = fullscreenEl.querySelector('.fs-add-playlist');
  const fsProgressWrap = fullscreenEl.querySelector('.fs-progress-wrap');
  const fsProgressBar = fullscreenEl.querySelector('.fs-progress-bar');
  const fsProgressThumb = fullscreenEl.querySelector('.fs-progress-thumb');
  const fsCurrent = fullscreenEl.querySelector('.fs-time-current');
  const fsTotal = fullscreenEl.querySelector('.fs-time-total');
  const fsVolBtn = fullscreenEl.querySelector('.fs-vol-btn');
  const fsVolSlider = fullscreenEl.querySelector('.fs-vol-slider');
  const queuePanel = fullscreenEl.querySelector('.fs-queue-panel');
  const lyricsPanel = fullscreenEl.querySelector('.fs-lyrics-panel');
  const tabs = fullscreenEl.querySelectorAll('.fs-tab');

  closeBtn.addEventListener('click', () => { fullscreenEl.style.display = 'none'; });

  fsPlay.addEventListener('click', () => Player.playPause());
  fsPlay.addEventListener('mousedown', () => { fsPlay.style.transform = 'scale(0.90)'; });
  fsPlay.addEventListener('mouseup', () => { fsPlay.style.transform = 'scale(1)'; });
  fsPrev.addEventListener('click', () => Player.prev());
  fsNext.addEventListener('click', () => Player.next());

  fsShuffle.addEventListener('click', () => {
    Player.toggleShuffle();
    const q = Store.getQueue();
    fsShuffle.style.color = q.shuffled ? 'var(--color-accent)' : 'var(--color-text-secondary)';
    renderQueue();
  });

  fsRepeat.addEventListener('click', () => {
    const mode = Player.cycleRepeat();
    fsRepeat.style.color = mode === 'off' ? 'var(--color-text-secondary)' : 'var(--color-accent)';
    fsRepeat.innerHTML = mode === 'one' ? ICONS.repeatOne : ICONS.repeat;
  });

  fsLike.addEventListener('click', () => {
    const vid = Player.currentVideoId();
    if (vid) {
      const liked = Store.toggleLike(vid);
      updateFsLike(vid);
      showToast(liked ? 'Added to liked songs' : 'Removed from liked songs');
    }
  });

  fsAddPl.addEventListener('click', () => {
    const vid = Player.currentVideoId();
    if (vid) showAddToPlaylistModal(vid);
  });

  fsProgressWrap.addEventListener('mouseenter', () => { fsProgressThumb.style.opacity = '1'; });
  fsProgressWrap.addEventListener('mouseleave', () => { fsProgressThumb.style.opacity = '0'; });
  fsProgressWrap.addEventListener('click', (e) => {
    const rect = fsProgressWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    Player.seek(pct * Player.getDuration());
  });

  let prevVolume = 80;
  fsVolBtn.addEventListener('click', () => {
    if (Player.getVolume() > 0) {
      prevVolume = Player.getVolume();
      Player.setVolume(0);
      fsVolSlider.value = 0;
      fsVolBtn.innerHTML = ICONS.volumeMute;
    } else {
      Player.setVolume(prevVolume);
      fsVolSlider.value = prevVolume;
      fsVolBtn.innerHTML = ICONS.volume;
    }
  });
  fsVolSlider.addEventListener('input', () => {
    Player.setVolume(parseInt(fsVolSlider.value));
    fsVolBtn.innerHTML = parseInt(fsVolSlider.value) === 0 ? ICONS.volumeMute : ICONS.volume;
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      tabs.forEach(t => {
        const isActive = t.dataset.tab === currentTab;
        t.style.background = isActive ? 'var(--color-accent)' : 'transparent';
        t.style.color = isActive ? '#fff' : 'var(--color-text-secondary)';
      });
      queuePanel.style.display = currentTab === 'queue' ? 'block' : 'none';
      lyricsPanel.style.display = currentTab === 'lyrics' ? 'block' : 'none';
      if (currentTab === 'lyrics') renderLyrics();
    });
  });

  function updateFsLike(videoId) {
    const liked = Store.isLiked(videoId);
    fsLike.innerHTML = liked ? ICONS.heartFilled : ICONS.heart;
    fsLike.style.color = liked ? 'var(--color-danger)' : 'var(--color-text-secondary)';
  }

  function updateFsTrack(videoId) {
    if (!videoId) return;
    const info = getTrackInfo(videoId);
    art.src = info.thumbnail;
    art.alt = info.title;
    fsTitle.textContent = info.title;
    fsArtist.textContent = info.artist;
    updateFsLike(videoId);
    renderQueue();
    if (activeLyricsVideoId !== videoId) {
      currentLyricsData = null;
      activeLyricsVideoId = videoId;
      if (currentTab === 'lyrics') renderLyrics();
    }
  }

  function renderQueue() {
    const q = Store.getQueue();
    if (q.tracks.length === 0) {
      queuePanel.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-muted);font-size:var(--text-base);">Queue is empty.</div>';
      return;
    }
    queuePanel.innerHTML = q.tracks.map((id, i) => {
      const info = getTrackInfo(id);
      const isCurrent = i === q.currentIndex;
      return `
        <div class="queue-item" data-index="${i}" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;cursor:pointer;margin-bottom:4px;backdrop-filter:blur(10px);transition:all 0.2s ease;${isCurrent ? 'background:rgba(52,120,198,0.25);border:1px solid rgba(52,120,198,0.4);' : 'background:rgba(255,255,255,0.03);'}" role="option" ${isCurrent ? 'aria-current="true"' : ''}>
          <span style="color:var(--color-text-muted);font-size:var(--text-sm);width:20px;text-align:center;">${isCurrent ? '▶' : i + 1}</span>
          <img src="${info.thumbnail}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">
          <div style="flex:1;min-width:0;">
            <div style="color:${isCurrent ? '#fff' : 'var(--color-text)'};font-size:var(--text-base);font-weight:${isCurrent ? '600' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info.title}</div>
            <div style="color:var(--color-text-secondary);font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info.artist}</div>
          </div>
          <span style="color:var(--color-text-muted);font-size:var(--text-sm);">${formatTime(info.duration)}</span>
        </div>
      `;
    }).join('');

    queuePanel.querySelectorAll('.queue-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        const q = Store.getQueue();
        q.currentIndex = idx;
        Store.saveQueue(q);
        Player.play(q.tracks[idx]);
      });
    });
  }

  async function renderLyrics() {
    const vid = Player.currentVideoId();
    if (!vid) return;
    const info = getTrackInfo(vid);

    if (!currentLyricsData) {
      lyricsPanel.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
          <div class="skeleton" style="height:24px;width:70%;margin:0 auto 16px auto;border-radius:8px;"></div>
          <div class="skeleton" style="height:20px;width:55%;margin:0 auto 16px auto;border-radius:8px;"></div>
          <div class="skeleton" style="height:20px;width:65%;margin:0 auto;border-radius:8px;"></div>
          <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-top:16px;">Searching live lyrics...</p>
        </div>
      `;

      currentLyricsData = await Lyrics.getLyrics(info.title, info.artist);
    }

    if (!currentLyricsData) {
      lyricsPanel.innerHTML = `
        <div style="text-align:center;padding:50px 20px;">
          <div style="color:var(--color-text-muted);font-size:44px;margin-bottom:12px;">${ICONS.lyrics}</div>
          <div style="color:var(--color-text);font-size:var(--text-md);font-weight:600;margin-bottom:6px;">Lyrics not found</div>
          <div style="color:var(--color-text-secondary);font-size:var(--text-sm);">No lyric transcriptions available for this recording yet.</div>
        </div>
      `;
      return;
    }

    if (currentLyricsData.isSynced && currentLyricsData.synced) {
      lyricsPanel.innerHTML = currentLyricsData.synced.map((line, idx) => `
        <div class="synced-lyric-line" data-time="${line.time}" data-index="${idx}" style="padding:10px 12px;border-radius:12px;font-size:1.15rem;font-weight:600;color:rgba(255,255,255,0.35);cursor:pointer;transition:all 0.3s cubic-bezier(0.25, 1, 0.5, 1);line-height:1.4;">
          ${line.text}
        </div>
      `).join('');

      lyricsPanel.querySelectorAll('.synced-lyric-line').forEach(el => {
        el.addEventListener('click', () => {
          const t = parseFloat(el.dataset.time);
          Player.seek(t);
        });
      });
    } else {
      lyricsPanel.innerHTML = `
        <div style="font-size:1.05rem;line-height:1.8;color:var(--color-text);white-space:pre-line;padding:12px;text-align:center;">
          ${currentLyricsData.plain}
        </div>
      `;
    }
  }

  function updateSyncedLyricsHighlight(currentSec) {
    if (currentTab !== 'lyrics' || !currentLyricsData || !currentLyricsData.isSynced || !currentLyricsData.synced) return;
    const lines = lyricsPanel.querySelectorAll('.synced-lyric-line');
    if (lines.length === 0) return;

    let activeIdx = -1;
    const synced = currentLyricsData.synced;
    for (let i = 0; i < synced.length; i++) {
      if (currentSec >= synced[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    lines.forEach((lineEl, i) => {
      if (i === activeIdx) {
        lineEl.style.color = '#ffffff';
        lineEl.style.transform = 'scale(1.05)';
        lineEl.style.opacity = '1';
        lineEl.style.textShadow = '0 0 18px rgba(110,158,255,0.6)';
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        lineEl.style.color = 'rgba(255,255,255,0.35)';
        lineEl.style.transform = 'scale(1)';
        lineEl.style.opacity = '0.5';
        lineEl.style.textShadow = 'none';
      }
    });
  }

  onPlayerEvent((ev) => {
    if (ev.type === 'trackChange') updateFsTrack(ev.videoId);
    if (ev.type === 'playing') { fsPlay.innerHTML = ICONS.pause; fsPlay.setAttribute('aria-label', 'Pause'); }
    if (ev.type === 'paused') { fsPlay.innerHTML = ICONS.play; fsPlay.setAttribute('aria-label', 'Play'); }
    if (ev.type === 'timeupdate') {
      const pct = ev.duration > 0 ? (ev.current / ev.duration) * 100 : 0;
      fsProgressBar.style.width = pct + '%';
      fsProgressThumb.style.left = pct + '%';
      fsCurrent.textContent = formatTime(ev.current);
      fsTotal.textContent = formatTime(ev.duration);
      updateSyncedLyricsHighlight(ev.current);
    }
  });

  window.addEventListener('store:queue', renderQueue);
  window.addEventListener('store:liked', () => {
    const vid = Player.currentVideoId();
    if (vid) updateFsLike(vid);
  });

  const vid = Player.currentVideoId();
  if (vid) updateFsTrack(vid);

  const q = Store.getQueue();
  fsShuffle.style.color = q.shuffled ? 'var(--color-accent)' : 'var(--color-text-secondary)';
  fsRepeat.style.color = q.repeatMode === 'off' ? 'var(--color-text-secondary)' : 'var(--color-accent)';
  if (q.repeatMode === 'one') fsRepeat.innerHTML = ICONS.repeatOne;
}

export function closeFullscreen() {
  if (fullscreenEl) fullscreenEl.style.display = 'none';
}

export function showAddToPlaylistModal(videoId) {
  const existing = document.getElementById('playlist-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'playlist-modal-overlay';
  overlay.className = 'playlist-modal-sheet';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: var(--z-modal);
    background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(14px);
    display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  `;

  function renderModalBody() {
    const currentPls = Store.getPlaylists();
    overlay.innerHTML = `
      <div style="background: rgba(22, 22, 28, 0.98); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; width: min(480px, 94vw); padding: 20px; box-shadow: 0 -12px 40px rgba(0,0,0,0.8);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin: 0;">Add to Playlist</h3>
          <button id="close-pl-modal" class="focus-ring" style="background: rgba(255,255,255,0.08); border: none; border-radius: 50%; color: #aaa; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px;">✕</button>
        </div>

        <!-- Create New Playlist Row -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <input type="text" id="new-pl-name-input" placeholder="New playlist name..." style="flex: 1; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 14px; outline: none;">
          <button id="create-pl-btn" style="padding: 10px 16px; background: var(--color-accent); border: none; border-radius: 12px; color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap;">+ Create</button>
        </div>

        <!-- Playlist List -->
        <div style="max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          ${currentPls.length === 0 ? `
            <div style="text-align: center; color: #888; padding: 24px 0; font-size: 14px;">No playlists yet. Type a name above to create one!</div>
          ` : currentPls.map(pl => {
            const inPl = (pl.tracks || []).includes(videoId);
            return `
              <div class="pl-item-row focus-ring" data-pl-id="${pl.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: ${inPl ? 'rgba(52, 120, 198, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${inPl ? 'rgba(110, 158, 255, 0.3)' : 'rgba(255,255,255,0.06)'}; border-radius: 14px; cursor: pointer; transition: background 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 16px;">🎵</div>
                  <div>
                    <div style="font-weight: 600; font-size: 15px; color: #fff;">${escapeHtml(pl.name)}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">${(pl.tracks || []).length} songs</div>
                  </div>
                </div>
                <div style="font-size: 13px; font-weight: 600; color: ${inPl ? '#6e9eff' : '#aaa'}; display: flex; align-items: center; gap: 4px;">
                  ${inPl ? '✓ In Playlist' : '+ Add'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    overlay.querySelector('#close-pl-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const createBtn = overlay.querySelector('#create-pl-btn');
    const nameInput = overlay.querySelector('#new-pl-name-input');
    const doCreate = () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const newPl = Store.createPlaylist(name);
      Store.addToPlaylist(newPl.id, videoId);
      showToast(`Created & added to "${name}"`);
      renderModalBody();
    };
    createBtn.addEventListener('click', doCreate);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doCreate();
    });

    overlay.querySelectorAll('.pl-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const plId = row.dataset.plId;
        const pl = currentPls.find(p => p.id === plId);
        if (!pl) return;
        const inPl = (pl.tracks || []).includes(videoId);
        if (inPl) {
          Store.removeFromPlaylist(plId, videoId);
          showToast(`Removed from "${pl.name}"`);
        } else {
          Store.addToPlaylist(plId, videoId);
          showToast(`Added to "${pl.name}"`);
        }
        renderModalBody();
      });
    });
  }

  renderModalBody();
  document.body.appendChild(overlay);
}
