import { describe,it,expect,vi,afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GameController from './GameController.vue'
const props={size:'normal' as const,leftHanded:false,disabled:false}
Object.defineProperty(HTMLElement.prototype,'setPointerCapture',{configurable:true,value:vi.fn()})
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML=''})
describe('fast two-thumb controller',()=>{
 it('supports independent fingers for movement and rotation',async()=>{
  const w=mount(GameController,{props,attachTo:document.body}),left=w.get('[aria-label="왼쪽"]'),rotate=w.get('[aria-label="회전"]')
  await left.trigger('pointerdown',{pointerId:1});await rotate.trigger('pointerdown',{pointerId:2})
  expect(w.emitted('press')).toEqual([['ArrowLeft'],['ArrowUp']])
  await left.trigger('pointerup',{pointerId:1});expect(w.emitted('release')).toEqual([['ArrowLeft']])
  await rotate.trigger('pointercancel',{pointerId:2});expect(w.emitted('release')).toEqual([['ArrowLeft'],['ArrowUp']]);w.unmount()
 })
 it('slides directions without sticking and stops outside the pad',async()=>{
  const w=mount(GameController,{props,attachTo:document.body}),left=w.get('[aria-label="왼쪽"]'),right=w.get('[aria-label="오른쪽"]')
  Object.defineProperty(document,'elementFromPoint',{configurable:true,value:vi.fn(()=>right.element)})
  await left.trigger('pointerdown',{pointerId:1});await left.trigger('pointermove',{pointerId:1})
  expect(w.emitted('press')).toEqual([['ArrowLeft'],['ArrowRight']]);expect(w.emitted('release')).toEqual([['ArrowLeft']])
  Object.defineProperty(document,'elementFromPoint',{configurable:true,value:vi.fn(()=>null)})
  await left.trigger('pointermove',{pointerId:1});expect(w.emitted('release')).toEqual([['ArrowLeft'],['ArrowRight']]);w.unmount()
 })
 it('releases pressed controls when paused and permits keyboard activation',async()=>{
  const w=mount(GameController,{props,attachTo:document.body}),left=w.get('[aria-label="왼쪽"]')
  await left.trigger('pointerdown',{pointerId:3});await w.setProps({disabled:true});expect(w.emitted('release')).toEqual([['ArrowLeft']])
  await w.setProps({disabled:false});await w.get('[aria-label="빠른 낙하"]').trigger('keydown',{key:'Enter'});await w.get('[aria-label="빠른 낙하"]').trigger('keyup',{key:'Enter'})
  expect(w.emitted('press')?.at(-1)).toEqual([' ']);expect(w.emitted('release')?.at(-1)).toEqual([' ']);w.unmount()
 })
})
