/**
 * 🔴 RED Phase: EffectSystem Tests
 * Tests for visual effects system (particles, waves, etc.)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
    EffectSystem,
    EffectType,
    EFFECT_LABELS,
    type Particle,
    type LineClearEffect,
    type WaveEffect
} from './EffectSystem'

describe('EffectSystem', () => {
    let effectSystem: EffectSystem

    beforeEach(() => {
        effectSystem = new EffectSystem()
    })

    describe('initialization', () => {
        it('should initialize with EXPLOSION as default effect type', () => {
            expect(effectSystem.effectType).toBe(EffectType.EXPLOSION)
        })

        it('should initialize with empty particles and effects', () => {
            expect(effectSystem.particles).toEqual([])
            expect(effectSystem.effects).toEqual([])
        })
    })

    describe('setEffectType', () => {
        it('should change effect type', () => {
            effectSystem.setEffectType(EffectType.SPARKLE)
            expect(effectSystem.effectType).toBe(EffectType.SPARKLE)
        })

        it('should accept all effect types', () => {
            const types = [
                EffectType.EXPLOSION,
                EffectType.SPARKLE,
                EffectType.WAVE,
                EffectType.SHATTER,
                EffectType.CLASSIC
            ]
            types.forEach(type => {
                effectSystem.setEffectType(type)
                expect(effectSystem.effectType).toBe(type)
            })
        })
    })

    describe('EFFECT_LABELS', () => {
        it('should have labels for all effect types', () => {
            expect(EFFECT_LABELS[EffectType.EXPLOSION]).toBe('🎆 Explosion')
            expect(EFFECT_LABELS[EffectType.SPARKLE]).toBe('✨ Sparkle')
            expect(EFFECT_LABELS[EffectType.WAVE]).toBe('🌊 Wave')
            expect(EFFECT_LABELS[EffectType.SHATTER]).toBe('💥 Shatter')
            expect(EFFECT_LABELS[EffectType.CLASSIC]).toBe('⚡ Classic')
        })
    })

    describe('createEffects', () => {
        it('should create LINE_CLEAR effect for all types', () => {
            effectSystem.setEffectType(EffectType.CLASSIC)
            effectSystem.createEffects([19], 1)

            const lineClearEffects = effectSystem.effects.filter(
                e => e.type === 'LINE_CLEAR'
            ) as LineClearEffect[]

            expect(lineClearEffects).toHaveLength(1)
            expect(lineClearEffects[0]!.y).toBe(19)
            expect(lineClearEffects[0]!.timeLeft).toBeGreaterThan(0)
        })

        it('should create explosion particles with positive gravity', () => {
            effectSystem.setEffectType(EffectType.EXPLOSION)
            effectSystem.createEffects([19], 1)

            expect(effectSystem.particles.length).toBeGreaterThan(0)
            effectSystem.particles.forEach(p => {
                expect(p.gravity).toBeGreaterThan(0) // Positive = fall down
            })
        })

        it('should create sparkle particles with negative gravity', () => {
            effectSystem.setEffectType(EffectType.SPARKLE)
            effectSystem.createEffects([19], 1)

            expect(effectSystem.particles.length).toBeGreaterThan(0)
            effectSystem.particles.forEach(p => {
                expect(p.gravity).toBeLessThan(0) // Negative = float up
                expect(p.vy).toBeLessThan(0) // Initial velocity upward
            })
        })

        it('should create wave effect (no particles)', () => {
            effectSystem.setEffectType(EffectType.WAVE)
            effectSystem.createEffects([19], 1)

            // Wave uses effects, not particles
            const waveEffects = effectSystem.effects.filter(
                e => e.type === 'WAVE'
            ) as WaveEffect[]

            expect(waveEffects).toHaveLength(1)
            expect(waveEffects[0]!.radius).toBe(0)
            expect(waveEffects[0]!.life).toBe(1.0)
        })

        it('should create shatter particles with rotation', () => {
            effectSystem.setEffectType(EffectType.SHATTER)
            effectSystem.createEffects([19], 1)

            expect(effectSystem.particles.length).toBeGreaterThan(0)
            effectSystem.particles.forEach(p => {
                expect(p.isSquare).toBe(true)
                expect(p.rotation).toBeDefined()
                expect(p.rotationSpeed).toBeDefined()
            })
        })

        it('should not create particles for classic effect', () => {
            effectSystem.setEffectType(EffectType.CLASSIC)
            effectSystem.createEffects([19], 1)

            expect(effectSystem.particles).toHaveLength(0)
        })

        it('should create more particles for more lines cleared', () => {
            effectSystem.setEffectType(EffectType.EXPLOSION)

            effectSystem.createEffects([19], 1)
            const particlesFor1Line = effectSystem.particles.length

            effectSystem.particles = []
            effectSystem.createEffects([19], 4)
            const particlesFor4Lines = effectSystem.particles.length

            expect(particlesFor4Lines).toBeGreaterThan(particlesFor1Line)
        })
    })

    describe('update', () => {
        it('should move particles by velocity', () => {
            effectSystem.particles = [
                { x: 100, y: 100, vx: 5, vy: 0, size: 5, color: '#fff', life: 1.0, gravity: 0 }
            ]

            effectSystem.update(16) // ~1 frame at 60fps

            expect(effectSystem.particles[0]!.x).toBeGreaterThan(100)
        })

        it('should apply gravity to particles', () => {
            effectSystem.particles = [
                { x: 100, y: 100, vx: 0, vy: 0, size: 5, color: '#fff', life: 1.0, gravity: 0.2 }
            ]

            effectSystem.update(16)

            expect(effectSystem.particles[0]!.vy).toBeGreaterThan(0)
        })

        it('should decrease particle life over time', () => {
            effectSystem.particles = [
                { x: 100, y: 100, vx: 0, vy: 0, size: 5, color: '#fff', life: 1.0, gravity: 0 }
            ]

            effectSystem.update(100)

            expect(effectSystem.particles[0]!.life).toBeLessThan(1.0)
        })

        it('should remove dead particles (life <= 0)', () => {
            effectSystem.particles = [
                { x: 100, y: 100, vx: 0, vy: 0, size: 5, color: '#fff', life: 0.01, gravity: 0 }
            ]

            effectSystem.update(1000) // Long enough to kill particle

            expect(effectSystem.particles).toHaveLength(0)
        })

        it('should decrease LINE_CLEAR effect timeLeft', () => {
            effectSystem.effects = [
                { type: 'LINE_CLEAR', y: 19, timeLeft: 300, color: '#fff' }
            ]

            effectSystem.update(100)

            expect((effectSystem.effects[0]! as LineClearEffect).timeLeft).toBe(200)
        })

        it('should expand wave radius over time', () => {
            effectSystem.effects = [
                { type: 'WAVE', centerX: 100, centerY: 100, radius: 0, maxRadius: 200, color: '#fff', life: 1.0 }
            ]

            effectSystem.update(100)

            expect((effectSystem.effects[0]! as WaveEffect).radius).toBeGreaterThan(0)
        })

        it('should update shatter particle rotation', () => {
            effectSystem.particles = [
                { x: 100, y: 100, vx: 0, vy: 0, size: 10, color: '#fff', life: 1.0, gravity: 0.2, rotation: 0, rotationSpeed: 0.1, isSquare: true }
            ]

            effectSystem.update(16)

            expect(effectSystem.particles[0]!.rotation).toBeGreaterThan(0)
        })
    })
})
