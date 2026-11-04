import {describe,it,expect} from 'vitest'
import {CLASSIC_MAPS,MAP_OPTIONS,validMap} from './ClassicMaps'
import {ModeSession} from './GameModes'
describe('couple battle maps',()=>{
 it('keeps all layouts valid, distinct and safe for spawning',()=>{expect(MAP_OPTIONS.length).toBe(9);expect(CLASSIC_MAPS.length).toBe(8);expect(new Set(CLASSIC_MAPS.map(m=>JSON.stringify(m))).size).toBe(8);for(const grid of CLASSIC_MAPS){expect(grid.length).toBe(20);expect(grid.every(row=>row.length===10&&row.every(c=>Number.isInteger(c)&&c>=0&&c<=7))).toBe(true);expect(grid.slice(0,4).flat().every(c=>c===0)).toBe(true)}})
 it('starts both seats fairly without sharing mutable board rows',()=>{for(const mode of ['battle2p','speed'] as const)for(let map=1;map<MAP_OPTIONS.length;map++){const game=new ModeSession(mode,false,map);expect(game.players[0]!.board.grid).toEqual(CLASSIC_MAPS[map-1]);expect(game.players[1]!.board.grid).toEqual(CLASSIC_MAPS[map-1]);game.players[0]!.board.grid[19]![0]=(game.players[0]!.board.grid[19]![0]!%7)+1;expect(game.players[1]!.board.grid).toEqual(CLASSIC_MAPS[map-1])}})
 it('rejects unknown map identifiers',()=>{for(const map of [-1,9,2.5,'4',undefined,null])expect(validMap(map)).toBe(false);expect(validMap(8)).toBe(true)})
})
