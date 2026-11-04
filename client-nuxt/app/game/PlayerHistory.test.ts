import { describe, it, expect } from 'vitest'
import { emptyHistory, readHistory, rememberMode, recordMatch } from './PlayerHistory'
describe('device player history',()=>{
 it('recovers from corrupt or unavailable history and rejects invalid modes/settings',()=>{
  expect(readHistory('{')).toEqual(emptyHistory())
  expect(readHistory(JSON.stringify({recent:[{mode:'fake'}],records:{sprint:{games:1,wins:2,bestScore:10,bestLines:40,fastestMs:-1}}}))).toEqual(emptyHistory())
 })
 it('keeps four distinct recent modes with latest settings and restores them',()=>{
  let h=emptyHistory()
  for(const mode of ['sprint','ultra','retro','arena','battle2p','sprint'] as const)h=rememberMode(h,{mode,cpu:true,map:2,network:false,spectator:false,playedAt:123})
  expect(h.recent.map(r=>r.mode)).toEqual(['sprint','battle2p','arena','retro'])
  expect(readHistory(JSON.stringify(h))).toEqual(h)
 })
 it('keeps the fastest successful clear and never counts a failed run as a time record',()=>{
  const match={mode:'sprint' as const,score:400,lines:40,elapsed:65000,won:true}
  let h=recordMatch(emptyHistory(),match).history
  expect(recordMatch(h,{...match,elapsed:70000}).personalBest).toBe(false)
  h=recordMatch(h,{...match,elapsed:60000}).history
  h=recordMatch(h,{...match,elapsed:1000,won:false,lines:2}).history
  expect(h.records.sprint).toMatchObject({games:3,wins:2,fastestMs:60000,bestLines:40})
  expect(readHistory(JSON.stringify(h))).toEqual(h)
 })
 it('stores completed battle scores and wins without inventing a fastest clear',()=>{
  const h=recordMatch(emptyHistory(),{mode:'battle2p',score:0,lines:0,elapsed:120000,won:false}).history
  const result=recordMatch(h,{mode:'battle2p',score:1000,lines:12,elapsed:100000,won:true})
  expect(result.personalBest).toBe(true)
  expect(result.history.records.battle2p).toEqual({games:2,wins:1,bestScore:1000,bestLines:12,fastestMs:null})
 })
})
