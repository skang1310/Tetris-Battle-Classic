import {describe,it,expect} from 'vitest'
import {consumeCountdown} from './RoundCountdown'
describe('round start countdown',()=>{
 it('shows 3, 2, 1 without consuming game time',()=>{let left=3000;for(const n of [3,2,1]){expect(Math.ceil(left/1000)).toBe(n);const t=consumeCountdown(left,1000);expect(t.activeMs).toBe(0);left=t.remaining}expect(left).toBe(0)})
 it('only passes time after the exact start boundary',()=>{expect(consumeCountdown(100,150)).toEqual({remaining:0,activeMs:50});expect(consumeCountdown(3000,3000)).toEqual({remaining:0,activeMs:0});expect(consumeCountdown(0,50)).toEqual({remaining:0,activeMs:50})})
 it('handles a long suspended frame without extending or skipping game time',()=>{expect(consumeCountdown(3000,4000)).toEqual({remaining:0,activeMs:1000})})
 it('does not advance on invalid or backwards time',()=>{expect(consumeCountdown(1000,-1)).toEqual({remaining:1000,activeMs:0});expect(consumeCountdown(1000,NaN)).toEqual({remaining:1000,activeMs:0})})
})
