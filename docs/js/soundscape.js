export function createAudioController() {
  const audio = new Audio(new URL('../audio/halloween-background-music.mp3', import.meta.url).href);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.5;

  let isReady = audio.readyState >= 3;
  const listeners = new Set();

  function notify(value) {
    isReady = value;
    listeners.forEach((cb) => cb(value));
  }

  audio.addEventListener('canplaythrough', () => notify(true), { once: true });
  audio.addEventListener('error', () => notify(false), { once: true });

  return {
    playTheme() {
      if (!audio.paused) return;
      audio.play().then(() => {
        notify(true);
      }).catch(() => {
        notify(false);
      });
    },
    stopTheme() {
      if (!audio.paused) {
        audio.pause();
      }
    },
    rewind() {
      audio.currentTime = 0;
    },
    prime() {
      if (!audio.paused) {
        return Promise.resolve(true);
      }
      return audio.play()
        .then(() => {
          notify(true);
          audio.pause();
          audio.currentTime = 0;
          return true;
        })
        .catch(() => {
          notify(false);
          return false;
        });
    },
    onAvailability(callback) {
      listeners.add(callback);
      callback(isReady);
    },
  };
}
