import { SpectralSkillShowcase } from './spectral-game.js';
import { createAudioController } from './soundscape.js';
import { createInputController } from './player-input.js';

const canvas = document.getElementById('game-canvas');
const startDialog = document.getElementById('start-dialog');
const gameoverDialog = document.getElementById('gameover-dialog');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreEl = document.getElementById('score');
const skillEl = document.getElementById('skill-count');
const streakEl = document.getElementById('streak');
const finalScoreEl = document.getElementById('final-score');
const finalStreakEl = document.getElementById('final-streak');
const toastEl = document.getElementById('toast');
const touchControls = document.querySelector('.touch-controls');
startDialog.hidden = true;
startButton.disabled = true;
startButton.textContent = 'Loading assets...';

const supportsVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let reducedMotion = systemReducedMotion;
let isGameActive = false;
let wasPausedForVisibility = false;
let startEventLock = false;

function updateStartButtonLabel() {
  startButton.textContent = startButton.disabled ? 'Loading assets...' : 'Start Shift';
}
const audio = createAudioController();
const HAPTIC_PATTERNS = {
  skill: [20],
  phase: [10, 30, 10],
  hit: [120, 40, 100],
};

const game = new SpectralSkillShowcase(canvas, {
  onScore: ({ score, skills, streak, highlight }) => {
    scoreEl.textContent = Math.floor(score);
    skillEl.textContent = skills;
    streakEl.textContent = streak;

    if (highlight) {
      showToast(highlight);
    }
  },
  onGameOver: ({ score, streak }) => {
    finalScoreEl.textContent = Math.floor(score);
    finalStreakEl.textContent = streak;
    gameoverDialog.hidden = false;
    touchControls.dataset.visible = 'false';
    isGameActive = false;
    audio.stopTheme();
  },
  onReadyToStart: () => {
    canvas.classList.add('is-hidden');
    startDialog.hidden = false;
    startButton.disabled = false;
    updateStartButtonLabel();
  },
  onHaptic: (type) => {
    if (!supportsVibrate || reducedMotion) return;
    const pattern = HAPTIC_PATTERNS[type] || [18];
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Ignore vibration errors on unsupported devices.
    }
  },
});

game.setMotionPreference({ reducedMotion });

const input = createInputController({
  onMove: (direction) => game.queueLaneShift(direction),
  onDash: (state) => game.setDash(state),
});

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastEl.dataset.visible = 'true';
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toastEl.dataset.visible = 'false';
    setTimeout(() => {
      toastEl.hidden = true;
    }, 250);
  }, 1400);
}

function startRun() {
  canvas.classList.remove('is-hidden');
  startDialog.hidden = true;
  gameoverDialog.hidden = true;
  if (showToast.timeout) {
    clearTimeout(showToast.timeout);
  }
  toastEl.dataset.visible = 'false';
  toastEl.hidden = true;
  const prefersTouch = window.matchMedia('(pointer: coarse)').matches;
  touchControls.dataset.visible = prefersTouch ? 'true' : 'false';
  isGameActive = true;
  game.setMotionPreference({ reducedMotion });
  game.start();
  audio.rewind();
  audio.playTheme();
}

function handleStartEvent(event) {
  if (startButton.disabled) return;
  if (startEventLock) {
    event?.preventDefault?.();
    return;
  }
  if (event && event.type !== 'click') {
    event.preventDefault();
  }
  startEventLock = true;
  startButton.blur();
  startRun();
  setTimeout(() => {
    startEventLock = false;
  }, 200);
}

function handleRestartEvent(event) {
  if (event && event.type !== 'click') {
    event.preventDefault();
  }
  restartButton.blur();
  startRun();
}

startButton.addEventListener('pointerdown', handleStartEvent, { passive: false });
restartButton.addEventListener('pointerdown', handleRestartEvent, { passive: false });
startButton.addEventListener('touchstart', handleStartEvent, { passive: false });
restartButton.addEventListener('touchstart', handleRestartEvent, { passive: false });
startButton.addEventListener('click', handleStartEvent);
restartButton.addEventListener('click', handleRestartEvent);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (isGameActive) {
      game.pause();
      wasPausedForVisibility = true;
    }
    audio.stopTheme();
    return;
  }


  if (isGameActive && wasPausedForVisibility && startDialog.hidden && gameoverDialog.hidden) {
    game.resume();
    audio.playTheme();
  }
  wasPausedForVisibility = false;
});

audio.onAvailability(() => {
  updateStartButtonLabel();
});

function setControlPressed(target, pressed) {
  if (!target) return;
  if (pressed) {
    target.dataset.pressed = 'true';
  } else {
    target.removeAttribute('data-pressed');
  }
}

touchControls.addEventListener('touchstart', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  setControlPressed(event.target, true);
  const action = event.target.dataset.action;
  if (action === 'up') {
    input.emitLaneShift(-1);
  } else if (action === 'down') {
    input.emitLaneShift(1);
  } else if (action === 'dash') {
    input.emitDash(true);
  }
}, { passive: true });

touchControls.addEventListener('touchend', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  setControlPressed(event.target, false);
  if (event.target.dataset.action === 'dash') {
    input.emitDash(false);
  }
}, { passive: true });

touchControls.addEventListener('touchcancel', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  setControlPressed(event.target, false);
  if (event.target.dataset.action === 'dash') {
    input.emitDash(false);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && startDialog.hidden && gameoverDialog.hidden) {
    return;
  }
  if (event.key === 'Enter' && startDialog.hidden === false) {
    startRun();
  }
});
