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

let audioReady = false;

function updateStartButtonLabel() {
  if (startButton.disabled) {
    startButton.textContent = 'Loading assets...';
    return;
  }
  startButton.textContent = audioReady ? 'Start Shift' : 'Start (Muted)';
}

const audio = createAudioController();
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
    audio.stopTheme();
  },
  onReadyToStart: () => {
    startDialog.hidden = false;
    startButton.disabled = false;
    updateStartButtonLabel();
  },
});

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
  startDialog.hidden = true;
  gameoverDialog.hidden = true;
  if (showToast.timeout) {
    clearTimeout(showToast.timeout);
  }
  toastEl.dataset.visible = 'false';
  toastEl.hidden = true;
  touchControls.dataset.visible = window.matchMedia('(pointer: coarse)').matches ? 'true' : 'false';
  game.start();
  audio.rewind();
  audio.playTheme();
}

let startEventLock = false;

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
    audio.stopTheme();
    return;
  }
  if (!startDialog.hidden || !gameoverDialog.hidden) {
    return;
  }
  audio.playTheme();
});

audio.onAvailability((ready) => {
  audioReady = ready;
  updateStartButtonLabel();
});

touchControls.addEventListener('touchstart', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
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
  const action = event.target.dataset.action;
  if (action === 'dash') {
    input.emitDash(false);
  }
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && startDialog.hidden && gameoverDialog.hidden) {
    return;
  }
  if (event.key === 'Enter' && startDialog.hidden === false) {
    startRun();
  }
});
