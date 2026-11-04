// Supplemental develop-web-game checks for records, sharing and multiplayer consent.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}), errors=[]
fs.mkdirSync('output/features',{recursive:true})
const make=async(mobile=false)=>{const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1120,height:800},isMobile:mobile,hasTouch:mobile,permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});return p}
const ready=async p=>p.waitForFunction(()=>typeof window.render_game_to_text==='function')
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
const finish=async p=>{await p.evaluate(()=>window.advanceTime(131000));await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).winner!==null)}
try {
 const local=await make();await local.goto('http://127.0.0.1:8080/');await ready(local)
 await local.getByRole('button',{name:'맵 설정',exact:true}).click();await local.getByRole('button',{name:'Choose Classic map',exact:true}).click()
 await local.getByRole('button',{name:'게임 모드',exact:true}).click();await local.locator('[data-mode="ultra"]').click();await local.locator('canvas').focus();await local.keyboard.press('Space');await finish(local)
 const first=await state(local);assert.equal(first.history.records.ultra.games,1);assert.ok(first.history.records.ultra.bestScore>0);assert.equal(first.personalBest,true)
 await local.evaluate(()=>window.advanceTime(200));assert.equal((await state(local)).history.records.ultra.games,1)
 await local.screenshot({path:'output/features/result-desktop.png',fullPage:true})
 await local.getByRole('button',{name:'다시 플레이',exact:true}).click();const restarted=await state(local);assert.notEqual(restarted.roundId,first.roundId);assert.equal(restarted.winner,null);assert.equal(restarted.map,'Classic');assert.equal(restarted.history.records.ultra.games,1)
 await local.locator('.classic-options').getByRole('button',{name:'MENU',exact:true}).click()
 await local.reload();await ready(local);assert.equal((await state(local)).history.records.ultra.games,1);await local.locator('[data-record="ultra"]').waitFor();await local.screenshot({path:'output/features/history-desktop.png',fullPage:true})
 await local.locator('[data-recent="ultra"]').click();assert.equal((await state(local)).mode,'ultra');assert.equal((await state(local)).map,'Classic')
 await local.locator('.classic-options').getByRole('button',{name:'MENU',exact:true}).click();await local.getByRole('button',{name:'게임 모드',exact:true}).click();await local.locator('[data-mode="battle2p"]').click();await finish(local)
 const localRound=(await state(local)).roundId
 await local.getByRole('button',{name:'PLAYER 1 재대전',exact:true}).click();assert.equal((await state(local)).roundId,localRound)
 await local.getByRole('button',{name:'PLAYER 2 재대전',exact:true}).click();assert.notEqual((await state(local)).roundId,localRound)
 assert.equal((await state(local)).history.records.battle2p.games,1)
 const host=await make(),phones=[await make(true),await make(true)]
 await host.goto('http://127.0.0.1:8080/');await ready(host);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();await host.getByRole('checkbox',{name:'맥은 관전 · 아이폰끼리 플레이'}).check();await host.getByRole('button',{name:'방 만들기',exact:true}).click()
 const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 await host.waitForFunction(code=>document.querySelector('[aria-label="아이폰 접속 주소"]').value.includes(`room=${code}`),code)
 await host.getByRole('button',{name:'초대 링크 복사',exact:true}).click();const copied=await host.evaluate(()=>navigator.clipboard.readText());assert.equal(new URL(copied).searchParams.get('room'),code)
 await host.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.testShared=data.url}})})
 await host.getByRole('button',{name:'초대 링크 공유',exact:true}).click();assert.equal(await host.evaluate(()=>window.testShared),copied)
 await host.screenshot({path:'output/features/invite-desktop.png',fullPage:true})
 for(let i=0;i<2;i++){await phones[i].goto(`http://127.0.0.1:8080/?room=${code}`);await ready(phones[i]);await phones[i].getByRole('textbox',{name:'닉네임',exact:true}).fill(`Phone ${i+1}`);await phones[i].getByRole('button',{name:'방 참가',exact:true}).click();await phones[i].getByRole('heading',{name:`ROOM ${code}`,exact:true}).waitFor()}
 await host.getByRole('button',{name:'대전 시작',exact:true}).click();for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await finish(host);for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).winner!==null && JSON.parse(window.render_game_to_text()).rematchRequired.length===2)
 const old=(await state(host)).roundId
 assert.equal((await state(host)).history.records.battle2p,undefined)
 for(const p of phones)assert.equal((await state(p)).history.records.battle2p.games,1)
 await phones[0].getByRole('button',{name:'재대전 준비',exact:true}).tap();await phones[1].waitForFunction(()=>JSON.parse(window.render_game_to_text()).rematchReady.length===1);assert.equal((await state(host)).roundId,old)
 await phones[0].getByRole('button',{name:'재대전 준비 취소',exact:true}).tap();await phones[1].waitForFunction(()=>JSON.parse(window.render_game_to_text()).rematchReady.length===0)
 await phones[0].getByRole('button',{name:'재대전 준비',exact:true}).tap();await phones[1].waitForFunction(()=>JSON.parse(window.render_game_to_text()).rematchReady.length===1)
 await phones[1].screenshot({path:'output/features/rematch-mobile.png',fullPage:true})
 await phones[1].getByRole('button',{name:'재대전 준비',exact:true}).tap();for(const p of [host,...phones])await p.waitForFunction(old=>{const s=JSON.parse(window.render_game_to_text());return s.roundId!==old&&s.winner===null},old)
 assert.ok(await host.locator('.classic-options').innerText().then(t=>t.includes(code)))
 const newRound=(await state(host)).roundId
 assert.equal((await state(phones[0])).history.records.battle2p.games,1)
 await finish(host);for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).history.records.battle2p.games===2)
 await phones[1].context().close();await phones[0].waitForFunction(()=>JSON.parse(window.render_game_to_text()).rematchRequired.length===1);assert.equal(await phones[0].getByRole('button',{name:'재대전 준비',exact:true}).isDisabled(),true);assert.equal((await state(host)).roundId,newRound)
 await phones[0].locator('.classic-options').getByRole('button',{name:'MENU',exact:true}).click();await phones[0].screenshot({path:'output/features/history-mobile.png',fullPage:true})
 assert.ok(await phones[0].evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
 assert.deepEqual(errors,[])
 console.log('PASS: completed-match records once per round, persistence, recent map/settings restore, solo restart, local 2P consent, exact room clipboard and share data, two-phone unanimous rematch/cancel, room retention, spectator exclusion, disconnect blocking. No page errors.')
} finally {await browser.close()}
