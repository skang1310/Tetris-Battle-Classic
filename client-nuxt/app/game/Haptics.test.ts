import {describe,it,expect,vi,afterEach} from 'vitest'
import {playHaptic,hapticSupported} from './Haptics'
afterEach(()=>{vi.unstubAllGlobals();delete (window as any).webkit})
describe('haptic delivery',()=>{
 it('uses the native desktop bridge for game events',()=>{const postMessage=vi.fn();(window as any).webkit={messageHandlers:{desktop:{postMessage}}};expect(hapticSupported()).toBe(true);expect(playHaptic('clear')).toBe(true);expect(postMessage).toHaveBeenCalledWith({action:'haptic',event:'clear'})})
 it('delivers distinct browser patterns and safely handles unavailable hardware',()=>{const vibrate=vi.fn(()=>true);vi.stubGlobal('navigator',{vibrate});expect(playHaptic('rotate')).toBe(true);expect(vibrate).toHaveBeenLastCalledWith(8);playHaptic('tetris');expect(vibrate).toHaveBeenLastCalledWith([25,25,25,25,40]);vi.stubGlobal('navigator',{});expect(hapticSupported()).toBe(false);expect(playHaptic('ko')).toBe(false)})
})
