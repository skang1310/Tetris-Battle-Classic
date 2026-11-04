// Supplemental Playwright game-skill verification: multiple contexts and iPhone touch.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true})
const logs=[]
const context=await browser.newContext({viewport:{width:1280,height:800}})
const host=await context.newPage()
const phones=await Promise.all([390,393].map(async width=>{const c=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});return c.newPage()}))
for(const p of [host,...phones]){p.on('pageerror',e=>logs.push(e.message));p.on('console',m=>{if(m.type()==='error')logs.push(m.text())})}
try{
 await host.goto('http://127.0.0.1:8080/');await host.waitForFunction(()=>typeof window.render_game_to_text==='function')
 await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click()
 await host.getByRole('checkbox',{name:'맥은 관전 · 아이폰끼리 플레이'}).check()
 await host.getByRole('button',{name:'방 만들기',exact:true}).click()
 const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 for(let i=0;i<2;i++){await phones[i].goto(`http://127.0.0.1:8080/?room=${code}`);await phones[i].getByRole('textbox',{name:'닉네임',exact:true}).fill(`iPhone ${i+1}`);await phones[i].getByRole('button',{name:'방 참가',exact:true}).click();await phones[i].getByRole('heading',{name:`ROOM ${code}`}).waitFor()}
 await host.getByRole('button',{name:'대전 시작',exact:true}).click()
 for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await phones[0].getByRole('button',{name:'왼쪽',exact:true}).tap()
 await phones[0].getByRole('button',{name:'빠른 낙하',exact:true}).tap()
 await phones[1].getByRole('button',{name:'홀드',exact:true}).tap()
 await phones[1].getByRole('button',{name:'빠른 낙하',exact:true}).tap()
 for(const p of phones) await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).players.every(g=>g.board.flat().filter(Boolean).length===4))
 const snapshot=JSON.parse(await host.evaluate(()=>window.render_game_to_text()))
 assert.equal(snapshot.players[0].board.flat().filter(Boolean).length,4)
 assert.equal(snapshot.players[1].board.flat().filter(Boolean).length,4)
 assert.ok(snapshot.players[1].hold)
 const own=JSON.parse(await phones[1].evaluate(()=>window.render_game_to_text()));assert.equal(own.seat,2);assert.deepEqual(own.players.map(g=>g.board),snapshot.players.map(g=>g.board))
 await phones[1].getByRole('button',{name:'일시정지',exact:true}).tap()
 for(const p of [host,...phones])await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).paused)
 const before=JSON.parse(await host.evaluate(()=>window.render_game_to_text())).remaining
 await host.waitForTimeout(150)
 assert.equal(JSON.parse(await host.evaluate(()=>window.render_game_to_text())).remaining,before)
 await phones[1].getByRole('button',{name:'RESUME',exact:true}).click()
 await phones[0].waitForFunction(()=>!JSON.parse(window.render_game_to_text()).paused)
 fs.mkdirSync('output/lan-final',{recursive:true})
 await host.screenshot({path:'output/lan-final/mac.png',fullPage:true})
 await phones[0].screenshot({path:'output/lan-final/iphone.png',fullPage:true})
 fs.writeFileSync('output/lan-final/state.json',JSON.stringify(snapshot,null,2))
 assert.deepEqual(logs,[])
 console.log('PASS: Mac spectator + two mobile contexts; independent input, hold, drop, board synchronization and shared pause/resume. No page errors.')
}finally{await browser.close()}
