// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (grab or serve, pause) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// Number keys 1-6 grab straight from that bin when the chef is near it.

export const ACTION_USE = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const USE = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  /** The bin index a number key asked to grab from, or -1. */
  let grabBin = -1;
  /** The x the pointer asked the chef to walk to, or null. */
  let walkTarget = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (USE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_USE;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (/^Digit[1-6]$/.test(event.code) && !event.repeat) {
      grabBin = Number(event.code.slice(5)) - 1;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointerdown', (event) => {
    // A click walks the chef there; grabbing or serving happens on arrival.
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    walkTarget = x;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The bin index a number key asked for since the last call, or -1. */
    takeGrabBin() {
      const taken = grabBin;
      grabBin = -1;
      return taken;
    },
    /** The x the pointer asked the chef to walk to, or null. */
    takeWalkTarget() {
      const taken = walkTarget;
      walkTarget = null;
      return taken;
    },
  };
}
