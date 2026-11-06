var BattleEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // apple/engine.ts
  var engine_exports = {};
  __export(engine_exports, {
    action: () => action,
    pause: () => pause,
    snapshot: () => snapshot,
    start: () => start,
    tick: () => tick
  });

  // client-nuxt/app/game/MatchRules.ts
  function normalizeMatchRules(value) {
    const v = value && typeof value === "object" ? value : {};
    const rules = { bestOf: [1, 3, 5].includes(v.bestOf) ? v.bestOf : 1, durationMs: [6e4, 12e4, 18e4].includes(v.durationMs) ? v.durationMs : 12e4, koTarget: [1, 2, 3, 5].includes(v.koTarget) ? v.koTarget : 3 };
    if (v.battleStyle === "facebook" || v.battleStyle === "custom") rules.battleStyle = v.battleStyle;
    if (v.itemStyle === "boosts" || v.itemStyle === "collect") rules.itemStyle = v.itemStyle;
    if (Array.isArray(v.boostLoadouts)) rules.boostLoadouts = [0, 1].map((i) => Array.isArray(v.boostLoadouts?.[i]) ? [...new Set(v.boostLoadouts[i].filter((id) => ["shield", "finalRush", "twinBomb"].includes(id)))] : []);
    if (rules.itemStyle === "boosts" && !rules.boostLoadouts) rules.boostLoadouts = [["shield", "finalRush", "twinBomb"], ["shield", "finalRush", "twinBomb"]];
    if ((rules.battleStyle === "facebook" || rules.itemStyle === "boosts") && !v.cooperative) {
      rules.durationMs = 12e4;
      rules.koTarget = 5;
      rules.bestOf = 1;
    }
    if (typeof v.original === "boolean") rules.original = v.original;
    if (Array.isArray(v.handicap)) rules.handicap = [0, 1].map((i) => Number.isInteger(v.handicap?.[i]) ? Math.max(0, Math.min(6, v.handicap[i])) : 0);
    if (typeof v.cooperative === "boolean") rules.cooperative = v.cooperative;
    if (v.goalLines !== void 0) rules.goalLines = [40, 80, 120].includes(v.goalLines) ? v.goalLines : 40;
    if (rules.original && !rules.cooperative) {
      rules.bestOf = 1;
      rules.durationMs = 12e4;
      rules.koTarget = v.koTarget === 2 ? 2 : 5;
    }
    if (rules.cooperative) {
      if (rules.original) rules.original = false;
      rules.bestOf = 1;
      rules.goalLines = rules.goalLines ?? 40;
    }
    return rules;
  }

  // client-nuxt/app/game/BattleRotation.ts
  var ordinary = {
    "01": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "10": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "12": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "21": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "23": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "32": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "30": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "03": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  var straight = {
    "01": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "10": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "12": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "21": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "23": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "32": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "30": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "03": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };
  function rotateBattle(piece2, direction, canPlace, onKick) {
    const from = piece2.rotationIndex, to = (from + direction + 4) % 4, x = piece2.x, y = piece2.y;
    piece2.rotationIndex = to;
    const originCorrection = piece2.type === "I" ? Number(to === 0) - Number(from === 0) : 0;
    const kicks = piece2.type === "O" ? [[0, 0]] : (piece2.type === "I" ? straight : ordinary)[`${from}${to}`];
    for (const [index, [dx, dy]] of kicks.entries()) {
      piece2.x = x + dx;
      piece2.y = y + originCorrection - dy;
      if (canPlace(piece2)) {
        onKick?.(index);
        return true;
      }
    }
    piece2.x = x;
    piece2.y = y;
    piece2.rotationIndex = from;
    return false;
  }

  // client-nuxt/app/game/Board.ts
  var Board = class {
    constructor(width = 10, height = 20) {
      __publicField(this, "width");
      __publicField(this, "height");
      __publicField(this, "grid");
      this.width = width;
      this.height = height;
      this.grid = this.createEmptyGrid();
    }
    /**
     * Get cell value at coordinates
     * Returns -1 if out of bounds
     */
    getCell(x, y) {
      if (!this.isValidPosition(x, y)) {
        return -1;
      }
      return this.grid[y][x];
    }
    /**
     * Set cell value at coordinates
     * Returns false if out of bounds
     */
    setCell(x, y, value) {
      if (!this.isValidPosition(x, y)) {
        return false;
      }
      this.grid[y][x] = value;
      return true;
    }
    /**
     * Check if coordinates are within board bounds
     */
    isValidPosition(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    /**
     * Check if a cell is empty (0) and within bounds
     * Returns false for occupied cells or out of bounds
     */
    isCellEmpty(x, y) {
      if (!this.isValidPosition(x, y)) {
        return false;
      }
      return this.grid[y][x] === 0;
    }
    /**
     * Reset all cells to empty (0)
     */
    clear() {
      this.grid = this.createEmptyGrid();
    }
    /**
     * Create empty grid filled with zeros
     */
    createEmptyGrid() {
      return Array.from(
        { length: this.height },
        () => Array.from({ length: this.width }, () => 0)
      );
    }
  };

  // client-nuxt/app/game/shapes.ts
  var SHAPES = {
    // I piece - horizontal bar
    I: [
      [[0, 0], [0, 1], [0, 2], [0, 3]],
      // rotation 0 - horizontal
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      // rotation 1 - vertical
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      // rotation 2 - horizontal
      [[0, 1], [1, 1], [2, 1], [3, 1]]
      // rotation 3 - vertical
    ],
    // O piece - square (doesn't change with rotation)
    O: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]]
    ],
    // T piece
    T: [
      [[0, 1], [1, 0], [1, 1], [1, 2]],
      // rotation 0 - T pointing up
      [[0, 1], [1, 1], [1, 2], [2, 1]],
      // rotation 1 - T pointing right
      [[1, 0], [1, 1], [1, 2], [2, 1]],
      // rotation 2 - T pointing down
      [[0, 1], [1, 0], [1, 1], [2, 1]]
      // rotation 3 - T pointing left
    ],
    // S piece
    S: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 1], [1, 2], [2, 0], [2, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]]
    ],
    // Z piece
    Z: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 2], [1, 1], [1, 2], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]]
    ],
    // J piece
    J: [
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 0], [2, 1]]
    ],
    // L piece
    L: [
      [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [1, 2], [2, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]]
    ]
  };
  var COLORS = {
    I: "#00f0f0",
    // Cyan
    O: "#f0f000",
    // Yellow
    T: "#a000f0",
    // Purple
    S: "#00f000",
    // Green
    Z: "#f00000",
    // Red
    J: "#0000f0",
    // Blue
    L: "#f0a000"
    // Orange
  };

  // client-nuxt/app/game/Tetromino.ts
  var Tetromino = class _Tetromino {
    constructor(type, x = 3, y = 0) {
      __publicField(this, "type");
      __publicField(this, "x");
      __publicField(this, "y");
      __publicField(this, "rotationIndex");
      __publicField(this, "color");
      this.type = type;
      this.x = x;
      this.y = y;
      this.rotationIndex = 0;
      this.color = COLORS[type] ?? "#ffffff";
    }
    /**
     * Get the shape data for current rotation
     */
    getShape() {
      const shapes = SHAPES[this.type];
      if (!shapes) {
        throw new Error(`Unknown tetromino type: ${this.type}`);
      }
      return shapes[this.rotationIndex] ?? shapes[0];
    }
    /**
     * Get absolute block positions on the board
     */
    getBlocks() {
      const shape = this.getShape();
      return shape.map(([row, col]) => ({
        x: this.x + col,
        y: this.y + row
      }));
    }
    /**
     * Rotate clockwise (90 degrees)
     */
    rotate() {
      this.rotationIndex = (this.rotationIndex + 1) % 4;
    }
    /**
     * Rotate counter-clockwise (270 degrees)
     */
    rotateCounterClockwise() {
      this.rotationIndex = (this.rotationIndex + 3) % 4;
    }
    /**
     * Move piece by delta
     */
    move(dx, dy) {
      this.x += dx;
      this.y += dy;
    }
    /**
     * Create a clone of this tetromino
     */
    clone() {
      const cloned = new _Tetromino(this.type, this.x, this.y);
      cloned.rotationIndex = this.rotationIndex;
      return cloned;
    }
  };

  // client-nuxt/app/game/LineClearing.ts
  var LINE_SCORES = [0, 100, 300, 500, 800];
  function checkAndClearLines(board) {
    const linesToClear = [];
    for (let y = board.height - 1; y >= 0; y--) {
      if (isLineComplete(board, y)) {
        linesToClear.push(y);
      }
    }
    if (linesToClear.length === 0) {
      return 0;
    }
    clearLines(board, linesToClear);
    return linesToClear.length;
  }
  function isLineComplete(board, y) {
    if (board.grid[y].some((cell) => cell === 9 || cell === 10)) return false;
    for (let x = 0; x < board.width; x++) {
      if (board.isCellEmpty(x, y)) {
        return false;
      }
    }
    return true;
  }
  function clearLines(board, linesToClear) {
    const sortedLines = [...linesToClear].sort((a, b) => a - b);
    for (const lineY of sortedLines) {
      shiftRowsDown(board, lineY);
    }
  }
  function shiftRowsDown(board, clearedRow) {
    for (let y = clearedRow; y > 0; y--) {
      for (let x = 0; x < board.width; x++) {
        const cellAbove = board.getCell(x, y - 1);
        board.setCell(x, y, cellAbove === -1 ? 0 : cellAbove);
      }
    }
    for (let x = 0; x < board.width; x++) {
      board.setCell(x, 0, 0);
    }
  }
  function calculateScore(linesCleared, level) {
    if (linesCleared <= 0 || linesCleared > 4) {
      return linesCleared > 4 ? LINE_SCORES[4] * level : 0;
    }
    return LINE_SCORES[linesCleared] * level;
  }

  // client-nuxt/app/game/Game.ts
  var PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
  var SCORE_SOFT_DROP = 1;
  var SCORE_HARD_DROP_PER_CELL = 2;
  var Game = class _Game {
    constructor() {
      __publicField(this, "board");
      __publicField(this, "currentPiece");
      __publicField(this, "nextPiece");
      __publicField(this, "heldPiece");
      __publicField(this, "score");
      __publicField(this, "level");
      __publicField(this, "linesCleared");
      __publicField(this, "isGameOver");
      __publicField(this, "isPaused");
      __publicField(this, "allowHold", false);
      __publicField(this, "pieceQueue");
      __publicField(this, "holdUsedThisTurn");
      __publicField(this, "dropTimer", 0);
      __publicField(this, "lockTimer", 0);
      __publicField(this, "LOCK_DELAY_MS", 500);
      __publicField(this, "increaseGravity", true);
      this.board = new Board();
      this.score = 0;
      this.level = 1;
      this.linesCleared = 0;
      this.isGameOver = false;
      this.isPaused = false;
      this.heldPiece = null;
      this.holdUsedThisTurn = false;
      this.pieceQueue = this.generatePieceQueue();
      this.currentPiece = this.spawnPiece();
      this.nextPiece = this.spawnPiece();
    }
    /**
     * Generate a shuffled queue of all 7 piece types (7-bag randomizer)
     */
    generatePieceQueue() {
      const bag = [...PIECE_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      return bag;
    }
    /**
     * Spawn a new piece at the top of the board
     */
    spawnPiece() {
      if (this.pieceQueue.length === 0) {
        this.pieceQueue = this.generatePieceQueue();
      }
      const type = this.pieceQueue.pop();
      const piece2 = new Tetromino(type);
      this.dropTimer = 0;
      this.lockTimer = 0;
      return piece2;
    }
    /**
     * Check if a piece can be placed at its current position
     */
    canPlacePiece(piece2) {
      const blocks = piece2.getBlocks();
      return blocks.every((block) => {
        if (block.x < 0 || block.x >= this.board.width) return false;
        if (block.y < 0 || block.y >= this.board.height) return false;
        return this.board.isCellEmpty(block.x, block.y);
      });
    }
    /**
     * Try to move piece in a direction
     * Returns true if move was successful
     */
    tryMove(dx, dy) {
      if (this.isGameOver || this.isPaused) return false;
      this.currentPiece.move(dx, dy);
      if (this.canPlacePiece(this.currentPiece)) {
        return true;
      }
      this.currentPiece.move(-dx, -dy);
      return false;
    }
    /**
     * Move piece left
     */
    moveLeft() {
      return this.tryMove(-1, 0);
    }
    /**
     * Move piece right
     */
    moveRight() {
      return this.tryMove(1, 0);
    }
    /**
     * Move piece down (soft drop)
     * @param isSoftDrop If true, adds score for soft drop (user action)
     */
    moveDown(isSoftDrop = false) {
      if (this.isGameOver || this.isPaused) return false;
      const moved = this.tryMove(0, 1);
      if (moved) {
        if (isSoftDrop) {
          this.score += SCORE_SOFT_DROP;
        }
      }
      return moved;
    }
    lockPiece() {
      const blocks = this.currentPiece.getBlocks();
      const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1;
      blocks.forEach((block) => {
        this.board.setCell(block.x, block.y, pieceColorIndex);
      });
      const cleared = checkAndClearLines(this.board);
      if (cleared > 0) {
        this.linesCleared += cleared;
        this.score += calculateScore(cleared, this.level);
        this.level = Math.floor(this.linesCleared / 10) + 1;
      }
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.spawnPiece();
      this.holdUsedThisTurn = false;
      this.lockTimer = 0;
      if (!this.canPlacePiece(this.currentPiece)) {
        this.isGameOver = true;
      }
    }
    /**
     * Hold current piece - swap with held piece or store if empty
     */
    hold() {
      if (this.isGameOver || this.isPaused) return;
      if (!this.allowHold) return;
      if (this.holdUsedThisTurn) return;
      this.holdUsedThisTurn = true;
      this.lockTimer = 0;
      if (this.heldPiece === null) {
        this.heldPiece = new Tetromino(this.currentPiece.type);
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.spawnPiece();
      } else {
        const tempType = this.currentPiece.type;
        this.currentPiece = new Tetromino(this.heldPiece.type);
        this.heldPiece = new Tetromino(tempType);
        this.currentPiece.x = 3;
        this.currentPiece.y = 0;
      }
      if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true;
    }
    /**
     * Rotate piece clockwise
     */
    rotate() {
      if (this.isGameOver || this.isPaused) return false;
      this.currentPiece.rotate();
      if (this.canPlacePiece(this.currentPiece)) {
        return true;
      }
      const kicks = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -2, dy: 0 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: -1 }
      ];
      for (const kick of kicks) {
        this.currentPiece.move(kick.dx, kick.dy);
        if (this.canPlacePiece(this.currentPiece)) {
          return true;
        }
        this.currentPiece.move(-kick.dx, -kick.dy);
      }
      this.currentPiece.rotateCounterClockwise();
      return false;
    }
    /**
     * Hard drop - instantly drop piece to bottom
     */
    hardDrop() {
      if (this.isGameOver || this.isPaused) return false;
      let dropDistance = 0;
      while (this.tryMove(0, 1)) {
        dropDistance++;
      }
      this.score += dropDistance * SCORE_HARD_DROP_PER_CELL;
      this.lockPiece();
      return true;
    }
    /**
     * Get ghost piece (preview of where piece will land)
     */
    getGhostPiece() {
      const ghost = this.currentPiece.clone();
      while (true) {
        ghost.move(0, 1);
        if (!this.canPlacePieceGhost(ghost)) {
          ghost.move(0, -1);
          break;
        }
      }
      return ghost;
    }
    /**
     * Check if ghost piece can be placed (ignores current piece)
     */
    canPlacePieceGhost(piece2) {
      const blocks = piece2.getBlocks();
      return blocks.every((block) => {
        if (block.x < 0 || block.x >= this.board.width) return false;
        if (block.y < 0 || block.y >= this.board.height) return false;
        return this.board.isCellEmpty(block.x, block.y);
      });
    }
    /**
     * Data structure for saved game state
     */
    serialize() {
      return {
        score: this.score,
        level: this.level,
        linesCleared: this.linesCleared,
        isGameOver: this.isGameOver,
        isPaused: this.isPaused,
        // Should save as true usually? Or keep current state.
        allowHold: this.allowHold,
        heldPiece: this.heldPiece ? {
          type: this.heldPiece.type,
          x: this.heldPiece.x,
          y: this.heldPiece.y,
          rotationIndex: this.heldPiece.rotationIndex
        } : null,
        currentPiece: {
          type: this.currentPiece.type,
          x: this.currentPiece.x,
          y: this.currentPiece.y,
          rotationIndex: this.currentPiece.rotationIndex
        },
        nextPiece: {
          type: this.nextPiece.type,
          x: this.nextPiece.x,
          y: this.nextPiece.y,
          rotationIndex: this.nextPiece.rotationIndex
        },
        board: this.board.grid,
        // 2D number array is serializable
        pieceQueue: this.pieceQueue,
        holdUsedThisTurn: this.holdUsedThisTurn,
        dropTimer: this.dropTimer,
        lockTimer: this.lockTimer,
        increaseGravity: this.increaseGravity
      };
    }
    /**
     * Restore game from saved state
     */
    static deserialize(data) {
      const game = new _Game();
      game.score = data.score;
      game.level = data.level;
      game.linesCleared = data.linesCleared;
      game.isGameOver = data.isGameOver;
      game.isPaused = data.isPaused;
      game.allowHold = data.allowHold;
      game.holdUsedThisTurn = data.holdUsedThisTurn;
      game.dropTimer = data.dropTimer;
      game.lockTimer = data.lockTimer;
      game.increaseGravity = data.increaseGravity;
      if (data.pieceQueue) {
        game.pieceQueue = [...data.pieceQueue];
      }
      if (data.board) {
        game.board.grid = data.board.map((row) => [...row]);
      }
      const restorePiece = (pieceData) => {
        const piece2 = new Tetromino(pieceData.type, pieceData.x, pieceData.y);
        piece2.rotationIndex = pieceData.rotationIndex;
        return piece2;
      };
      if (data.currentPiece) {
        game.currentPiece = restorePiece(data.currentPiece);
      }
      if (data.nextPiece) {
        game.nextPiece = restorePiece(data.nextPiece);
      }
      if (data.heldPiece) {
        game.heldPiece = restorePiece(data.heldPiece);
      } else {
        game.heldPiece = null;
      }
      return game;
    }
    /**
     * Toggle pause state
     */
    togglePause() {
      this.isPaused = !this.isPaused;
    }
    /**
     * Get drop interval in milliseconds based on current level
     * Formula: 1000ms * (0.9 ^ (level - 1))
     * Minimum speed caps at 100ms
     */
    getDropInterval() {
      if (!this.increaseGravity) return 1e3;
      const interval = 1e3 * Math.pow(0.9, this.level - 1);
      return Math.max(100, Math.floor(interval));
    }
    /**
     * Update game state based on elapsed time
     * @param deltaTime Time in ms since last update
     */
    update(deltaTime) {
      if (this.isPaused || this.isGameOver) return;
      this.dropTimer += deltaTime;
      const interval = this.getDropInterval();
      if (this.dropTimer >= interval) {
        this.moveDown();
        this.dropTimer = 0;
      }
      const testPiece = this.currentPiece.clone();
      testPiece.move(0, 1);
      const canMoveDown = this.canPlacePiece(testPiece);
      if (!canMoveDown) {
        this.lockTimer += deltaTime;
        if (this.lockTimer >= this.LOCK_DELAY_MS) {
          this.lockPiece();
        }
      } else {
        this.lockTimer = 0;
      }
    }
  };

  // client-nuxt/app/game/ClassicMaps.ts
  var CLASSIC_MAPS = [[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [5, 0, 0, 0, 4, 0, 0, 0, 0, 0], [0, 0, 6, 0, 0, 0, 2, 3, 0, 0], [0, 0, 0, 0, 0, 1, 0, 0, 5, 0], [0, 0, 0, 7, 0, 0, 0, 0, 0, 0], [0, 4, 0, 0, 0, 0, 6, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [5, 4, 0, 0, 0, 0, 0, 0, 4, 5], [5, 4, 0, 0, 0, 0, 0, 0, 4, 5], [5, 4, 7, 0, 0, 0, 0, 7, 4, 5], [7, 7, 7, 0, 0, 0, 0, 7, 7, 7], [5, 5, 7, 5, 0, 0, 5, 7, 5, 5], [5, 5, 7, 5, 0, 0, 5, 7, 5, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 4, 7, 5, 0, 0, 5, 7, 4, 5], [5, 7, 7, 5, 0, 0, 5, 7, 7, 5], [5, 5, 5, 5, 0, 0, 5, 5, 5, 5]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 0, 0, 4, 4, 4, 4], [1, 5, 5, 5, 0, 0, 5, 5, 5, 4], [1, 5, 2, 2, 0, 0, 2, 2, 5, 4], [1, 5, 2, 7, 0, 0, 7, 2, 5, 4], [1, 5, 2, 7, 0, 0, 7, 2, 5, 4], [1, 5, 2, 7, 0, 0, 7, 2, 5, 4], [1, 5, 2, 7, 0, 0, 7, 2, 5, 4], [1, 5, 2, 2, 0, 0, 2, 2, 5, 4], [1, 5, 5, 5, 0, 0, 5, 5, 5, 4], [1, 1, 1, 1, 0, 0, 4, 4, 4, 4]]];
  var emptyLayout = () => Array.from({ length: 20 }, () => Array(10).fill(0));
  var heart = emptyLayout();
  ["0110011000", "1111111100", "1111111100", "0111111000", "0011110000", "0001100000"].forEach((row, i) => [...row].forEach((v, x) => {
    if (v === "1") heart[14 + i][x + 1] = i % 2 ? 5 : 3;
  }));
  var stairs = emptyLayout();
  [0, 1, 2, 3, 4, 5, 4, 3, 2, 1].forEach((height, x) => {
    for (let i = 0; i < height; i++) stairs[19 - i][x] = x % 7 + 1;
  });
  var tunnel = emptyLayout();
  for (let y = 15; y < 20; y++) for (let x = 0; x < 10; x++) if (x !== 4) tunnel[y][x] = (y + x) % 7 + 1;
  var zigzag = emptyLayout();
  for (let y = 13; y < 20; y++) for (let x = 0; x < 10; x++) if (x !== 2 + Math.floor((y - 13) / 2)) zigzag[y][x] = (x + y) % 7 + 1;
  var hills = emptyLayout();
  [2, 4, 3, 1, 0, 0, 1, 3, 4, 2].forEach((height, x) => {
    for (let i = 0; i < height; i++) hills[19 - i][x] = (x + i) % 7 + 1;
  });
  CLASSIC_MAPS.push(heart, stairs, tunnel, zigzag, hills);

  // client-nuxt/app/game/ClassicBattle.ts
  var TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
  var BattleGame = class extends Game {
    constructor() {
      super();
      __publicField(this, "bombGarbage", false);
      __publicField(this, "twinBomb", false);
      __publicField(this, "lockResets", 0);
      __publicField(this, "lastKick", 0);
      __publicField(this, "sent", 0);
      __publicField(this, "pending", 0);
      __publicField(this, "combo", -1);
      __publicField(this, "backToBack", false);
      __publicField(this, "rotated", false);
      __publicField(this, "event", null);
      __publicField(this, "effectTime", 0);
      __publicField(this, "onAttack", () => {
      });
      this.allowHold = true;
      this.increaseGravity = false;
    }
    spawnPiece() {
      while (this.pieceQueue.length < 6) {
        const bag = [...TYPES];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        this.pieceQueue.unshift(...bag);
      }
      return super.spawnPiece();
    }
    get previews() {
      return [this.nextPiece.type, ...this.pieceQueue.slice(-4).reverse()];
    }
    canPlacePiece(piece2) {
      return piece2.getBlocks().every((b) => b.x >= 0 && b.x < 10 && b.y >= -2 && b.y < 20 && (b.y < 0 || this.board.isCellEmpty(b.x, b.y)));
    }
    getGhostPiece() {
      const ghost = this.currentPiece.clone();
      while (true) {
        ghost.y++;
        if (!this.canPlacePiece(ghost)) {
          ghost.y--;
          return ghost;
        }
      }
    }
    rotate() {
      return this.turn(1);
    }
    rotateLeft() {
      return this.turn(-1);
    }
    turn(direction) {
      if (this.isPaused || this.isGameOver) return false;
      const grounded = this.grounded();
      const ok = rotateBattle(this.currentPiece, direction, (piece2) => this.canPlacePiece(piece2), (index) => {
        this.lastKick = index;
      });
      if (ok) {
        this.rotated = true;
        this.resetGroundLock(grounded);
      }
      return ok;
    }
    hold() {
      const used = this.holdUsedThisTurn;
      super.hold();
      if (!used && this.holdUsedThisTurn) {
        this.lockResets = 0;
        this.rotated = false;
        if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true;
      }
    }
    grounded() {
      const piece2 = this.currentPiece.clone();
      piece2.y++;
      return !this.canPlacePiece(piece2);
    }
    resetGroundLock(grounded) {
      if (grounded && this.lockResets < 15) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    }
    moveLeft() {
      const grounded = this.grounded();
      const ok = super.moveLeft();
      if (ok) {
        this.rotated = false;
        this.resetGroundLock(grounded);
      }
      return ok;
    }
    moveRight() {
      const grounded = this.grounded();
      const ok = super.moveRight();
      if (ok) {
        this.rotated = false;
        this.resetGroundLock(grounded);
      }
      return ok;
    }
    lockPiece() {
      const p = this.currentPiece;
      if (p.getBlocks().some((block) => block.y < 0)) {
        this.isGameOver = true;
        return;
      }
      let bombs = 0;
      if (this.bombGarbage) {
        const blocks = p.getBlocks(), rows = /* @__PURE__ */ new Set();
        for (const block of blocks) {
          let row = block.y + 1;
          while (row < 20 && this.board.getCell(block.x, row) === 9) {
            rows.add(row);
            row++;
          }
        }
        if (rows.size) {
          bombs = rows.size;
          this.board.grid = this.board.grid.filter((_, y) => !rows.has(y));
          while (this.board.grid.length < 20) this.board.grid.unshift(Array(10).fill(0));
          p.y += bombs;
        }
      }
      const corners = [[0, 0], [2, 0], [0, 2], [2, 2]].filter(([dx, dy]) => !this.board.isCellEmpty(p.x + dx, p.y + dy)).length;
      const spin = p.type === "T" && this.rotated && corners >= 3;
      const frontCorners = [[[0, 0], [2, 0]], [[2, 0], [2, 2]], [[0, 2], [2, 2]], [[0, 0], [0, 2]]][p.rotationIndex];
      const front = frontCorners.filter(([dx, dy]) => !this.board.isCellEmpty(p.x + dx, p.y + dy)).length;
      const before = this.linesCleared;
      super.lockPiece();
      this.lockResets = 0;
      const lines = this.linesCleared - before;
      const mini = spin && lines === 1 && front < 2 && this.lastKick !== 4;
      const difficult = lines === 4 || spin && lines > 0;
      const b2b = difficult && this.backToBack;
      let attack = 0;
      if (lines > 0) {
        this.combo++;
        attack = mini ? 1 : spin ? [0, 2, 4, 6][lines] : [0, 0, 1, 2, 4][lines];
        if (b2b) attack = mini ? 2 : spin ? Math.floor(attack * 1.5) : attack + 2;
        if (this.combo > 0) attack += Math.min(4, Math.floor((this.combo + 1) / 2));
        this.backToBack = difficult;
        if (this.bombGarbage && this.board.grid.every((row) => row.every((cell) => cell === 0))) attack = Math.max(attack, 10);
      } else if (bombs === 0) this.combo = -1;
      attack += Math.floor(bombs / 2);
      this.linesCleared += bombs;
      this.event = { lines, attack, combo: this.combo, spin, mini, backToBack: b2b };
      this.effectTime = lines > 0 ? 1200 : 0;
      const cancelled = Math.min(attack, this.pending);
      this.pending -= cancelled;
      attack -= cancelled;
      this.sent += attack;
      if (attack > 0) this.onAttack(attack);
      if (lines === 0 && this.pending > 0) {
        const count = Math.min(12, this.pending);
        this.pending -= count;
        this.addGarbage(count);
      }
      this.rotated = false;
    }
    addGarbage(count) {
      if (this.bombGarbage) {
        const column = Math.floor(Math.random() * this.board.width);
        for (let i = 0; i < count; i++) {
          if (this.board.grid[0].some(Boolean)) this.isGameOver = true;
          this.board.grid.shift();
          this.board.grid.push(Array.from({ length: 10 }, (_, x) => x === column || this.twinBomb && x === (column + 5) % 10 ? 9 : 8));
        }
        if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true;
        return;
      }
      const hole = Math.floor(Math.random() * this.board.width);
      for (let i = 0; i < count; i++) {
        if (this.board.grid[0].some(Boolean)) this.isGameOver = true;
        this.board.grid.shift();
        this.board.grid.push(Array.from({ length: this.board.width }, (_, x) => x === hole ? 0 : 8));
      }
      if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true;
    }
    update(ms) {
      super.update(ms);
      this.effectTime = Math.max(0, this.effectTime - ms);
    }
  };
  function playCPU(game, race = false) {
    if (game.isGameOver) return;
    let best = null, value = -Infinity;
    for (let rotation = 0; rotation < 4; rotation++) for (let x = -3; x < 10; x++) {
      const p = new Tetromino(game.currentPiece.type, x, 0);
      p.rotationIndex = rotation;
      if (!game.canPlacePiece(p)) continue;
      while (true) {
        p.y++;
        if (!game.canPlacePiece(p)) {
          p.y--;
          break;
        }
      }
      const grid = game.board.grid.map((row) => [...row]);
      for (const b of p.getBlocks()) grid[b.y][b.x] = 1;
      const cleared = grid.filter((row) => row.every(Boolean)).length;
      const rest = grid.filter((row) => !row.every(Boolean));
      while (rest.length < 20) rest.unshift(Array(10).fill(0));
      const heights = Array.from({ length: 10 }, (_, col) => {
        const first = rest.findIndex((row) => row[col] !== 0);
        return first < 0 ? 0 : 20 - first;
      });
      let holes = 0;
      for (let col = 0; col < 10; col++) for (let y = 20 - heights[col]; y < 20; y++) if (rest[y][col] === 0) holes++;
      const bump = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0);
      const score = cleared * (race ? 14 : 8) - heights.reduce((a, b) => a + b, 0) * 0.5 - holes * 7 - bump * 0.4;
      if (score > value) {
        best = p;
        value = score;
      }
    }
    if (best) {
      best.y = 0;
      game.currentPiece = best;
      game.rotated = false;
      game.hardDrop();
    } else game.isGameOver = true;
  }

  // client-nuxt/app/game/SharedPieces.ts
  var TYPES2 = ["I", "O", "T", "S", "Z", "J", "L"];
  function sharedBag(seed, bag) {
    let state = (seed ^ Math.imul(bag + 1, 2654435769)) >>> 0;
    const random = () => {
      state = state + 1831565813 >>> 0;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
    const pieces = [...TYPES2];
    for (let i = 6; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    ;
    return pieces;
  }
  function sharedPiece(seed, index) {
    if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Invalid piece index");
    return sharedBag(seed, Math.floor(index / 7))[index % 7];
  }

  // client-nuxt/app/game/GameModes.ts
  var ALL_MODES = [
    { id: "battle2p", name: "\uAE30\uBCF8\uC804", group: "multi", players: 2, goal: "2\uBD84 \xB7 \uACF5\uACA9 \uC904\uACFC KO\uB85C \uC2B9\uBD80", duration: 12e4, source: "battle2p" },
    { id: "item", name: "\uC544\uC774\uD15C\uC804", group: "multi", players: 2, goal: "\uC544\uC774\uD15C 5\uC885 \xB7 \uB9C8\uC9C0\uB9C9 30\uCD08 \uD53C\uBC84 \xB7 2\uBD84 \xB7 3 KO", duration: 12e4 },
    { id: "speed", name: "\uC2A4\uD53C\uB4DC\uC804", group: "multi", players: 2, goal: "15\uCD08\uB9C8\uB2E4 \uAC00\uC18D \xB7 2\uBD84 \xB7 3 KO \uC2B9\uB9AC", duration: 12e4 },
    { id: "arena", name: "ARENA", group: "multi", players: 6, goal: "\uB9C8\uC9C0\uB9C9\uAE4C\uC9C0 \uC0B4\uC544\uB0A8\uAE30 \xB7 CPU 5\uBA85", source: "live" },
    { id: "battle6p", name: "BATTLE 6P", group: "multi", players: 6, goal: "2\uBD84 \xB7 CPU 5\uBA85\uACFC \uACF5\uACA9 \uB300\uC804", duration: 12e4, source: "battle6p" },
    { id: "rally8p", name: "RALLY 8P", group: "multi", players: 8, goal: "80\uC904 \uB9F5\uC744 \uB0B4\uB824\uAC00 GOAL\uC5D0 \uBA3C\uC800 \uCC29\uC9C0", target: 80, source: "rally8p" },
    { id: "sprint5p", name: "SPRINT 5P", group: "multi", players: 5, goal: "CPU 4\uBA85\uBCF4\uB2E4 \uBA3C\uC800 40\uC904 \uC9C0\uC6B0\uAE30", target: 40, source: "sprint5p" },
    { id: "marathon", name: "MARATHON", group: "solo", players: 1, goal: "150\uC904 \xB7 15\uB808\uBCA8 \uC644\uC8FC", target: 150, source: "marathon" },
    { id: "sprint", name: "SPRINT", group: "solo", players: 1, goal: "40\uC904\uC744 \uAC00\uC7A5 \uBE60\uB974\uAC8C", target: 40, source: "sprint" },
    { id: "ultra", name: "ULTRA", group: "solo", players: 1, goal: "2\uBD84 \uB3D9\uC548 \uCD5C\uACE0 \uC810\uC218", duration: 12e4, source: "ultra" },
    { id: "retro", name: "1989", group: "solo", players: 1, goal: "\uD751\uBC31 \uD074\uB798\uC2DD \xB7 HOLD / \uBE60\uB978 \uB099\uD558 \uC5C6\uC74C", source: "mono" },
    { id: "survival", name: "SURVIVAL", group: "solo", players: 1, goal: "20\uB808\uBCA8 \uD6C4 \uCD08\uACE0\uC18D \uBCF4\uB108\uC2A4 \uB808\uBCA8", target: 200, source: "survival" },
    { id: "nblox", name: "N-BLOX", group: "solo", players: 1, goal: "\uAE30\uBCF8 \uBE14\uB85D \uAC8C\uC784 \xB7 \uB05D\uC5C6\uC774 \uC810\uC218 \uC313\uAE30", source: "nblox" },
    { id: "classic", name: "CLASSIC CPU", group: "multi", players: 2, goal: "\uAE30\uC874 130\uCD08 \uD074\uB798\uC2DD CPU \uB300\uC804", duration: 13e4 }
  ];
  var MODES = ALL_MODES.filter((m) => m.id === "battle2p" || m.id === "speed" || m.id === "item");
  var modeInfo = (id) => ALL_MODES.find((m) => m.id === id);
  var isRace = (id) => id === "rally8p" || id === "sprint5p" || id === "sprint";
  var isRetro = (id) => id === "retro" || id === "nblox";
  var ModeGame = class extends BattleGame {
    constructor(mode) {
      super();
      __publicField(this, "pieceSeed");
      __publicField(this, "sequenceCursor", 0);
      __publicField(this, "mode", "classic");
      __publicField(this, "rallyReserve", []);
      __publicField(this, "rallyGoal", false);
      __publicField(this, "slowTime", 0);
      __publicField(this, "speedInterval", 800);
      __publicField(this, "onLock", () => {
      });
      __publicField(this, "onItemCollect", () => {
      });
      __publicField(this, "collectibleItems", true);
      __publicField(this, "itemLocks", 0);
      __publicField(this, "itemBlocks", 0);
      this.mode = mode;
      this.allowHold = !isRetro(mode);
      this.increaseGravity = ["marathon", "survival", "retro", "nblox"].includes(mode);
    }
    plantItemBlock() {
      if (this.mode !== "item" || !this.collectibleItems) return false;
      const cells = this.board.grid.flatMap((row, y) => row.flatMap((cell, x) => cell > 0 && cell < 8 ? [{ x, y }] : []));
      if (!cells.length) return false;
      const position = cells[(this.itemBlocks * 17 + (this.pieceSeed ?? 0)) % cells.length];
      const itemIndex = (this.itemBlocks + (this.pieceSeed ?? 0) % 5) % 5;
      this.board.grid[position.y][position.x] = 11 + itemIndex;
      this.itemBlocks++;
      return true;
    }
    spawnPiece() {
      if (this.pieceSeed === void 0) return super.spawnPiece();
      const piece2 = new Tetromino(sharedPiece(this.pieceSeed, this.sequenceCursor++));
      this.fillSharedPreview();
      this.dropTimer = 0;
      this.lockTimer = 0;
      return piece2;
    }
    fillSharedPreview() {
      if (this.pieceSeed !== void 0) this.pieceQueue = Array.from({ length: 6 }, (_, i) => sharedPiece(this.pieceSeed, this.sequenceCursor + i)).reverse();
    }
    configureSequence(seed) {
      this.pieceSeed = seed >>> 0;
      this.sequenceCursor = 0;
      this.currentPiece = this.spawnPiece();
      this.nextPiece = this.spawnPiece();
      if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true;
    }
    resumeSequence(previous) {
      if (previous.pieceSeed === void 0) return;
      this.pieceSeed = previous.pieceSeed;
      this.sequenceCursor = previous.sequenceCursor;
      this.currentPiece = new Tetromino(previous.currentPiece.type);
      this.nextPiece = new Tetromino(previous.nextPiece.type);
      this.fillSharedPreview();
    }
    get showGhost() {
      return !isRetro(this.mode);
    }
    get previewsShown() {
      return isRetro(this.mode) ? this.previews.slice(0, 1) : this.previews;
    }
    hardDrop() {
      if (isRetro(this.mode)) return false;
      return super.hardDrop();
    }
    rotate() {
      if (!isRetro(this.mode)) return super.rotate();
      if (this.isPaused || this.isGameOver) return false;
      this.currentPiece.rotate();
      if (this.canPlacePiece(this.currentPiece)) return true;
      this.currentPiece.rotateCounterClockwise();
      return false;
    }
    rotateLeft() {
      if (!isRetro(this.mode)) return super.rotateLeft();
      if (this.isPaused || this.isGameOver) return false;
      this.currentPiece.rotateCounterClockwise();
      if (this.canPlacePiece(this.currentPiece)) return true;
      this.currentPiece.rotate();
      return false;
    }
    getDropInterval() {
      if (this.mode === "item" && this.slowTime > 0) return super.getDropInterval() * 1.8;
      if (this.mode === "speed") return this.speedInterval;
      if (this.mode === "survival" && this.linesCleared >= 200) return 16;
      if (this.mode === "retro") return Math.max(60, 800 * Math.pow(0.78, this.level - 1));
      return super.getDropInterval();
    }
    seedRally() {
      const rows = Array.from({ length: 80 }, (_, i) => Array.from({ length: 10 }, (_2, x) => x === (Math.floor(i / 3) * 3 + 4) % 10 ? 0 : 8));
      this.board.grid = [...Array.from({ length: 10 }, () => Array(10).fill(0)), ...rows.slice(0, 10).map((r) => [...r])];
      this.rallyReserve = rows.slice(10).map((r) => [...r]);
    }
    get rallyRemaining() {
      return this.rallyReserve.length + this.board.grid.filter((row) => row.includes(8)).length;
    }
    lockPiece() {
      const placed = this.currentPiece.getBlocks();
      const before = this.linesCleared, scoreBefore = this.score, levelBefore = this.level;
      let garbageClears = 0;
      if (this.mode === "rally8p") {
        const simulated = this.board.grid.map((r) => [...r]);
        for (const b of placed) if (b.y >= 0 && b.y < 20) simulated[b.y][b.x] = 1;
        garbageClears = simulated.filter((row) => row.every(Boolean) && row.includes(8)).length;
        this.rallyGoal = this.rallyRemaining === 0 && placed.some((b) => b.y === 19);
      }
      const collected = [];
      if (this.mode === "item" && this.collectibleItems) {
        const simulated = this.board.grid.map((row) => [...row]);
        for (const b of placed) if (b.y >= 0 && b.y < 20 && b.x >= 0 && b.x < 10) simulated[b.y][b.x] = 1;
        for (const row of simulated) if (row.every(Boolean)) for (const cell of row) {
          const item = blockItem(cell);
          if (item) collected.push(item);
        }
      }
      super.lockPiece();
      for (const item of collected) this.onItemCollect(item);
      if (this.mode === "item" && this.collectibleItems && !this.isGameOver) {
        this.itemLocks++;
        if (this.itemLocks % 3 === 1) this.plantItemBlock();
      }
      const cleared = this.linesCleared - before;
      if (isRetro(this.mode)) this.score = scoreBefore + [0, 40, 100, 300, 1200][cleared] * levelBefore;
      else if (cleared > 0 && this.event) {
        if (this.event.spin) this.score += (this.event.mini ? 100 : [0, 800, 1200, 1600][cleared]) * levelBefore;
        if (this.event.backToBack) this.score += 400 * levelBefore;
        if (this.event.combo > 0) this.score += 50 * this.event.combo * levelBefore;
      }
      if (this.mode === "rally8p") for (let i = 0; i < garbageClears && this.rallyReserve.length; i++) {
        if (this.board.grid[0].some(Boolean)) this.isGameOver = true;
        this.board.grid.shift();
        this.board.grid.push(this.rallyReserve.shift());
      }
      this.onLock();
    }
  };
  var BLOCK_ITEMS = ["rocket", "shield", "broom", "slow", "gift"];
  function blockItem(cell) {
    return BLOCK_ITEMS[cell - 11];
  }
  var ITEMS = {
    rocket: { name: "\uB85C\uCF13", icon: "\u{1F680}", description: "\uC0C1\uB300\uC5D0\uAC8C 3\uC904 \uACF5\uACA9 \xB7 \uD53C\uBC84 \uB54C 4\uC904" },
    shield: { name: "\uBC29\uD328", icon: "\u{1F6E1}\uFE0F", description: "6\uCD08 \uC548\uC5D0 \uB4E4\uC5B4\uC624\uB294 \uACF5\uACA9 \uD55C \uBC88 \uBC29\uC5B4" },
    broom: { name: "\uBE57\uC790\uB8E8", icon: "\u{1F9F9}", description: "\uC544\uB798 2\uC904 \uC815\uB9AC \xB7 \uB300\uAE30 \uACF5\uACA9 4\uC904 \uC81C\uAC70" },
    slow: { name: "\uC5EC\uC720 \uD0C0\uC784", icon: "\u{1FAE7}", description: "8\uCD08 \uB3D9\uC548 \uB0B4 \uBE14\uB85D\uC774 \uCC9C\uCC9C\uD788 \uB0B4\uB824\uC640\uC694" },
    gift: { name: "\uC120\uBB3C\uC0C1\uC790", icon: "\u{1F381}", description: "\uB458 \uB2E4 \uC544\uC774\uD15C \uD558\uB098 \xB7 \uB300\uAE30 \uACF5\uACA9 2\uC904 \uC81C\uAC70" }
  };
  var ModeSession = class {
    constructor(mode, cpu = true, map = 0, options = {}) {
      this.mode = mode;
      __publicField(this, "itemStyle");
      __publicField(this, "boosts", []);
      __publicField(this, "original");
      __publicField(this, "cooperative");
      __publicField(this, "goalLines");
      __publicField(this, "handicap");
      __publicField(this, "koTarget");
      __publicField(this, "pieceSeed", Math.random() * 4294967296 >>> 0);
      __publicField(this, "info");
      __publicField(this, "players");
      __publicField(this, "koEffectTime");
      __publicField(this, "kos");
      __publicField(this, "eliminated");
      __publicField(this, "paused", false);
      __publicField(this, "winner", null);
      __publicField(this, "elapsed", 0);
      __publicField(this, "remaining");
      __publicField(this, "cpu");
      __publicField(this, "humanSeats");
      __publicField(this, "target", 1);
      __publicField(this, "attackTargets", []);
      __publicField(this, "lastAttacker", []);
      __publicField(this, "finished", false);
      __publicField(this, "outcome", "");
      __publicField(this, "items", []);
      __publicField(this, "itemClock", 0);
      __publicField(this, "itemDraws", []);
      __publicField(this, "cpuItemClock", []);
      __publicField(this, "itemDeck", ["broom", "rocket", "slow", "shield", "gift"]);
      __publicField(this, "cpuClocks");
      const rules = normalizeMatchRules(options), custom = ["battle2p", "speed", "item"].includes(mode);
      this.itemStyle = rules.itemStyle ?? "collect";
      this.original = !rules.cooperative && (!!rules.original || rules.battleStyle === "facebook" || mode === "item" && this.itemStyle === "boosts");
      this.cooperative = !!rules.cooperative && custom;
      this.goalLines = rules.goalLines ?? 40;
      this.handicap = rules.handicap ?? [0, 0];
      this.koTarget = this.original ? rules.koTarget : custom ? rules.koTarget : 3;
      this.info = { ...modeInfo(mode), ...custom ? { duration: this.original ? 12e4 : rules.durationMs } : {} };
      this.cpu = this.info.players > 2 || cpu;
      this.humanSeats = new Set(this.cpu ? [0] : [0, 1]);
      this.boosts = Array.from({ length: this.info.players }, (_, i) => {
        const selected = mode === "item" && this.itemStyle === "boosts" ? rules.boostLoadouts?.[i] ?? ["shield", "finalRush", "twinBomb"] : [];
        return { selected: [...selected], shieldLeft: selected.includes("shield") ? 15 : 0, rushLeft: selected.includes("finalRush") ? 15 : 0, blocked: 0, checks: 0 };
      });
      this.players = Array.from({ length: this.info.players }, () => new ModeGame(mode));
      this.koEffectTime = this.players.map(() => 0);
      this.kos = this.players.map(() => 0);
      this.eliminated = this.players.map(() => false);
      this.cpuClocks = this.players.map(() => 0);
      this.attackTargets = this.players.map((_, i) => (i + 1) % this.players.length);
      this.lastAttacker = this.players.map(() => -1);
      this.remaining = this.info.duration ?? 0;
      for (const game of this.players) {
        if (mode === "rally8p") game.seedRally();
        else if (this.info.group === "multi" && map > 0 && CLASSIC_MAPS[map - 1]) game.board.grid = CLASSIC_MAPS[map - 1].map((r) => [...r]);
      }
      this.players.forEach((game, i) => {
        const count = this.handicap[i] ?? 0, hole = this.pieceSeed % 10;
        if (count > 0) {
          game.board.grid.splice(0, count);
          for (let row = 0; row < count; row++) game.board.grid.push(Array.from({ length: 10 }, (_, x) => x === hole ? 0 : 8));
          for (let row = 0; row < 4; row++) game.board.grid[row] = Array(10).fill(0);
        }
        if (this.original) {
          for (const row of game.board.grid) for (let x = 0; x < 10; x++) if (row[x] === 8) row[x] = 10;
        }
        game.collectibleItems = this.itemStyle === "collect";
        game.bombGarbage = this.original;
        game.twinBomb = this.boosts[i].selected.includes("twinBomb");
        game.configureSequence(this.pieceSeed);
      });
      this.items = this.players.map(() => ({ inventory: this.itemStyle === "boosts" ? [] : ["rocket", "shield"], cooldown: 0, shield: 0, guard: 0, notice: this.itemStyle === "boosts" ? "AUTO \uBD80\uC2A4\uD2B8 \xB7 \uC22B\uC790\uD0A4 \uC5C6\uC774 \uC790\uB3D9 \uC801\uC6A9" : "\uB85C\uCF13\uACFC \uBC29\uD328\uB85C \uC2DC\uC791! 1\xB72\xB73\uC740 \uD604\uC7AC \uAC00\uBC29 \uC21C\uC11C", noticeTime: 2500, revision: 0 }));
      this.itemDraws = this.players.map(() => 0);
      this.cpuItemClock = this.players.map(() => 0);
      this.itemDeck = this.itemDeck.map((value) => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map((entry) => entry.value);
      if (mode === "item" && this.itemStyle === "collect") this.players.forEach((game) => {
        game.plantItemBlock();
        game.plantItemBlock();
      });
      this.wire();
    }
    get timed() {
      return !!this.info.duration;
    }
    get solo() {
      return this.info.players === 1;
    }
    get localTwoPlayer() {
      return this.info.players === 2 && !this.cpu;
    }
    wire() {
      this.players.forEach((game, i) => {
        game.onAttack = (n) => {
          if (this.cooperative) {
            game.sent = Math.max(0, game.sent - n);
            return;
          }
          if (this.solo || isRace(this.mode) || this.eliminated[i]) return;
          const targets = this.players.map((_, j2) => j2).filter((j2) => j2 !== i && !this.eliminated[j2]);
          const j = this.humanSeats.has(i) && targets.includes(this.attackTargets[i]) ? this.attackTargets[i] : targets[Math.floor(Math.random() * targets.length)];
          if (j !== void 0 && !(this.mode === "item" && this.itemStyle === "collect" && this.blockItemAttack(j))) {
            const boost = this.boosts[i], bonus = this.remaining <= 3e4 && boost.rushLeft > 0 ? 1 : 0;
            boost.rushLeft -= bonus;
            game.sent += bonus;
            const received = this.receiveBoostAttack(j, n + bonus);
            this.players[j].pending += received;
            if (received > 0) this.lastAttacker[j] = i;
          }
        };
        game.onItemCollect = (item) => {
          if (!this.giveItem(i, item)) this.itemNotice(i, "\uAC00\uBC29\uC774 \uAC00\uB4DD \uCC3C\uC5B4\uC694! V/B/N\uC73C\uB85C \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694.");
        };
        game.onLock = () => {
          this.checkGoals();
        };
      });
    }
    receiveBoostAttack(player, lines) {
      const boost = this.boosts[player];
      let received = 0;
      for (let i = 0; i < lines; i++) {
        boost.checks++;
        let hash = (this.pieceSeed ^ Math.imul(boost.checks, 2654435761)) >>> 0;
        hash = Math.imul(hash ^ hash >>> 16, 2246822507) >>> 0;
        if (boost.shieldLeft > 0 && (hash & 1) === 0) {
          boost.shieldLeft--;
          boost.blocked++;
        } else received++;
      }
      return received;
    }
    get itemFever() {
      return this.mode === "item" && this.remaining <= 3e4;
    }
    get nextItemIn() {
      return Math.max(0, (this.itemFever ? 8e3 : 12e3) - this.itemClock);
    }
    itemNotice(player, text) {
      const state = this.items[player];
      state.notice = text;
      state.noticeTime = 2400;
      state.revision++;
    }
    giveItem(player, collected) {
      if (this.mode !== "item" || this.itemStyle === "boosts" || !this.items[player] || this.items[player].inventory.length >= 3) return false;
      const item = collected ?? this.itemDeck[this.itemDraws[player] % this.itemDeck.length];
      if (!collected) this.itemDraws[player]++;
      this.items[player].inventory.push(item);
      this.itemNotice(player, `${ITEMS[item].icon} ${ITEMS[item].name} \uD68D\uB4DD!`);
      return true;
    }
    blockItemAttack(player) {
      const item = this.items[player];
      if (item.guard > 0) {
        this.itemNotice(player, "\u2728 KO \uD6C4 \uBCF4\uD638 \uC911!");
        return true;
      }
      if (item.shield > 0) {
        item.shield = 0;
        this.itemNotice(player, "\u{1F6E1}\uFE0F \uACF5\uACA9\uC744 \uB9C9\uC558\uC5B4\uC694!");
        return true;
      }
      return false;
    }
    useItem(player, slot = 0) {
      if (this.mode !== "item" || this.paused || this.finished || !Number.isInteger(player) || !Number.isInteger(slot) || slot < 0 || slot > 2) return false;
      const state = this.items[player], game = this.players[player];
      if (!state || !game || game.isGameOver) return false;
      if (this.itemStyle === "boosts") {
        this.itemNotice(player, "AUTO \uBD80\uC2A4\uD2B8\uB294 \uC790\uB3D9 \uC801\uC6A9\uB3FC\uC694. \uC22B\uC790\uD0A4 \uC0AC\uC6A9\uC740 \uBE14\uB85D \uC218\uC9D1 \uBC29\uC2DD\uC5D0\uC11C \uAC00\uB2A5\uD569\uB2C8\uB2E4");
        return false;
      }
      if (state.cooldown > 0) {
        this.itemNotice(player, `\u23F3 ${Math.ceil(state.cooldown / 1e3)}\uCD08 \uD6C4 \uB2E4\uC2DC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694`);
        return false;
      }
      const item = state.inventory[slot];
      if (!item) {
        this.itemNotice(player, `\uBE48 ${slot + 1}\uBC88 \uCE78 \xB7 \uC544\uC774\uD15C \uBE14\uB85D\uC774 \uB4E0 \uC904\uC744 \uC9C0\uC6CC \uCC44\uC6B0\uC138\uC694`);
        return false;
      }
      state.inventory.splice(slot, 1);
      state.cooldown = 2e3;
      const opponent = 1 - player;
      this.itemNotice(player, `${ITEMS[item].icon} ${ITEMS[item].name} \uC0AC\uC6A9!`);
      if (item === "rocket" && this.cooperative) {
        const partner = this.players[opponent];
        partner.pending = Math.max(0, partner.pending - 4);
        this.giveItem(opponent);
        this.itemNotice(opponent, "\u{1F680} \uD611\uB3D9 \uB85C\uCF13! \uC544\uC774\uD15C \uC120\uBB3C\uACFC \uB300\uAE30 \uACF5\uACA9 \uC815\uB9AC");
      } else if (item === "rocket") {
        if (!this.blockItemAttack(opponent)) {
          const lines = this.itemFever ? 4 : 3;
          this.players[opponent].pending += lines;
          game.sent += lines;
          this.lastAttacker[opponent] = player;
          this.itemNotice(opponent, `\u{1F680} \uB85C\uCF13! ${lines}\uC904 \uACF5\uACA9\uC774 \uC640\uC694`);
        } else this.itemNotice(player, "\u{1F6E1}\uFE0F \uC0C1\uB300\uAC00 \uB85C\uCF13\uC744 \uB9C9\uC558\uC5B4\uC694!");
      } else if (item === "shield") state.shield = 6e3;
      else if (item === "broom") {
        game.board.grid.splice(18, 2);
        game.board.grid.unshift(Array(10).fill(0), Array(10).fill(0));
        game.pending = Math.max(0, game.pending - 4);
        while (!game.canPlacePiece(game.currentPiece) && game.currentPiece.y > -4) game.currentPiece.y--;
      } else if (item === "slow") game.slowTime = 8e3;
      else if (item === "gift") for (let seat = 0; seat < 2; seat++) {
        this.players[seat].pending = Math.max(0, this.players[seat].pending - 2);
        const received = this.giveItem(seat);
        this.itemNotice(seat, received ? "\u{1F381} \uD568\uAED8 \uBC1B\uB294 \uC120\uBB3C!" : "\u{1F381} \uAC00\uBC29\uC740 \uAC00\uB4DD! \uB300\uAE30 \uACF5\uACA9 2\uC904 \uC815\uB9AC");
      }
      return true;
    }
    get speedStage() {
      return this.mode === "speed" ? Math.min(8, 1 + Math.floor(this.elapsed / 15e3)) : 1;
    }
    cycleTarget(seat = 0) {
      const targets = this.players.map((_, i) => i).filter((i) => i !== seat && !this.eliminated[i]);
      if (targets.length) this.attackTargets[seat] = targets[(targets.indexOf(this.attackTargets[seat]) + 1) % targets.length];
      this.target = this.attackTargets[0];
    }
    complete(winner, outcome) {
      this.winner = winner;
      this.outcome = outcome;
      this.finished = true;
    }
    checkGoals() {
      if (this.finished) return;
      if (this.cooperative) {
        if (this.teamLines >= this.goalLines) this.complete(0, `\uD568\uAED8 ${this.goalLines}\uC904 \uB2EC\uC131! \uD611\uB3D9 \uC131\uACF5`);
        return;
      }
      if (this.mode === "rally8p") {
        const winner = this.players.findIndex((p, i) => !this.eliminated[i] && p.rallyGoal);
        if (winner >= 0) this.complete(winner, "GOAL\uC5D0 \uBA3C\uC800 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4");
      } else if (this.mode === "sprint" || this.mode === "sprint5p" || this.mode === "marathon") {
        const winner = this.players.findIndex((p, i) => !this.eliminated[i] && p.linesCleared >= this.info.target);
        if (winner >= 0) this.complete(winner, this.mode === "marathon" ? "15\uB808\uBCA8 \uC644\uC8FC!" : "40\uC904 \uC644\uC8FC!");
      }
    }
    update(ms) {
      if (this.paused || this.finished) return;
      const dt = this.timed ? Math.min(ms, this.remaining) : ms;
      this.koEffectTime = this.koEffectTime.map((time) => Math.max(0, time - dt));
      this.elapsed += dt;
      if (this.timed) this.remaining = Math.max(0, this.remaining - dt);
      if (this.mode === "item" && this.itemStyle === "collect") {
        this.items.forEach((item, i) => {
          for (const key of ["cooldown", "shield", "guard", "noticeTime"]) item[key] = Math.max(0, item[key] - dt);
          this.players[i].slowTime = Math.max(0, this.players[i].slowTime - dt);
        });
        this.itemClock += dt;
        const interval = this.itemFever ? 8e3 : 12e3;
        while (this.itemClock >= interval) {
          this.itemClock -= interval;
          this.players.forEach((game) => game.plantItemBlock());
        }
        if (this.cpu) this.players.forEach((game, i) => {
          if (this.humanSeats.has(i)) return;
          this.cpuItemClock[i] += dt;
          if (this.cpuItemClock[i] < 4e3) return;
          this.cpuItemClock[i] = 0;
          const inventory = this.items[i].inventory;
          const preferences = game.pending >= 2 ? ["broom", "shield", "slow", "rocket", "gift"] : game.board.grid.flat().filter(Boolean).length > 30 ? ["broom", "slow", "rocket", "gift"] : ["rocket", "gift"];
          const item = preferences.find((item2) => inventory.includes(item2));
          if (item) this.useItem(i, inventory.indexOf(item));
        });
      }
      this.players.forEach((g) => {
        g.speedInterval = Math.max(80, 800 * Math.pow(0.72, this.speedStage - 1));
      });
      this.players.forEach((g, i) => {
        if (!this.eliminated[i] && !this.finished) g.update(dt);
      });
      if (this.cpu) this.players.forEach((g, i) => {
        if (this.humanSeats.has(i) || this.eliminated[i] || this.finished) return;
        this.cpuClocks[i] += dt;
        const interval = this.mode === "speed" ? Math.max(160, (720 + i * 110) * Math.pow(0.8, this.speedStage - 1)) : 720 + i * 110;
        if (this.cpuClocks[i] >= interval) {
          this.cpuClocks[i] %= interval;
          playCPU(g, isRace(this.mode));
        }
      });
      this.checkGoals();
      if (this.finished) return;
      this.players.forEach((g, i) => {
        if (!g.isGameOver || this.eliminated[i]) return;
        if (this.solo) {
          this.complete(-1, "GAME OVER");
          return;
        }
        if (this.mode === "arena" || isRace(this.mode)) this.eliminated[i] = true;
        else {
          const fallback = this.players.map((p, j) => ({ j, sent: p.sent })).filter((p) => p.j !== i && !this.eliminated[p.j]).sort((a, b) => b.sent - a.sent)[0]?.j;
          const attacker = this.lastAttacker[i] >= 0 ? this.lastAttacker[i] : fallback;
          if (!this.cooperative && attacker !== void 0) {
            this.kos[attacker]++;
            this.koEffectTime[attacker] = 2e3;
          }
          const fresh = new ModeGame(this.mode);
          fresh.collectibleItems = this.itemStyle === "collect";
          fresh.bombGarbage = this.original;
          fresh.twinBomb = this.boosts[i].selected.includes("twinBomb");
          fresh.resumeSequence(g);
          fresh.speedInterval = g.speedInterval;
          fresh.sent = g.sent;
          fresh.score = g.score;
          fresh.linesCleared = g.linesCleared;
          fresh.level = g.level;
          this.lastAttacker[i] = -1;
          this.players[i] = fresh;
          if (this.mode === "item" && this.itemStyle === "collect") {
            this.items[i].guard = 4e3;
            this.items[i].shield = 0;
            this.itemNotice(i, "\u2728 4\uCD08 \uBCF4\uD638! \uB2E4\uC2DC \uB3C4\uC804\uD574\uC694");
          }
        }
      });
      if (!this.cooperative && this.info.players === 2 && Math.max(...this.kos) >= this.koTarget) {
        const [first, second] = this.kos;
        if (first === second) this.complete(-1, `\uB3D9\uC2DC\uC5D0 ${this.koTarget} KO \xB7 \uBB34\uC2B9\uBD80`);
        else this.complete(first > second ? 0 : 1, `${this.koTarget} KO\uB97C \uBA3C\uC800 \uB2EC\uC131\uD588\uC5B4\uC694!`);
      }
      this.wire();
      const alive = this.eliminated.map((dead, i) => dead ? -1 : i).filter((i) => i >= 0);
      if (!this.solo && (this.mode === "arena" || isRace(this.mode)) && alive.length <= 1) this.complete(alive[0] ?? -1, "\uB9C8\uC9C0\uB9C9 \uC0DD\uC874\uC790!");
      if (!this.finished && this.timed && this.remaining === 0) {
        if (this.cooperative) this.complete(-1, `\uC2DC\uAC04 \uC885\uB8CC \xB7 \uD569\uC0B0 ${this.teamLines}/${this.goalLines}\uC904 \xB7 \uB2E4\uC2DC \uD568\uAED8 \uB3C4\uC804\uD574\uC694!`);
        else if (this.solo) this.complete(0, "2\uBD84 \uB3C4\uC804 \uC644\uB8CC!");
        else {
          const sorted = this.players.map((g, i) => ({ i, kos: this.kos[i], sent: g.sent, score: g.score, height: 20 - g.board.grid.findIndex((row) => row.some(Boolean)) })).map((p) => ({ ...p, height: p.height === 21 ? 0 : p.height })).sort((a, b) => b.kos - a.kos || b.sent - a.sent || (this.original ? a.height - b.height : b.score - a.score));
          const first = sorted[0], second = sorted[1];
          if (first.kos === second.kos && first.sent === second.sent && (this.original ? first.height === second.height : first.score === second.score)) this.complete(-1, this.original ? "\uC2DC\uAC04 \uC885\uB8CC \xB7 KO\xB7\uBCF4\uB0B8 \uC904\xB7\uBE14\uB85D \uB192\uC774\uAC00 \uBAA8\uB450 \uAC19\uC544\uC694" : "\uC2DC\uAC04 \uC885\uB8CC \xB7 KO\xB7\uBCF4\uB0B8 \uC904\xB7\uC810\uC218\uAC00 \uBAA8\uB450 \uAC19\uC544\uC694");
          else this.complete(first.i, this.original && first.kos === second.kos && first.sent === second.sent ? "\uC2DC\uAC04 \uC885\uB8CC \xB7 \uB0A8\uC740 \uBE14\uB85D\uC774 \uB354 \uB0AE\uC544\uC694" : `\uC2DC\uAC04 \uC885\uB8CC \xB7 ${first.kos !== second.kos ? "KO" : first.sent !== second.sent ? "\uBCF4\uB0B8 \uC904" : "\uC810\uC218"}\uAC00 \uB354 \uB192\uC544\uC694`);
        }
      }
    }
    stackHeight(i) {
      const top = this.players[i].board.grid.findIndex((row) => row.some(Boolean));
      return top < 0 ? 0 : 20 - top;
    }
    get ranking() {
      return this.players.map((_, i) => i).sort((a, b) => {
        if (isRace(this.mode)) return this.progress(b) - this.progress(a);
        return Number(this.eliminated[a]) - Number(this.eliminated[b]) || this.kos[b] - this.kos[a] || this.players[b].sent - this.players[a].sent || (this.original ? this.stackHeight(a) - this.stackHeight(b) : this.players[b].score - this.players[a].score);
      });
    }
    get teamLines() {
      return this.players.reduce((sum, game) => sum + game.linesCleared, 0);
    }
    get leader() {
      if (this.cooperative) return null;
      if (this.finished) return this.winner === -1 ? null : this.winner;
      const sorted = this.ranking;
      if (sorted.length < 2) return sorted[0] ?? null;
      const a = sorted[0], b = sorted[1];
      return this.kos[a] === this.kos[b] && this.players[a].sent === this.players[b].sent && (this.original ? this.stackHeight(a) === this.stackHeight(b) : this.players[a].score === this.players[b].score) ? null : a;
    }
    progress(i) {
      return this.mode === "rally8p" ? 80 - this.players[i].rallyRemaining : this.players[i].linesCleared;
    }
  };

  // apple/engine.ts
  var session;
  function start(mode = "battle2p", cpu = true, map = 0) {
    session = new ModeSession(mode, cpu, map, { itemStyle: "collect", durationMs: 12e4, koTarget: 3 });
    return snapshot();
  }
  function tick(ms) {
    session.update(ms);
    return snapshot();
  }
  function action(seat, action2) {
    if (session.paused || session.finished) return false;
    const g = session.players[seat];
    if (!g || !session.humanSeats.has(seat)) return false;
    switch (action2) {
      case "left":
        return g.moveLeft();
      case "right":
        return g.moveRight();
      case "down":
        return g.moveDown(true);
      case "rotate":
        return g.rotate();
      case "drop":
        return g.hardDrop();
      case "hold":
        g.hold();
        return true;
      case "item1":
      case "item2":
      case "item3":
        return session.useItem(seat, Number(action2.slice(-1)) - 1);
    }
    return false;
  }
  function pause(value) {
    session.paused = value;
    return snapshot();
  }
  var piece = (type) => type ? new Tetromino(type, 0, 0).getBlocks() : [];
  function snapshot() {
    return JSON.stringify({ remaining: session.remaining, finished: session.finished, outcome: session.outcome, winner: session.winner, leader: session.leader, paused: session.paused, players: session.players.map((g, i) => ({ score: g.score, activeType: g.currentPiece.type, heldType: g.heldPiece?.type ?? null, gameOver: g.isGameOver, grid: g.board.grid, active: g.currentPiece.getBlocks(), color: g.currentPiece.color, ghost: g.getGhostPiece().getBlocks(), hold: piece(g.heldPiece?.type), next: g.previewsShown.map((type) => ({ blocks: piece(type), color: new Tetromino(type).color })), lines: g.linesCleared, sent: g.sent, ko: session.kos[i], receivedKO: session.kos[1 - i], combo: Math.max(0, g.combo), pending: g.pending, items: session.items[i]?.inventory.map((id) => ITEMS[id].icon) ?? [] })) });
  }
  return __toCommonJS(engine_exports);
})();
