/**
 * Line Clearing - Logic for detecting and clearing complete lines
 * 
 * Standard Tetris scoring (Original Nintendo):
 * - Single: 100 × level
 * - Double: 300 × level
 * - Triple: 500 × level
 * - Tetris: 800 × level
 */
import type { Board } from './Board'

const LINE_SCORES = [0, 100, 300, 500, 800]

/**
 * Check for complete lines and clear them
 * @param board The game board to check
 * @returns Number of lines cleared
 */
export function checkAndClearLines(board: Board): number {
    const linesToClear: number[] = []

    // Check each row from bottom to top
    for (let y = board.height - 1; y >= 0; y--) {
        if (isLineComplete(board, y)) {
            linesToClear.push(y)
        }
    }

    if (linesToClear.length === 0) {
        return 0
    }

    // Clear lines and shift rows down
    clearLines(board, linesToClear)

    return linesToClear.length
}

/**
 * Check if a line is complete (all cells filled)
 */
function isLineComplete(board: Board, y: number): boolean {
    if(board.grid[y]!.some(cell=>cell===9||cell===10))return false // Bomb and concrete rows require their own rules.
    for (let x = 0; x < board.width; x++) {
        if (board.isCellEmpty(x, y)) {
            return false
        }
    }
    return true
}

/**
 * Clear the specified lines and shift rows down
 */
function clearLines(board: Board, linesToClear: number[]): void {
    // Sort lines in ascending order (top to bottom)
    const sortedLines = [...linesToClear].sort((a, b) => a - b)

    // For each line to clear, from bottom to top
    for (const lineY of sortedLines) {
        // Shift all rows above down by one
        shiftRowsDown(board, lineY)
    }
}

/**
 * Shift all rows above the cleared line down by one
 */
function shiftRowsDown(board: Board, clearedRow: number): void {
    // Move each row down, starting from the cleared row
    for (let y = clearedRow; y > 0; y--) {
        for (let x = 0; x < board.width; x++) {
            const cellAbove = board.getCell(x, y - 1)
            board.setCell(x, y, cellAbove === -1 ? 0 : cellAbove)
        }
    }

    // Clear the top row
    for (let x = 0; x < board.width; x++) {
        board.setCell(x, 0, 0)
    }
}

/**
 * Calculate score based on number of lines cleared and level
 * @param linesCleared Number of lines cleared (1-4)
 * @param level Current game level
 * @returns Score to add
 */
export function calculateScore(linesCleared: number, level: number): number {
    if (linesCleared <= 0 || linesCleared > 4) {
        return linesCleared > 4 ? LINE_SCORES[4]! * level : 0
    }
    return LINE_SCORES[linesCleared]! * level
}
