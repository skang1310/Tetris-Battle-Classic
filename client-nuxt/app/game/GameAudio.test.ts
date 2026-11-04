import {describe,it,expect,vi,afterEach} from 'vitest'
import {GameAudio,readAudioSettings,CLASSIC_MELODY} from './GameAudio'
const contexts:any[]=[]
class FakeContext{
 state='running';currentTime=1;destination={};oscillators:any[]=[];gains:any[]=[]
 constructor(){contexts.push(this)}
 createGain(){const node={gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};this.gains.push(node);return node}
 createOscillator(){const node={type:'',frequency:{value:0},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};this.oscillators.push(node);return node}
 resume=vi.fn(async()=>{this.state='running'})
 close=vi.fn(async()=>{this.state='closed'})
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();contexts.length=0})
function engine(){vi.stubGlobal('AudioContext',FakeContext);const a=new GameAudio();a.unlock();return a}
describe('game audio',()=>{
 it('normalizes stored settings without NaN or excessive gain',()=>{expect(readAudioSettings({musicVolume:9,effectsVolume:-2,theme:'bad',effects:false})).toEqual({musicVolume:1,effectsVolume:0,theme:'classic',effects:false});expect(readAudioSettings({musicVolume:NaN}).musicVolume).toBe(.3);expect(CLASSIC_MELODY.length).toBeGreaterThan(30)})
 it('throttles held moves while allowing rotation and drop accents',()=>{const a=engine(),c=contexts[0];a.play('move');a.play('move');expect(c.oscillators).toHaveLength(1);a.play('rotate');a.play('drop');expect(c.oscillators).toHaveLength(5);a.dispose()})
 it('separates music gain from muted effects and stops scheduled music immediately',()=>{vi.useFakeTimers();const a=engine(),c=contexts[0];a.configure({effects:false,effectsVolume:1,musicVolume:.5,theme:'classic'});a.play('ko');expect(c.oscillators).toHaveLength(0);expect(c.gains[1].gain.value).toBe(0);a.music(true);expect(c.oscillators.length).toBeGreaterThan(0);const count=c.oscillators.length;a.music(false);expect(c.oscillators.every((o:any)=>o.stop.mock.calls.length>=2)).toBe(true);vi.advanceTimersByTime(1000);expect(c.oscillators).toHaveLength(count);a.dispose();expect(c.close).toHaveBeenCalledOnce()})
 it('keeps controls usable when the browser refuses AudioContext construction',()=>{vi.stubGlobal('AudioContext',class{constructor(){throw new Error('Audio unavailable')}});const a=new GameAudio();expect(a.unlock()).toBe(false);a.dispose()})
 it('does not construct audio before a user gesture and tolerates unavailable APIs',()=>{const a=new GameAudio();a.play('win');expect(contexts).toHaveLength(0);vi.stubGlobal('AudioContext',undefined);expect(a.unlock()).toBe(false);a.dispose()})
})
