const KEY_MAP = {
  ArrowUp: -1,
  KeyW: -1,
  ArrowDown: 1,
  KeyS: 1,
};

export function createInputController({ onMove, onDash }) {
  function handleKeyDown(event) {
    if (event.repeat) return;
    if (KEY_MAP[event.code] !== undefined) {
      event.preventDefault();
      onMove?.(KEY_MAP[event.code]);
    }
    if (event.code === 'Space' || event.code === 'ShiftLeft') {
      event.preventDefault();
      onDash?.(true);
    }
  }

  function handleKeyUp(event) {
    if (event.code === 'Space' || event.code === 'ShiftLeft') {
      onDash?.(false);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return {
    emitLaneShift(direction) {
      onMove?.(direction);
    },
    emitDash(state) {
      onDash?.(state);
    },
  };
}
