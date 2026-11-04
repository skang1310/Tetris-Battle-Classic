import { describe, it, expect, vi, afterEach } from 'vitest'
import { copyInviteLink, shareInviteLink } from './InviteLink'
afterEach(()=>{vi.restoreAllMocks();delete (window as any).webkit;Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})})
describe('LAN invite sharing',()=>{
 it('copies exact room links through the macOS bridge',async()=>{
  const postMessage=vi.fn();(window as any).webkit={messageHandlers:{desktop:{postMessage}}}
  expect(await copyInviteLink('http://192.168.1.2:8080/?room=123456')).toBe(true)
  expect(postMessage).toHaveBeenCalledWith({action:'copyLink',url:'http://192.168.1.2:8080/?room=123456'})
 })
 it('falls back on local HTTP and restores focus',async()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}})
  const copy=vi.fn(()=>true);Object.defineProperty(document,'execCommand',{configurable:true,value:copy})
  const button=document.createElement('button');document.body.append(button);button.focus()
  expect(await copyInviteLink('http://lan/?room=111111')).toBe(true)
  expect(copy).toHaveBeenCalledWith('copy');expect(document.activeElement).toBe(button);expect(document.querySelector('textarea')).toBeNull();button.remove()
 })
 it('does not copy or report failure when native sharing is cancelled',async()=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:vi.fn().mockRejectedValue(new DOMException('cancelled','AbortError'))})
  expect(await shareInviteLink('http://lan')).toBe('cancelled')
 })
 it('returns manual selection when clipboard is unavailable',async()=>{
  Object.defineProperty(document,'execCommand',{configurable:true,value:vi.fn(()=>false)})
  expect(await shareInviteLink('http://lan')).toBe('manual')
 })
})
