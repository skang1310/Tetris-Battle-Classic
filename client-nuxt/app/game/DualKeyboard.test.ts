import {describe,it,expect} from 'vitest'
import {nativeKey} from './DualKeyboard'
describe('per-device native keyboard messages',()=>{
 it('retains independent seats for the same physical key code',()=>{expect(nativeKey({type:'key',player:0,key:'ArrowLeft',down:true})).toEqual({player:0,key:'ArrowLeft',down:true});expect(nativeKey({type:'key',player:1,key:'ArrowLeft',down:false})).toEqual({player:1,key:'ArrowLeft',down:false})})
 it('rejects invalid seats, text input and malformed messages',()=>{for(const value of [null,{}, {type:'key',player:2,key:'ArrowLeft',down:true},{type:'key',player:0,key:'password',down:true},{type:'key',player:0,key:'ArrowLeft',down:'true'}])expect(nativeKey(value)).toBeNull()})
})
