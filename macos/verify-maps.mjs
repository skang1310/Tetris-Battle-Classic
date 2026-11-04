import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true}),errors=[]
const make=async mobile=>{const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1120,height:950},isMobile:!!mobile,hasTouch:!!mobile});p.on('pageerror',e=>errors.push(e.message));return p}
const load=async p=>{await p.goto('http://127.0.0.1:8080/');await p.waitForFunction(()=>window.render_game_to_text)}
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
const pick=async(p,map)=>{const d=p.locator('.map-picker').first();if((await d.getAttribute('open'))===null)await d.locator('summary').click();await d.locator(`[data-map="${map}"]`).click();assert.equal(await d.locator(`[data-map="${map}"]`).getAttribute('aria-pressed'),'true')}
try{
 for(const mobile of [false,true]){
  const p=await make(mobile);await load(p);await p.getByRole('button',{name:'2P',exact:true}).click();await pick(p,4);assert.equal(await p.locator('[data-map]').count(),9);await p.screenshot({path:`output/simple-glass/maps-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  for(const map of [0,1,2,3,4,5,6,7,8]){await pick(p,map);await p.locator('[data-mode="battle2p"]').click();const s=await state(p);assert.equal(s.opponent,'human');assert.deepEqual(s.players[0].board,s.players[1].board);assert.equal(s.players[0].board.flat().some(Boolean),map!==0);if(map===4)await p.screenshot({path:`output/simple-glass/heart-${mobile?'mobile':'desktop'}.png`});await p.locator('.classic-options').getByRole('button',{name:'홈',exact:true}).click()}
  await p.reload();await p.waitForFunction(()=>window.render_game_to_text);await p.locator('[data-mode="speed"]').click();assert.equal((await state(p)).map,'무지개 언덕');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 }
 const host=await make(false),guest=await make(true);await load(host);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();await host.getByRole('button',{name:'방 만들기',exact:true}).click();const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0];await pick(host,6)
 await guest.goto(`http://127.0.0.1:8080/?room=${code}`);await guest.waitForFunction(()=>window.render_game_to_text);await guest.getByRole('button',{name:'방 참가',exact:true}).click();await guest.getByRole('heading',{name:`ROOM ${code}`}).waitFor();await host.getByRole('button',{name:'대전 시작',exact:true}).click();await guest.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network);assert.equal((await state(guest)).map,'한 줄 터널');assert.equal((await state(guest)).players[1].board.flat().filter(Boolean).length,45)
 await host.evaluate(()=>window.advanceTime(121000));for(const p of [host,guest])await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).winner!==null);for(const p of [host,guest])await p.getByRole('button',{name:'재대전 준비',exact:true}).click();await guest.waitForFunction(()=>JSON.parse(window.render_game_to_text()).winner===null);assert.equal((await state(guest)).map,'한 줄 터널');assert.equal((await state(guest)).players[1].board.flat().filter(Boolean).length,45)
 assert.deepEqual(errors,[]);console.log('PASS: nine selectable boards, all layouts both seats desktop/mobile, preview/persistence, Speed map, host room map change, LAN snapshot map/terrain and rematch preservation. No page errors.')
}finally{await browser.close()}
