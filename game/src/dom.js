// The words of the game, as DOM text over the canvas. The screenshot tool
// renders DOM text cleanly but garbles canvas fillText, so every letter lives
// here: the HUD, the order tickets' names, the window's labels, the bins, the
// tray strip, the toast and the panels. The canvas (render.js) draws only
// shapes. The overlay is a 1280x720 box that main.js scales to the window
// exactly the way the renderer scales the canvas, so the words sit on the
// shapes they belong to.
import {
  BINS, COUNTER, FIELD, FONT, PALETTE, SERVE_TIME_BONUS, TARGET_DISHES,
  WINDOW,
} from './config.js';
import { binCenter, findMatch } from './world.js';
import { panelHeight, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const BOARD_TOP = 64;

function makeDiv(parent, style) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    margin: '0',
    padding: '0',
    whiteSpace: 'nowrap',
    fontFamily: FONT,
    pointerEvents: 'none',
    ...style,
  });
  parent.appendChild(el);
  return el;
}

export function createOverlay(root) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${FIELD.width}px`,
    height: `${FIELD.height}px`,
    transformOrigin: '0 0',
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  root.appendChild(overlay);

  const hudTitle = makeDiv(overlay, { left: '24px', top: '12px', fontSize: '26px', fontWeight: '700', color: PALETTE.gold });
  hudTitle.textContent = 'KITCHEN RUSH';
  const hudBest = makeDiv(overlay, { left: '24px', top: '40px', fontSize: '14px', color: '#a89a86' });
  const hudClock = makeDiv(overlay, { left: '640px', top: '6px', fontSize: '30px', fontWeight: '700', transform: 'translateX(-50%)' });
  const hudScore = makeDiv(overlay, { right: '24px', top: '6px', fontSize: '24px', color: PALETTE.text });
  const hudServed = makeDiv(overlay, { right: '24px', top: '32px', fontSize: '18px', color: PALETTE.text });
  const boardLabel = makeDiv(overlay, { left: '36px', top: '74px', fontSize: '18px', fontWeight: '700', color: PALETTE.gold });
  boardLabel.textContent = 'ORDERS';

  // One name + READY tag per order ticket.
  const ticketWidth = 372;
  const ticketGap = 16;
  const firstX = 120;
  const ticketName = [];
  const ticketReady = [];
  for (let slot = 0; slot < 3; slot += 1) {
    const x = firstX + slot * (ticketWidth + ticketGap);
    const y = BOARD_TOP + 8;
    ticketName.push(makeDiv(overlay, { left: `${x + 16}px`, top: `${y + 8}px`, fontSize: '24px', color: PALETTE.ink }));
    ticketReady.push(makeDiv(overlay, { left: `${x + ticketWidth - 16}px`, top: `${y + 10}px`, fontSize: '20px', fontWeight: '700', color: PALETTE.green, transform: 'translateX(-100%)' }));
  }

  const windowLabel = makeDiv(overlay, { left: `${WINDOW.x}px`, top: `${WINDOW.y + 10}px`, fontSize: '22px', fontWeight: '700', color: PALETTE.ink, transform: 'translateX(-50%)' });
  windowLabel.textContent = 'SERVE';
  const windowHint = makeDiv(overlay, { left: `${WINDOW.x}px`, top: `${WINDOW.y + WINDOW.height + 6}px`, fontSize: '20px', transform: 'translateX(-50%)' });

  // Bin labels and their number keys.
  const binLabel = [];
  const binKey = [];
  for (let index = 0; index < BINS.length; index += 1) {
    const bin = BINS[index];
    const cx = binCenter(index);
    const x = cx - COUNTER.binWidth / 2;
    const y = COUNTER.y + 8;
    binLabel.push(makeDiv(overlay, { left: `${cx}px`, top: `${y + 52}px`, fontSize: '15px', color: PALETTE.ink, transform: 'translateX(-50%)' }));
    binLabel[index].textContent = bin.label;
    binKey.push(makeDiv(overlay, { left: `${x + 8}px`, top: `${y + 4}px`, fontSize: '13px', color: PALETTE.muted }));
    binKey[index].textContent = bin.key;
  }

  const trayLabel = makeDiv(overlay, { left: '24px', top: '666px', fontSize: '20px', fontWeight: '700', color: PALETTE.gold });
  trayLabel.textContent = 'TRAY';
  const trayHint = makeDiv(overlay, { left: '330px', top: '674px', fontSize: '20px', color: PALETTE.text });
  trayHint.textContent = 'Move ← → or A D · Grab / Serve: SPACE or click · Pause: P';
  const trayBonus = makeDiv(overlay, { right: '24px', top: '674px', fontSize: '18px', color: '#a89a86' });
  trayBonus.textContent = `+${SERVE_TIME_BONUS}s per dish`;

  const toast = makeDiv(overlay, {
    left: '640px', top: '478px', fontSize: '24px', fontWeight: '700', color: PALETTE.gold,
    transform: 'translateX(-50%)', background: 'rgba(46,33,24,0.85)',
    padding: '6px 24px', borderRadius: '10px',
  });

  // The panel: one container, repositioned per screen; title, lines, prompt.
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'absolute', left: '330px', width: '620px', textAlign: 'center', pointerEvents: 'none',
  });
  overlay.appendChild(panel);
  const panelTitle = makeDiv(panel, { position: 'relative', fontSize: '46px', fontWeight: '700', color: PALETTE.text });
  const panelLines = [];
  for (let index = 0; index < 6; index += 1) {
    panelLines.push(makeDiv(panel, { position: 'relative', fontSize: '22px', color: '#c8ccd4' }));
  }
  const panelPrompt = makeDiv(panel, { position: 'relative', fontSize: '24px', fontWeight: '700', color: PALETTE.gold });

  function setPanel(title, lines, prompt) {
    const height = panelHeight(lines);
    const y = (FIELD.height - height) / 2;
    panel.style.display = 'block';
    panel.style.top = `${y}px`;
    panelTitle.textContent = title;
    panelTitle.style.marginTop = '34px';
    panelTitle.style.marginBottom = '38px';
    for (let index = 0; index < panelLines.length; index += 1) {
      const line = lines[index] ?? '';
      panelLines[index].textContent = line;
      panelLines[index].style.display = line ? 'block' : 'none';
      panelLines[index].style.marginTop = index === 0 ? '0' : '10px';
    }
    panelPrompt.textContent = prompt;
    panelPrompt.style.marginTop = '32px';
  }

  /** Refresh every word from the state; called once per frame. */
  function update(state, screen, best) {
    hudBest.textContent = `Best ${best}`;
    const seconds = Math.max(0, Math.ceil(state.timeLeft));
    hudClock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    hudClock.style.color = state.timeLeft <= 20 ? PALETTE.timerLow : PALETTE.timer;
    hudScore.textContent = `Score ${state.score}`;
    hudServed.textContent = `Served ${state.served}/${TARGET_DISHES}`;
    for (let slot = 0; slot < 3; slot += 1) {
      const order = state.orders[slot];
      ticketName[slot].textContent = order ? order.dish.name : '';
      const ready = order && findMatch(state.orders, state.tray) === slot && state.tray.length > 0;
      ticketReady[slot].textContent = ready ? 'READY!' : '';
    }
    const ready = findMatch(state.orders, state.tray) >= 0;
    windowHint.textContent = ready ? 'READY — press SPACE' : 'Bring a full order here';
    windowHint.style.color = ready ? PALETTE.gold : PALETTE.muted;
    windowHint.style.fontWeight = ready ? '700' : '400';
    if (state.toastTime > 0 && state.toast && screen === SCREEN_PLAY) {
      toast.style.display = 'block';
      toast.textContent = state.toast;
    } else {
      toast.style.display = 'none';
    }
    if (screen === SCREEN_TITLE) {
      setPanel('Kitchen Rush', [
        'Orders come in on the board — cook them all.',
        'Move with ← → or A D. Grab an ingredient with SPACE',
        'or by clicking its bin. Serve a full order at the window.',
        `Serve ${TARGET_DISHES} dishes before the shift ends.`,
        '',
        `Best ${best}`,
      ], 'Press Space or click to start');
    } else if (screen === SCREEN_PAUSED) {
      setPanel('Paused', ['The orders will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      setPanel(state.over === 'win' ? 'Shift complete!' : 'Shift over', [
        state.overReason,
        `Score ${state.score}`,
        `Best ${best}`,
        '',
      ], 'Press Space or click to play again');
    } else {
      panel.style.display = 'none';
    }
  }

  return {
    element: overlay,
    /** Scale the 1280x720 overlay to the window, exactly like the canvas view. */
    fit() {
      const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
      const x = (window.innerWidth - FIELD.width * scale) / 2;
      const y = (window.innerHeight - FIELD.height * scale) / 2;
      overlay.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    },
    update,
  };
}
