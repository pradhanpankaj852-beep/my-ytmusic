import { Store } from './store.js';

let ytPlayer = null;
let isReady = false;
let pendingVideoId = null;
let userRequestedPause = false;
const listeners = new Set();

// Silent WAV audio loop anchor for iOS / Android background playback
const SILENT_WAV_B64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
let anchorEl = null;

function playAudioAnchor() {
  try {
    if (!anchorEl) {
      anchorEl = document.getElementById('bg-audio-anchor') || new Audio(SILENT_WAV_B64);
      anchorEl.src = SILENT_WAV_B64;
      anchorEl.loop = true;
      anchorEl.setAttribute('playsinline', '');
      anchorEl.setAttribute('webkit-playsinline', '');
    }
    anchorEl.play().catch(() => {});
  } catch (e) {}
}

function pauseAudioAnchor() {
  if (anchorEl) anchorEl.pause();
}

// Background auto-resume & prevention of mobile lockscreen suspension
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (Player.isPlaying()) {
      playAudioAnchor();
    }
  } else {
    // When returning to foreground, ensure playback stays in sync
    if (!userRequestedPause && ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PAUSED) {
      ytPlayer.playVideo();
    }
  }
});

export function onPlayerEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(type, detail = {}) {
  for (const fn of listeners) fn({ type, ...detail });
}

function loadYTApi() {
  if (window.YT && window.YT.Player) {
    createPlayer();
    return;
  }
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = createPlayer;
}

function createPlayer() {
  const container = document.getElementById('yt-player-host');
  if (!container) return;
  ytPlayer = new YT.Player('yt-player-host', {
    height: '2',
    width: '2',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
    },
    events: {
      onReady: () => {
        isReady = true;
        const saved = Store.getPlayback();
        if (saved.volume !== undefined && ytPlayer.setVolume) {
          ytPlayer.setVolume(saved.volume);
        }
        if (pendingVideoId) {
          loadAndPlay(pendingVideoId);
          pendingVideoId = null;
        }
        emit('ready');
      },
      onStateChange: (e) => {
        const state = e.data;
        if (state === YT.PlayerState.PLAYING) {
          userRequestedPause = false;
          playAudioAnchor();
          emit('playing');
          startTimeUpdate();
        } else if (state === YT.PlayerState.PAUSED) {
          // If mobile OS attempted to pause because screen locked or switched app, auto-resume!
          if (document.hidden && !userRequestedPause) {
            playAudioAnchor();
            if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
            return;
          }
          pauseAudioAnchor();
          emit('paused');
          stopTimeUpdate();
        } else if (state === YT.PlayerState.ENDED) {
          stopTimeUpdate();
          emit('ended');
          Player.next();
        } else if (state === YT.PlayerState.BUFFERING) {
          emit('buffering');
        }
      },
      onError: (e) => {
        emit('error', { code: e.data });
        Player.next();
      },
    },
  });
}

let timeInterval = null;

function startTimeUpdate() {
  stopTimeUpdate();
  timeInterval = setInterval(() => {
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;
    const current = ytPlayer.getCurrentTime();
    const duration = ytPlayer.getDuration();
    emit('timeupdate', { current, duration });
    Store.savePlayback({
      videoId: Player.currentVideoId(),
      positionSec: Math.floor(current),
      volume: ytPlayer.getVolume ? ytPlayer.getVolume() : 80,
    });
  }, 500);
}

function stopTimeUpdate() {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
}

function loadAndPlay(videoId) {
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(videoId);
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const Player = {
  init() {
    loadYTApi();
  },

  currentVideoId() {
    const q = Store.getQueue();
    if (q.tracks.length === 0) return null;
    return q.tracks[q.currentIndex] || null;
  },

  play(videoId, trackList) {
    userRequestedPause = false;
    playAudioAnchor();
    if (trackList && trackList.length > 0) {
      const ids = trackList.map(t => t.videoId || t);
      const idx = ids.indexOf(videoId);
      Store.saveQueue({
        tracks: ids,
        currentIndex: idx >= 0 ? idx : 0,
        shuffled: false,
        repeatMode: Store.getQueue().repeatMode || 'off',
      });
    }
    if (!isReady) {
      pendingVideoId = videoId;
      return;
    }
    loadAndPlay(videoId);
    emit('trackChange', { videoId });
  },

  playPause() {
    if (!ytPlayer) return;
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      this.pause();
    } else {
      this.resume();
    }
  },

  pause() {
    userRequestedPause = true;
    pauseAudioAnchor();
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  },

  resume() {
    userRequestedPause = false;
    playAudioAnchor();
    if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
  },

  seek(seconds) {
    if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(seconds, true);
  },

  setVolume(val) {
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(val);
  },

  getVolume() {
    if (ytPlayer && ytPlayer.getVolume) return ytPlayer.getVolume();
    return 80;
  },

  getDuration() {
    if (ytPlayer && ytPlayer.getDuration) return ytPlayer.getDuration();
    return 0;
  },

  isPlaying() {
    if (!ytPlayer || !ytPlayer.getPlayerState) return false;
    return ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
  },

  next() {
    const q = Store.getQueue();
    if (q.tracks.length === 0) return;
    if (q.repeatMode === 'one') {
      this.play(q.tracks[q.currentIndex]);
      return;
    }
    let nextIdx = q.currentIndex + 1;
    if (nextIdx >= q.tracks.length) {
      if (q.repeatMode === 'all') {
        nextIdx = 0;
      } else {
        emit('queueEnd');
        return;
      }
    }
    q.currentIndex = nextIdx;
    Store.saveQueue(q);
    this.play(q.tracks[nextIdx]);
  },

  prev() {
    const q = Store.getQueue();
    if (q.tracks.length === 0) return;
    if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime() > 3) {
      ytPlayer.seekTo(0, true);
      return;
    }
    let prevIdx = q.currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = q.repeatMode === 'all' ? q.tracks.length - 1 : 0;
    }
    q.currentIndex = prevIdx;
    Store.saveQueue(q);
    this.play(q.tracks[prevIdx]);
  },

  toggleShuffle() {
    const q = Store.getQueue();
    if (q.shuffled) {
      q.shuffled = false;
    } else {
      const current = q.tracks[q.currentIndex];
      const rest = q.tracks.filter((_, i) => i !== q.currentIndex);
      q.tracks = [current, ...shuffleArray(rest)];
      q.currentIndex = 0;
      q.shuffled = true;
    }
    Store.saveQueue(q);
    emit('shuffleChange', { shuffled: q.shuffled });
  },

  cycleRepeat() {
    const q = Store.getQueue();
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(q.repeatMode);
    q.repeatMode = modes[(idx + 1) % 3];
    Store.saveQueue(q);
    emit('repeatChange', { repeatMode: q.repeatMode });
    return q.repeatMode;
  },

  addToQueue(videoId) {
    const q = Store.getQueue();
    q.tracks.push(videoId);
    Store.saveQueue(q);
  },

  removeFromQueue(index) {
    const q = Store.getQueue();
    if (index < q.currentIndex) q.currentIndex--;
    q.tracks.splice(index, 1);
    Store.saveQueue(q);
  },

  moveInQueue(fromIndex, toIndex) {
    const q = Store.getQueue();
    const [item] = q.tracks.splice(fromIndex, 1);
    q.tracks.splice(toIndex, 0, item);
    if (q.currentIndex === fromIndex) {
      q.currentIndex = toIndex;
    } else if (fromIndex < q.currentIndex && toIndex >= q.currentIndex) {
      q.currentIndex--;
    } else if (fromIndex > q.currentIndex && toIndex <= q.currentIndex) {
      q.currentIndex++;
    }
    Store.saveQueue(q);
  },
};
