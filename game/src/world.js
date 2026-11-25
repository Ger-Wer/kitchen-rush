// The game's rules and state, with no drawing and no browser in it: the chef,
// the tray, the order board, the bins, the timer, score, lives and the shift's
// end. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.
import {
  BINS, CHEF, COUNTER, DISHES, FIELD, GRAB_RANGE, LIVES, SERVE_POINTS,
  SERVE_RANGE, SERVE_TIME_BONUS, SHIFT_SECONDS, STREAK_BONUS,
  TARGET_DISHES, TRAY_MAX, WINDOW,
} from './config.js';

export const EVENT_GRAB = 1;
export const EVENT_SERVED = 2;
export const EVENT_WRONG = 4;
export const EVENT_OVER = 8;

/** Centre x of bin `index` on the counter. */
export function binCenter(index) {
  return 40 + COUNTER.binWidth / 2 + index * (COUNTER.binWidth + COUNTER.gap);
}

/** The index of the bin nearest to x, or -1 when none is close enough to grab from. */
export function nearestBin(x) {
  let best = -1;
  let bestDist = GRAB_RANGE;
  for (let index = 0; index < BINS.length; index += 1) {
    const dist = Math.abs(x - binCenter(index));
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  }
  return best;
}

/** The first order whose dish the tray (as a set) completes, or -1. */
export function findMatch(orders, tray) {
  if (tray.length !== TRAY_MAX) return -1;
  for (let index = 0; index < orders.length; index += 1) {
    const needs = orders[index].dish.needs;
    if (needs.every((id) => tray.includes(id))) return index;
  }
  return -1;
}

function sameSet(a, b) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function createWorld(random) {
  const chef = { x: FIELD.width / 2, targetX: null };
  const state = {
    chef,
    tray: [],
    orders: [],
    score: 0,
    served: 0,
    lives: LIVES,
    streak: 0,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    toast: '',
    toastTime: 0,
    over: null,
    overReason: '',
  };
  let nextOrderId = 1;

  /** A dish for a new order: one not already on the board, when one is free. */
  function pickDish() {
    const onBoard = state.orders.map((order) => order.dish.name);
    const free = DISHES.filter((dish) => !onBoard.includes(dish.name));
    const pool = free.length > 0 ? free : DISHES;
    return pool[Math.floor(random() * pool.length)];
  }

  function addOrder() {
    state.orders.push({ id: nextOrderId, dish: pickDish() });
    nextOrderId += 1;
  }

  function reset() {
    chef.x = FIELD.width / 2;
    chef.targetX = null;
    state.tray.length = 0;
    state.orders.length = 0;
    for (let index = 0; index < 3; index += 1) addOrder();
    state.score = 0;
    state.served = 0;
    state.lives = LIVES;
    state.streak = 0;
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.toast = '';
    state.toastTime = 0;
    state.over = null;
    state.overReason = '';
  }

  function showToast(text, seconds) {
    state.toast = text;
    state.toastTime = seconds;
  }

  function grabFrom(binIndex) {
    if (state.tray.length >= TRAY_MAX) return 0;
    state.tray.push(BINS[binIndex].id);
    return EVENT_GRAB;
  }

  function serve() {
    const match = findMatch(state.orders, state.tray);
    if (match >= 0) {
      const dish = state.orders[match].dish;
      state.streak += 1;
      const points = SERVE_POINTS + (state.streak - 1) * STREAK_BONUS;
      state.score += points;
      state.served += 1;
      state.timeLeft = Math.min(state.timeLeft + SERVE_TIME_BONUS, 999);
      state.orders.splice(match, 1);
      addOrder();
      state.tray.length = 0;
      showToast(`Served! ${dish.name} +${points}`, 1.6);
      if (state.served >= TARGET_DISHES) {
        state.over = 'win';
        state.overReason = `Shift complete: ${state.served} dishes served!`;
        return EVENT_SERVED | EVENT_OVER;
      }
      return EVENT_SERVED;
    }
    state.lives -= 1;
    state.streak = 0;
    state.tray.length = 0;
    showToast('Wrong dish! The customer sent it back.', 1.6);
    if (state.lives === 0) {
      state.over = 'lose';
      state.overReason = 'Three wrong dishes — the shift is over.';
      return EVENT_WRONG | EVENT_OVER;
    }
    return EVENT_WRONG;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right); `use` is a
   * grab-or-serve press; `grabBin` is a number-key bin (-1 for none); `walkTo`
   * is a pointer target x (null for none). With `harmless` set (the title
   * screen's backdrop) the clock stands still and nothing can end the shift.
   */
  function step(dt, direction, use, grabBin, walkTo, harmless) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    if (!harmless) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = 'lose';
        state.overReason = 'Time is up — the shift is over.';
        return EVENT_OVER;
      }
    }
    if (state.toastTime > 0) state.toastTime = Math.max(0, state.toastTime - dt);

    if (walkTo !== null && walkTo !== undefined) chef.targetX = walkTo;
    if (direction !== 0) chef.targetX = null;
    if (chef.targetX !== null) {
      const diff = chef.targetX - chef.x;
      if (Math.abs(diff) < 4) {
        // Arrived where the pointer sent the chef: grab or serve where we stand.
        chef.targetX = null;
        if (Math.abs(chef.x - WINDOW.x) <= SERVE_RANGE) events |= serve();
        else {
          const arrivedBin = nearestBin(chef.x);
          if (arrivedBin >= 0) events |= grabFrom(arrivedBin);
        }
      } else {
        chef.x += Math.sign(diff) * Math.min(Math.abs(diff), CHEF.speed * dt);
      }
    } else {
      chef.x += direction * CHEF.speed * dt;
    }
    chef.x = Math.min(1240, Math.max(40, chef.x));

    if (grabBin >= 0) {
      if (Math.abs(chef.x - binCenter(grabBin)) <= GRAB_RANGE) events |= grabFrom(grabBin);
    }
    if (use) {
      if (Math.abs(chef.x - WINDOW.x) <= SERVE_RANGE) events |= serve();
      else {
        const bin = nearestBin(chef.x);
        if (bin >= 0) events |= grabFrom(bin);
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, binCenter, nearestBin, findMatch, sameSet };
}
