// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (walk to the next ingredient the first order needs, grab
// it, then walk to the window and serve), so the frame is what a real game
// looks like and the same seed always gives the same frame.
import { BINS, STEP } from './config.js';
import { binCenter } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const SAMPLE = STEP;
/** The play scene stops once the tray holds a full matching order at the window. */
const PLAY_LIMIT_SECONDS = 90;
/** The serve scene stops right after this many dishes are served. */
const SERVE_DISHES = 3;
const END_LIMIT_SECONDS = 600;

/** Walk toward `x`, grabbing the ingredient of bin `bin` when close enough. */
function autopilot(world, state) {
  const chef = state.chef;
  const tray = state.tray;
  // The dish the autopilot is cooking: the first order on the board.
  const order = state.orders[0];
  if (!order) return { direction: 0, use: false };
  const needed = order.dish.needs.filter((id) => !tray.includes(id));
  if (needed.length === 0) {
    // Tray complete: walk to the window and serve.
    const diff = 1120 - chef.x;
    if (Math.abs(diff) < 40) return { direction: 0, use: true };
    return { direction: Math.sign(diff), use: false };
  }
  // Find the bin holding the next missing ingredient.
  const nextId = needed[0];
  const binIndex = BINS.findIndex((bin) => bin.id === nextId);
  const target = binCenter(binIndex);
  const diff = target - chef.x;
  if (Math.abs(diff) < 30) return { direction: 0, use: true };
  return { direction: Math.sign(diff), use: false };
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / SAMPLE; index += 1) {
      world.step(SAMPLE, 0, false, -1, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Serve one dish first, then assemble the next one and stop at the window
    // with the plate ready: a dish mid-assembly and a plate ready to serve.
    for (let index = 0; index < PLAY_LIMIT_SECONDS / SAMPLE; index += 1) {
      if (state.served >= 1 && state.tray.length === 3) break;
      const move = autopilot(world, state);
      world.step(SAMPLE, move.direction, move.use, -1, null, false);
      if (state.over) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'serve') {
    // Serve three dishes and stop on the toast: the moment a dish is served.
    for (let index = 0; index < END_LIMIT_SECONDS / SAMPLE; index += 1) {
      if (state.served >= SERVE_DISHES) break;
      const move = autopilot(world, state);
      world.step(SAMPLE, move.direction, move.use, -1, null, false);
      if (state.over) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // end: play to the win — serve the whole shift.
  for (let index = 0; index < END_LIMIT_SECONDS / SAMPLE; index += 1) {
    if (state.over) break;
    const move = autopilot(world, state);
    world.step(SAMPLE, move.direction, move.use, -1, null, false);
  }
  if (!state.over) {
    // The autopilot fell short: three wrong dishes end the shift instead.
    state.lives = 0;
    state.over = 'lose';
    state.overReason = 'Three wrong dishes — the shift is over.';
  }
  return { screen: SCREEN_OVER, best: state.score };
}
