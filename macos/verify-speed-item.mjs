// Supplemental develop-web-game checks: speed progression and item keyboard/touch relay.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}),errors=[]
const make=async mobile=>{const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1120,height:800},isMobile:!!mobile,hasTouch:!!mobile});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});return p}
const loaded=p=>p.waitForFunction(()=>typeof window.render_game_to_text==='function')
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
fs.mkdirSync('output/speed-item',{recursive:true})
try{
 const speed=await make(false);await speed.goto('http://127.0.0.1:8080/?mode=speed');await loaded(speed);assert.equal((await state(speed)).speedStage,1)
 await speed.evaluate(()=>window.advanceTime(15001));await speed.waitForFunction(()=>document.querySelector('.speed-hud')?.textContent.includes('SPEED 2'))
 assert.ok((await state(speed)).players.every(g=>g.dropInterval<800));await speed.screenshot({path:'output/speed-item/speed-desktop.png',fullPage:true})
 await speed.keyboard.press('p');await speed.evaluate(()=>window.advanceTime(15000));assert.equal((await state(speed)).speedStage,2);await speed.keyboard.press('p');await speed.evaluate(()=>window.advanceTime(15000));assert.equal((await state(speed)).speedStage,3)
 const local=await make(false);await local.goto('http://127.0.0.1:8080/?mode=item');await loaded(local);await local.screenshot({path:'output/speed-item/item-desktop.png',fullPage:true});await local.locator('canvas').focus()
 await local.keyboard.press('v');let s=await state(local);assert.equal(s.players[0].inventory.length,0);assert.equal(s.players[1].pending,4)
 await local.keyboard.press('r');s=await state(local);assert.equal(s.players[1].inventory.length,0);assert.equal(s.players[0].pending,4)
 const host=await make(false),phones=[await make(true),await make(true)]
 await host.goto('http://127.0.0.1:8080/');await loaded(host);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();await host.getByRole('combobox',{name:'대전 모드',exact:true}).selectOption('item');await host.getByRole('checkbox',{name:'맥은 관전 · 아이폰끼리 플레이'}).check();await host.getByRole('button',{name:'방 만들기',exact:true}).click();const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 for(const p of phones){await p.goto(`http://127.0.0.1:8080/?room=${code}`);await loaded(p);await p.getByRole('button',{name:'방 참가',exact:true}).click();await p.getByRole('heading',{name:`ROOM ${code}`}).waitFor()}
 await host.getByRole('button',{name:'대전 시작',exact:true}).click();for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await phones[0].screenshot({path:'output/speed-item/item-mobile-ready.png',fullPage:true});await phones[0].getByRole('button',{name:'공격 아이템 사용',exact:true}).tap();await phones[1].waitForFunction(()=>JSON.parse(window.render_game_to_text()).players[1].pending===4)
 assert.equal((await state(host)).players[0].inventory.length,0);await phones[0].screenshot({path:'output/speed-item/item-mobile.png',fullPage:true})
 await phones[1].getByRole('button',{name:'공격 아이템 사용',exact:true}).tap();await host.waitForFunction(()=>JSON.parse(window.render_game_to_text()).players[0].pending===4)
 for(const p of phones)assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
 await host.evaluate(()=>window.advanceTime(121000));for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).winner!==null && JSON.parse(window.render_game_to_text()).rematchRequired.length===2)
 const old=(await state(host)).roundId;for(const p of phones)await p.getByRole('button',{name:'재대전 준비',exact:true}).tap()
 for(const p of phones)await p.waitForFunction(old=>{const s=JSON.parse(window.render_game_to_text());return s.roundId!==old && s.winner===null},old)
 assert.ok((await state(host)).players.every(g=>g.inventory.length===1&&g.hasteTime===0&&g.shieldTime===0));assert.equal((await state(phones[0])).history.records.item.games,1)
 assert.deepEqual(errors,[]);console.log('PASS: Speed stage/interval progression and pause, Item local V/R use, two-phone spectator LAN touch use and authoritative inventory/attack synchronization. No browser errors.')
}finally{await browser.close()}
