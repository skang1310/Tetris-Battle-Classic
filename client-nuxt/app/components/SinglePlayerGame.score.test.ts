import { describe, it, expect } from 'vitest'
import { shallowReactive } from 'vue'
import { mount } from '@vue/test-utils'
import SinglePlayerGame from './SinglePlayerGame.vue'
import { Game } from '~/game/Game'

const MiniPiece = { template: '<div></div>' }
const Leaderboard = { template: '<div></div>' }

describe('SinglePlayerGame Score Formatting', () => {
    it('formats score with commas', async () => {
        const game = shallowReactive(new Game())
        game.score = 12345

        const wrapper = mount(SinglePlayerGame, {
            props: { game },
            global: {
                stubs: { MiniPiece, Leaderboard }
            }
        })

        const scoreEl = wrapper.find('.stats .score')
        expect(scoreEl.exists()).toBe(true)
        // Expect "12,345"
        expect(scoreEl.text()).toBe('12,345')

        // Update score
        game.score = 1000000
        await wrapper.vm.$nextTick()
        expect(scoreEl.text()).toBe('1,000,000')
    })
})
