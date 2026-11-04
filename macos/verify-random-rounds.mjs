import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import {mkdirSync} from 'node:fs'
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));mkdirSync('output/random-rounds',{recursive:true})
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
try{
 await p.goto('http://127.0.0.1:8080/?mode=battle2p');const d=p.getByRole('dialog',{name:'어떻게 플레이할까요?'});await d.waitFor();await d.getByLabel('승부 방식',{exact:true}).selectOption('3');await d.getByLabel('한 판 제한시간',{exact:true}).selectOption('60000');await d.locator('[name="play-style"][value="shared"]').check();await d.locator('summary').click();await p.getByRole('button',{name:'하트 가든 맵 선택',exact:true}).click();await d.getByRole('button',{name:'준비 완료 · 시작',exact:true}).click();let last='하트 가든';
 for(let round=0;round<3;round++){
  let s=await state();assert.notEqual(s.map,last);last=s.map;assert.deepEqual(s.players[0].board,s.players[1].board);assert.ok(s.countdownRemaining>0);await p.evaluate(()=>window.advanceTime(3100));if(round===2)break;await p.evaluate(()=>window.advanceTime(61000));assert.equal((await state()).winner,-1);for(const player of [1,2])await p.getByRole('button',{name:`PLAYER ${player} 다음 판`,exact:true}).click()
 }
 await p.screenshot({path:'output/random-rounds/game.png'});assert.deepEqual(errors,[]);console.log('PASS: 3 successive local 2P rounds draw new maps, avoid immediate repeat, identical boards, countdown and best-of-three draw continuation.')
}finally{await b.close()}
