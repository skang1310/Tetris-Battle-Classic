import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import {mkdirSync} from 'node:fs'
mkdirSync('output/item-blocks',{recursive:true})
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1120,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message))
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
try{
 await p.goto('http://127.0.0.1:8080/?mode=item');const d=p.getByRole('dialog',{name:'어떻게 플레이할까요?'});await d.waitFor();await d.getByLabel('아이템전 방식',{exact:true}).selectOption('collect');await d.locator('[name="play-style"][value="cpu"]').check();await d.locator('summary').click();await p.getByRole('button',{name:'하트 가든 맵 선택',exact:true}).click();await d.getByRole('button',{name:'준비 완료 · 시작',exact:true}).click();let s=await state();assert.equal(s.mode,'item');assert.equal(s.players[0].board.flat().filter(c=>c>=11).length,2);assert.deepEqual(s.players[0].board,s.players[1].board);await p.evaluate(()=>window.advanceTime(3100));await p.screenshot({path:'output/item-blocks/items.png'});await p.locator('canvas').focus();for(let i=0;i<100;i++){await p.keyboard.press('Space');await p.evaluate(()=>window.advanceTime(17));s=await state();if(s.kos.some(Boolean))break}assert.ok(s.kos.some(Boolean));assert.ok(s.koEffectTime.some(t=>t>0));await p.screenshot({path:'output/item-blocks/ko.png'});assert.deepEqual(errors,[]);console.log('PASS item icons encoded in matching initial boards, real KO effect exercised, no page errors; screenshots captured for non-obscuring feedback.')
}finally{await b.close()}
