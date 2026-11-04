/**
 * 🔴 RED Phase: Tetromino Test
 * Failing tests for Tetromino class - represents a Tetris piece
 */
import { describe, it, expect } from 'vitest'
import { Tetromino, type TetrominoType } from './Tetromino'

describe('Tetromino', () => {
    describe('constructor', () => {
        it('should create a tetromino with specified type', () => {
            const piece = new Tetromino('T')

            expect(piece.type).toBe('T')
        })

        it('should start at default spawn position (center top)', () => {
            const piece = new Tetromino('T')

            expect(piece.x).toBe(3) // center of 10-wide board: (10-4)/2 = 3
            expect(piece.y).toBe(0)
        })

        it('should accept custom starting position', () => {
            const piece = new Tetromino('T', 5, 10)

            expect(piece.x).toBe(5)
            expect(piece.y).toBe(10)
        })

        it('should initialize with rotation index 0', () => {
            const piece = new Tetromino('T')

            expect(piece.rotationIndex).toBe(0)
        })
    })

    describe('TetrominoType', () => {
        it('should support all 7 standard tetromino types', () => {
            const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

            types.forEach(type => {
                const piece = new Tetromino(type)
                expect(piece.type).toBe(type)
            })
        })
    })

    describe('getBlocks', () => {
        it('should return array of block coordinates for T piece', () => {
            const piece = new Tetromino('T')
            const blocks = piece.getBlocks()

            // T shape at rotation 0:
            //   [X]
            // [X][X][X]
            expect(blocks).toHaveLength(4)
            expect(blocks).toContainEqual({ x: 4, y: 0 }) // top center
            expect(blocks).toContainEqual({ x: 3, y: 1 }) // bottom left
            expect(blocks).toContainEqual({ x: 4, y: 1 }) // bottom center
            expect(blocks).toContainEqual({ x: 5, y: 1 }) // bottom right
        })

        it('should return array of block coordinates for I piece', () => {
            const piece = new Tetromino('I')
            const blocks = piece.getBlocks()

            // I shape at rotation 0:
            // [X][X][X][X]
            expect(blocks).toHaveLength(4)
        })

        it('should return array of block coordinates for O piece', () => {
            const piece = new Tetromino('O')
            const blocks = piece.getBlocks()

            // O shape (2x2 square):
            // [X][X]
            // [X][X]
            expect(blocks).toHaveLength(4)
        })
    })

    describe('rotate', () => {
        it('should rotate piece clockwise', () => {
            const piece = new Tetromino('T')

            piece.rotate()

            expect(piece.rotationIndex).toBe(1)
        })

        it('should wrap around after 4 rotations', () => {
            const piece = new Tetromino('T')

            piece.rotate()
            piece.rotate()
            piece.rotate()
            piece.rotate()

            expect(piece.rotationIndex).toBe(0)
        })

        it('should change block positions after rotation', () => {
            const piece = new Tetromino('T')
            const blocksBefore = piece.getBlocks()

            piece.rotate()
            const blocksAfter = piece.getBlocks()

            // Blocks should be different after rotation
            expect(blocksAfter).not.toEqual(blocksBefore)
        })
    })

    describe('rotateCounterClockwise', () => {
        it('should rotate piece counter-clockwise', () => {
            const piece = new Tetromino('T')

            piece.rotateCounterClockwise()

            expect(piece.rotationIndex).toBe(3)
        })
    })

    describe('move', () => {
        it('should move piece by delta', () => {
            const piece = new Tetromino('T', 5, 5)

            piece.move(-1, 0) // move left

            expect(piece.x).toBe(4)
            expect(piece.y).toBe(5)
        })

        it('should move piece down', () => {
            const piece = new Tetromino('T', 5, 5)

            piece.move(0, 1) // move down

            expect(piece.x).toBe(5)
            expect(piece.y).toBe(6)
        })
    })

    describe('clone', () => {
        it('should create a copy of the tetromino', () => {
            const original = new Tetromino('T', 5, 10)
            original.rotate()

            const clone = original.clone()

            expect(clone.type).toBe(original.type)
            expect(clone.x).toBe(original.x)
            expect(clone.y).toBe(original.y)
            expect(clone.rotationIndex).toBe(original.rotationIndex)
        })

        it('should be independent from original', () => {
            const original = new Tetromino('T')
            const clone = original.clone()

            clone.move(5, 5)

            expect(original.x).not.toBe(clone.x)
        })
    })
})
