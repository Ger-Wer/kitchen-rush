// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 kitchen is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Shapes only — every letter is drawn by the DOM
// overlay (dom.js), because this engine's canvas text is unreadable in the
// screenshot tool while its DOM text is clean. The panel rects and the timer
// bar are drawn here; their words live in the overlay. Curves are polygons:
// this engine's arcTo() draws nothing, its arc() ignores its angles, and its
// bezierCurveTo() and ellipse() draw nothing either.
import {
  BINS, CHEF, COUNTER, FIELD, LIVES, PALETTE, TARGET_DISHES, WINDOW,
} from './config.js';
import { binCenter, findMatch, nearestBin } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HUD = { height: 56 };
const BOARD = { top: 64, height: 104 };
const PANEL = { width: 620, top: 150, line: 34, bottom: 76 };

/** Append a quarter-circle as straight segments: this engine's arc() ignores its
 * angles and always draws a full circle, so corners are polygons here. */
function corner(context, cx, cy, r, from, to) {
  const steps = 6;
  for (let index = 1; index <= steps; index += 1) {
    const angle = from + ((to - from) * index) / steps;
    context.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
}

/**
 * A rounded rectangle path, from straight lines and polygonal corners only:
 * this engine's arcTo() draws nothing, and its arc() ignores its angles.
 */
function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  corner(context, x + width - r, y + r, r, -Math.PI / 2, 0);
  context.lineTo(x + width, y + height - r);
  corner(context, x + width - r, y + height - r, r, 0, Math.PI / 2);
  context.lineTo(x + r, y + height);
  corner(context, x + r, y + height - r, r, Math.PI / 2, Math.PI);
  context.lineTo(x, y + r);
  corner(context, x + r, y + r, r, Math.PI, Math.PI * 1.5);
  context.closePath();
}

/** An ellipse path as a 24-sided polygon (ellipse() draws nothing here). */
function ellipsePath(context, cx, cy, rx, ry) {
  context.beginPath();
  for (let index = 0; index <= 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    const px = cx + Math.cos(angle) * rx;
    const py = cy + Math.sin(angle) * ry;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/**
 * One ingredient drawn as a small picture, centred on (x, y), `size` across.
 * Absolute coordinates only: this engine draws nothing after a translate().
 */
export function drawIngredient(context, id, x, y, size) {
  const half = size / 2;
  if (id === 'bun') {
    // A dome: a half-circle as a polygon (arc() ignores its angles here).
    context.fillStyle = PALETTE.bun;
    context.beginPath();
    for (let index = 0; index <= 8; index += 1) {
      const angle = Math.PI + (index / 8) * Math.PI;
      const px = x + Math.cos(angle) * half;
      const py = y + half * 0.25 + Math.sin(angle) * half;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.bunDark;
    context.fillRect(x - half, y + half * 0.25, size, half * 0.3);
    context.fillStyle = '#fff3d6';
    context.beginPath();
    context.arc(x - half * 0.4, y - half * 0.3, 2, 0, Math.PI * 2);
    context.arc(x + half * 0.35, y - half * 0.45, 2, 0, Math.PI * 2);
    context.arc(x, y - half * 0.6, 2, 0, Math.PI * 2);
    context.fill();
  } else if (id === 'patty') {
    context.fillStyle = PALETTE.patty;
    roundRect(context, x - half, y - half * 0.45, size, half * 0.9, 6);
    context.fill();
    context.fillStyle = '#8a5a34';
    context.fillRect(x - half * 0.6, y - half * 0.2, half * 0.5, 3);
    context.fillRect(x + half * 0.1, y + half * 0.05, half * 0.5, 3);
  } else if (id === 'lettuce') {
    context.fillStyle = PALETTE.lettuce;
    context.beginPath();
    context.arc(x - half * 0.45, y, half * 0.55, 0, Math.PI * 2);
    context.arc(x + half * 0.45, y, half * 0.55, 0, Math.PI * 2);
    context.arc(x, y - half * 0.3, half * 0.55, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.lettuceDark;
    context.beginPath();
    context.arc(x - half * 0.4, y + half * 0.15, 3, 0, Math.PI * 2);
    context.arc(x + half * 0.4, y + half * 0.15, 3, 0, Math.PI * 2);
    context.fill();
  } else if (id === 'tomato') {
    context.fillStyle = PALETTE.tomato;
    context.beginPath();
    context.arc(x, y + half * 0.1, half * 0.85, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.lettuce;
    context.beginPath();
    context.moveTo(x, y - half * 0.7);
    context.lineTo(x - half * 0.4, y - half * 0.25);
    context.lineTo(x + half * 0.4, y - half * 0.25);
    context.closePath();
    context.fill();
    context.fillStyle = '#ff8a7a';
    context.beginPath();
    context.arc(x - half * 0.3, y - half * 0.15, 4, 0, Math.PI * 2);
    context.fill();
  } else if (id === 'cheese') {
    context.fillStyle = PALETTE.cheese;
    context.beginPath();
    context.moveTo(x - half, y + half * 0.6);
    context.lineTo(x + half, y + half * 0.6);
    context.lineTo(x - half * 0.2, y - half * 0.7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.cheeseDark;
    context.beginPath();
    context.arc(x + half * 0.25, y + half * 0.25, 3, 0, Math.PI * 2);
    context.arc(x - half * 0.1, y + half * 0.35, 2.5, 0, Math.PI * 2);
    context.fill();
  } else {
    // dough
    context.fillStyle = PALETTE.dough;
    context.beginPath();
    context.arc(x, y, half * 0.9, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.doughDark;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, half * 0.9, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#fff8e0';
    context.beginPath();
    context.arc(x - half * 0.3, y - half * 0.3, 3, 0, Math.PI * 2);
    context.arc(x + half * 0.3, y + half * 0.25, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function drawHeart(context, x, y, size, filled) {
  const s = size / 20;
  context.fillStyle = filled ? PALETTE.red : '#5a4636';
  context.beginPath();
  context.arc(x - 5 * s, y - 3 * s, 5.5 * s, 0, Math.PI * 2);
  context.arc(x + 5 * s, y - 3 * s, 5.5 * s, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(x - 10 * s, y - 2 * s);
  context.lineTo(x + 10 * s, y - 2 * s);
  context.lineTo(x, y + 8 * s);
  context.closePath();
  context.fill();
}

/** The panel's height for a given number of lines, shared with the overlay. */
export function panelHeight(lines) {
  return PANEL.top + lines.length * PANEL.line + PANEL.bottom;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function drawWall() {
    // Tiled kitchen wall.
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, 0, FIELD.width, 480);
    context.fillStyle = PALETTE.tile;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 80 + 2, 180 + row * 56 + 2, 76, 52);
      }
    }
    context.fillStyle = PALETTE.tileLine;
    for (let row = 0; row <= 5; row += 1) context.fillRect(0, 180 + row * 56, FIELD.width, 2);
    // Shelf with pots over the left side.
    context.fillStyle = '#6b4a2f';
    context.fillRect(48, 196, 300, 10);
    context.fillStyle = PALETTE.steel;
    context.beginPath();
    context.arc(96, 184, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.steelDark;
    context.beginPath();
    context.arc(168, 186, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c96f2e';
    context.beginPath();
    context.arc(240, 188, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.steel;
    context.fillRect(286, 168, 34, 28);
    // Stove with two steaming pots on the left.
    context.fillStyle = '#3a3f46';
    context.fillRect(48, 400, 220, 80);
    context.fillStyle = '#20242a';
    context.beginPath();
    context.arc(110, 420, 34, 0, Math.PI * 2);
    context.arc(210, 420, 34, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.steel;
    context.beginPath();
    context.arc(110, 392, 26, 0, Math.PI * 2);
    context.arc(210, 392, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e8e2d4';
    context.fillRect(96, 360, 8, 26);
    context.fillRect(122, 352, 8, 34);
    context.fillRect(196, 360, 8, 26);
    context.fillRect(222, 352, 8, 34);
    // Floor.
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 480, FIELD.width, 80);
    context.fillStyle = PALETTE.floorLine;
    for (let x = 0; x < FIELD.width; x += 80) context.fillRect(x, 480, 2, 80);
    context.fillRect(0, 520, FIELD.width, 2);
  }

  function drawHud(state) {
    context.fillStyle = PALETTE.board;
    context.fillRect(0, 0, FIELD.width, HUD.height);
    // Timer bar under the clock (the clock's digits live in the overlay).
    const low = state.timeLeft <= 20;
    context.fillStyle = '#5a4636';
    context.fillRect(FIELD.width / 2 - 90, 44, 180, 6);
    context.fillStyle = low ? PALETTE.timerLow : PALETTE.timer;
    context.fillRect(FIELD.width / 2 - 90, 44, 180 * Math.max(0, state.timeLeft / 120), 6);
    // Lives as hearts, left of the score.
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(context, FIELD.width - 300 + life * 30, 30, 22, life < state.lives);
    }
  }

  function drawBoard(state) {
    context.fillStyle = PALETTE.boardEdge;
    roundRect(context, 16, BOARD.top, FIELD.width - 32, BOARD.height, 10);
    context.fill();
    const ticketWidth = 372;
    const ticketGap = 16;
    const firstX = 120;
    for (let slot = 0; slot < state.orders.length; slot += 1) {
      const order = state.orders[slot];
      const x = firstX + slot * (ticketWidth + ticketGap);
      const y = BOARD.top + 8;
      const ready = findMatch(state.orders, state.tray) === slot && state.tray.length > 0;
      if (ready) {
        // The border is a slightly larger green ticket underneath: stroke()
        // on an arc path draws circles at the corners in this engine.
        // Outer radius = inner radius + offset, so both arcs share a centre.
        context.fillStyle = PALETTE.green;
        roundRect(context, x - 3, y - 3, ticketWidth + 6, BOARD.height - 16 + 6, 11);
        context.fill();
      }
      context.fillStyle = ready ? PALETTE.ticketDone : PALETTE.ticket;
      roundRect(context, x, y, ticketWidth, BOARD.height - 16, 8);
      context.fill();
      // The three ingredients, checked off when the tray already holds them.
      for (let index = 0; index < order.dish.needs.length; index += 1) {
        const id = order.dish.needs[index];
        const ix = x + 40 + index * 84;
        const iy = y + 62;
        const held = state.tray.includes(id);
        drawIngredient(context, id, ix, iy, 44);
        if (held) {
          context.fillStyle = PALETTE.green;
          context.beginPath();
          context.arc(ix + 18, iy - 18, 11, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = '#ffffff';
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(ix + 12, iy - 18);
          context.lineTo(ix + 17, iy - 13);
          context.lineTo(ix + 25, iy - 24);
          context.stroke();
        }
      }
    }
  }

  function drawCounter(state) {
    // Wooden counter with the six ingredient bins.
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, COUNTER.y, FIELD.width, 84);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, COUNTER.y, FIELD.width, 12);
    for (let index = 0; index < BINS.length; index += 1) {
      const bin = BINS[index];
      const cx = binCenter(index);
      const x = cx - COUNTER.binWidth / 2;
      const y = COUNTER.y + 8;
      const near = nearestBin(state.chef.x) === index;
      // The border is a slightly larger ticket underneath (see drawBoard).
      context.fillStyle = near ? PALETTE.gold : '#b99a6b';
      roundRect(context, x - 2, y - 2, COUNTER.binWidth + 4, COUNTER.binHeight + 4, 10);
      context.fill();
      context.fillStyle = near ? '#fff3d6' : '#f7ead0';
      roundRect(context, x, y, COUNTER.binWidth, COUNTER.binHeight, 8);
      context.fill();
      drawIngredient(context, bin.id, cx, y + 30, 46);
    }
  }

  function drawWindow(state) {
    const wx = WINDOW.x - WINDOW.width / 2;
    const wy = WINDOW.y;
    const ready = findMatch(state.orders, state.tray) >= 0;
    // Frame and the pass-through opening.
    context.fillStyle = '#6b4a2f';
    roundRect(context, wx - 10, wy - 10, WINDOW.width + 20, WINDOW.height + 20, 12);
    context.fill();
    context.fillStyle = ready ? '#fff8e0' : '#dfe7ee';
    context.fillRect(wx, wy, WINDOW.width, WINDOW.height);
    // The plate on the sill.
    const plateX = WINDOW.x;
    const plateY = wy + WINDOW.height - 52;
    context.fillStyle = PALETTE.plateEdge;
    ellipsePath(context, plateX, plateY, 92, 22);
    context.fill();
    context.fillStyle = PALETTE.plate;
    ellipsePath(context, plateX, plateY - 4, 80, 18);
    context.fill();
    if (ready) {
      // The finished dish on the plate, glowing: this is the plate ready to serve.
      context.save();
      context.shadowColor = PALETTE.gold;
      context.shadowBlur = 24;
      context.fillStyle = PALETTE.gold;
      ellipsePath(context, plateX, plateY - 4, 84, 20);
      context.fill();
      context.restore();
      const dish = state.orders[findMatch(state.orders, state.tray)].dish;
      for (let index = 0; index < dish.needs.length; index += 1) {
        drawIngredient(context, dish.needs[index], plateX - 44 + index * 44, plateY - 22, 36);
      }
    }
    // The service bell.
    context.fillStyle = PALETTE.gold;
    context.beginPath();
    context.arc(wx + 34, wy + WINDOW.height - 30, 14, Math.PI, 0);
    context.fill();
    context.fillRect(wx + 20, wy + WINDOW.height - 30, 28, 5);
  }

  function drawChef(state) {
    const chef = state.chef;
    const x = chef.x;
    const feet = CHEF.floorY;
    // Shadow.
    context.fillStyle = 'rgba(0,0,0,0.25)';
    ellipsePath(context, x, feet + 4, 36, 8);
    context.fill();
    // Legs and shoes.
    context.fillStyle = PALETTE.chefPants;
    context.fillRect(x - 20, feet - 34, 16, 30);
    context.fillRect(x + 4, feet - 34, 16, 30);
    context.fillStyle = '#2b2118';
    context.fillRect(x - 22, feet - 6, 20, 7);
    context.fillRect(x + 2, feet - 6, 20, 7);
    // Coat and apron.
    context.fillStyle = PALETTE.chefCoat;
    roundRect(context, x - 26, feet - 88, 52, 58, 8);
    context.fill();
    context.fillStyle = PALETTE.chefApron;
    context.fillRect(x - 18, feet - 72, 36, 44);
    context.fillStyle = '#ffffff';
    context.fillRect(x - 18, feet - 72, 36, 4);
    // Arms reaching forward, holding the tray up.
    context.fillStyle = PALETTE.chefCoat;
    context.fillRect(x + 20, feet - 80, 22, 12);
    context.fillRect(x - 42, feet - 80, 22, 12);
    // Head and toque.
    context.fillStyle = PALETTE.chefSkin;
    context.beginPath();
    context.arc(x, feet - 100, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2e2118';
    context.beginPath();
    context.arc(x - 7, feet - 102, 2.5, 0, Math.PI * 2);
    context.arc(x + 7, feet - 102, 2.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2e2118';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x - 5, feet - 96);
    context.lineTo(x, feet - 93);
    context.lineTo(x + 5, feet - 96);
    context.stroke();
    context.fillStyle = PALETTE.chefHat;
    context.beginPath();
    context.arc(x - 14, feet - 116, 12, 0, Math.PI * 2);
    context.arc(x, feet - 122, 14, 0, Math.PI * 2);
    context.arc(x + 14, feet - 116, 12, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x - 22, feet - 118, 44, 8);
    // The tray above the chef's hands, with what it holds: the dish mid-assembly.
    if (state.tray.length > 0) {
      const trayY = feet - 152;
      context.fillStyle = PALETTE.tray;
      roundRect(context, x - 46, trayY, 92, 12, 6);
      context.fill();
      for (let index = 0; index < state.tray.length; index += 1) {
        const offset = (index - (state.tray.length - 1) / 2) * 30;
        drawIngredient(context, state.tray[index], x + offset, trayY - 14, 26);
      }
    }
  }

  function drawTrayStrip(state) {
    context.fillStyle = PALETTE.board;
    context.fillRect(0, 652, FIELD.width, 68);
    for (let slot = 0; slot < 3; slot += 1) {
      const x = 110 + slot * 64;
      context.fillStyle = '#5a4636';
      roundRect(context, x, 660, 52, 52, 8);
      context.fill();
      if (slot < state.tray.length) drawIngredient(context, state.tray[slot], x + 26, 686, 40);
    }
  }

  function drawPanel(lines) {
    const height = panelHeight(lines);
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(30,20,14,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#8a6d3b';
    roundRect(context, x - 3, y - 3, PANEL.width + 6, height + 6, 15);
    context.fill();
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 12);
    context.fill();
  }

  /** Paint one frame: the kitchen shapes, then a panel rect for title/pause/over. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWall();
    drawBoard(state);
    drawWindow(state);
    drawChef(state);
    drawCounter(state);
    drawTrayStrip(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel([
        'Orders come in on the board — cook them all.',
        'Move with ← → or A D. Grab an ingredient with SPACE',
        'or by clicking its bin. Serve a full order at the window.',
        `Serve ${TARGET_DISHES} dishes before the shift ends.`,
        '',
        `Best ${best}`,
      ]);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel(['The orders will wait for you.']);
    } else if (screen === SCREEN_OVER) {
      drawPanel([
        state.overReason,
        `Score ${state.score}`,
        `Best ${best}`,
        '',
      ]);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
