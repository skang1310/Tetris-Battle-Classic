import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
const url=process.argv[2],browser=await chromium.launch({headless:true}),errors=[]
try{
 const host=await browser.newPage(),guest=await browser.newPage();for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message))
 await host.goto(url);await host.waitForFunction(()=>window.render_game_to_text);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();await host.getByRole('button',{name:'방 만들기',exact:true}).click();const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 await host.waitForFunction(()=>document.querySelector('[aria-label="아이폰 접속 주소"]').value.startsWith('https://'));const invite=await host.getByRole('textbox',{name:'아이폰 접속 주소'}).inputValue();assert.equal(new URL(invite).origin,url)
 await guest.goto(invite);await guest.waitForFunction(()=>window.render_game_to_text);await guest.getByRole('button',{name:'방 참가',exact:true}).click();await guest.getByRole('heading',{name:`ROOM ${code}`}).waitFor();await host.getByRole('button',{name:'대전 시작',exact:true}).click();await guest.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await guest.locator('canvas').focus();await guest.keyboard.press('c');await host.waitForFunction(()=>JSON.parse(window.render_game_to_text()).players[1].hold!==null);await guest.keyboard.press('Space');await host.waitForFunction(()=>JSON.parse(window.render_game_to_text()).players[1].board.flat().some(Boolean));await host.keyboard.press('p');await guest.waitForFunction(()=>JSON.parse(window.render_game_to_text()).paused);await host.keyboard.press('p');await guest.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).paused)
 assert.deepEqual(errors,[]);console.log('PASS: public HTTPS page, secure WebSocket room creation/join, public invitation, guest Hold/drop relayed to host, pause/resume broadcast. No page errors. US latency not measured.')
}finally{await browser.close()}
