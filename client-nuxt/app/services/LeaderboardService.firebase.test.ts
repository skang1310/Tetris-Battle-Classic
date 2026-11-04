import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeaderboardService } from './LeaderboardService'

// Mock Firebase Firestore
const mockAddDoc = vi.fn()
const mockCollection = vi.fn()
const mockServerTimestamp = vi.fn(() => 'TIMESTAMP')

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: (...args: any[]) => mockCollection(...args),
    addDoc: (...args: any[]) => mockAddDoc(...args),
    serverTimestamp: () => mockServerTimestamp()
}))

// Mock Firebase App (firebase.ts)
vi.mock('~/firebase', () => ({
    db: { app: {} } // Mock db object
}))

describe('LeaderboardService Firestore Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock localStorage
        const store: Record<string, string> = {}
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key) => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value }),
            removeItem: vi.fn((key) => { delete store[key] })
        })
    })

    it('uploads score to firestore when adding a new score', async () => {
        const entry = {
            playerName: 'TestPlayer',
            score: 1000,
            level: 5,
            lines: 20,
            date: new Date().toISOString(),
            hasIncreaseGravity: false
        }

        // Call addScore
        const result = LeaderboardService.addScore(entry, 'solo')

        // Wait a bit for the fire-and-forget promise
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if collection was called with correct collection name
        expect(mockCollection).toHaveBeenCalled()
        // We can't easily check arguments of mockCollection if it's called with the imported db, 
        // but we can check if addDoc was called.

        expect(mockAddDoc).toHaveBeenCalledTimes(1)
        const addDocArgs = mockAddDoc.mock.calls[0]!
        // addDoc(collectionRef, data)
        expect(addDocArgs[1]).toMatchObject({
            playerName: 'TestPlayer',
            score: 1000,
            hasIncreaseGravity: false
        })
    })

    it('uploads duo match results', async () => {
        const match = {
            date: new Date().toISOString(),
            winner: 'p1' as const,
            p1: { name: 'P1', score: 100 },
            p2: { name: 'P2', score: 50 },
            id: 'mock-id'
        }

        LeaderboardService.addDuoMatch(match)

        await new Promise(resolve => setTimeout(resolve, 100))

        expect(mockAddDoc).toHaveBeenCalledTimes(1)
    })
})
