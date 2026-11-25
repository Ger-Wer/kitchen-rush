// Every tuning number, dish and colour in one place. The kitchen is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds in one shift. Serve TARGET dishes before the clock runs out to win. */
export const SHIFT_SECONDS = 120;
export const TARGET_DISHES = 8;
export const LIVES = 3;

/** Points for a served dish, plus this per dish of the current streak. */
export const SERVE_POINTS = 100;
export const STREAK_BONUS = 25;
/** Extra seconds added to the clock for every served dish. */
export const SERVE_TIME_BONUS = 5;

export const CHEF = {
  width: 64,
  height: 96,
  /** Feet line: the chef walks on the kitchen floor. */
  floorY: 560,
  speed: 420,
};

/** The tray holds at most this many ingredients. */
export const TRAY_MAX = 3;

// Ingredient ids. Every dish is a set of three of them.
export const ING = {
  BUN: 'bun',
  PATTY: 'patty',
  LETTUCE: 'lettuce',
  TOMATO: 'tomato',
  CHEESE: 'cheese',
  DOUGH: 'dough',
};

/** The six bins on the counter, left to right, with their keyboard shortcut. */
export const BINS = [
  { id: ING.BUN, label: 'Bun', key: '1' },
  { id: ING.PATTY, label: 'Patty', key: '2' },
  { id: ING.LETTUCE, label: 'Lettuce', key: '3' },
  { id: ING.TOMATO, label: 'Tomato', key: '4' },
  { id: ING.CHEESE, label: 'Cheese', key: '5' },
  { id: ING.DOUGH, label: 'Dough', key: '6' },
];

/** The dishes the order board can ask for: name and the three ingredients it takes. */
export const DISHES = [
  { name: 'Burger', needs: [ING.BUN, ING.PATTY, ING.LETTUCE] },
  { name: 'Pizza', needs: [ING.DOUGH, ING.TOMATO, ING.CHEESE] },
  { name: 'Salad', needs: [ING.LETTUCE, ING.TOMATO, ING.CHEESE] },
  { name: 'Sandwich', needs: [ING.BUN, ING.PATTY, ING.TOMATO] },
  { name: 'Wrap', needs: [ING.DOUGH, ING.PATTY, ING.LETTUCE] },
  { name: 'Pasta', needs: [ING.DOUGH, ING.TOMATO, ING.LETTUCE] },
];

/** Orders waiting on the board at once. */
export const BOARD_SLOTS = 3;

/** How far the chef may stand from a bin's centre to grab from it, in pixels. */
export const GRAB_RANGE = 78;
/** How far the chef may stand from the serving window to serve, in pixels. */
export const SERVE_RANGE = 110;

/** Where the serving window sits: x of its centre, and the plate on its sill. */
export const WINDOW = { x: 1120, y: 300, width: 260, height: 250 };

/** Where the bins sit on the counter. */
export const COUNTER = { y: 560, binWidth: 108, binHeight: 68, gap: 14 };

export const PALETTE = {
  backdrop: '#2b1d16',
  wallTop: '#f3e2c7',
  wallBottom: '#e8cfa5',
  tile: '#d9b98a',
  tileLine: '#c8a878',
  floor: '#8a5a34',
  floorLine: '#744a28',
  counter: '#a06a3b',
  counterTop: '#c98f52',
  steel: '#b9c0c7',
  steelDark: '#8d949c',
  board: '#3d2b1f',
  boardEdge: '#6b4a2f',
  ticket: '#fff8e7',
  ticketDone: '#dff0d8',
  ink: '#2e2118',
  muted: '#7a6a58',
  chefSkin: '#f2c79b',
  chefHat: '#ffffff',
  chefCoat: '#f5f2ea',
  chefApron: '#3f6fb5',
  chefPants: '#334155',
  tray: '#c0c7cf',
  plate: '#ffffff',
  plateEdge: '#d7dce1',
  timer: '#f2c94c',
  timerLow: '#e5534b',
  text: '#f5efe4',
  textDark: '#2e2118',
  green: '#4caf50',
  red: '#e5534b',
  gold: '#f2c94c',
  panel: '#252b38',
  bun: '#e8b96a',
  bunDark: '#c98f3d',
  patty: '#6b4226',
  lettuce: '#58a34a',
  lettuceDark: '#3e7d33',
  tomato: '#d63c2f',
  tomatoDark: '#a82a20',
  cheese: '#f2c94c',
  cheeseDark: '#d9a91f',
  dough: '#f0e0bd',
  doughDark: '#d9c48f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'kitchen-rush.best';
