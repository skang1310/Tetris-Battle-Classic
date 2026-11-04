// Supplemental develop-web-game verification for the three-mode UI and fast pad.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}),errors=[]
const make=async mobile=>{const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1120,height:800},isMobile:!!mobile,hasTouch:!!mobile,permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});return p}
const loaded=p=>p.waitForFunction(()=>typeof window.render_game_to_text==='function')
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
fs.mkdirSync('output/simple-glass',{recursive:true})
try{
 for(const mobile of [false,true]){
  const p=await make(mobile);await p.goto('http://127.0.0.1:8080/');await loaded(p);assert.equal(await p.locator('[data-mode]').count(),3);assert.equal(await p.getByRole('button',{name:'CPU',exact:true}).getAttribute('aria-pressed'),'true')
  assert.ok(!/스프린트|1989|기존 게임/.test(await p.locator('.arcade-pages').innerText()));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await p.screenshot({path:`output/simple-glass/home-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  await p.locator('[data-mode="battle2p"]').click();assert.equal((await state(p)).opponent,'CPU');await p.locator('.classic-options').getByRole('button',{name:'홈',exact:true}).click();await p.getByRole('button',{name:'2P',exact:true}).click();await p.locator('[data-mode="speed"]').click();assert.equal((await state(p)).opponent,'human');await p.evaluate(()=>window.advanceTime(15001));await p.waitForFunction(()=>document.querySelector('.mode-hud')?.textContent.includes('SPEED 2'))
  await p.locator('.classic-options').getByRole('button',{name:'홈',exact:true}).click();await p.getByRole('button',{name:'CPU',exact:true}).click();await p.locator('[data-mode="battle2p"]').click()
  if(mobile){
   const cdp=await p.context().newCDPSession(p),left=await p.getByRole('button',{name:'왼쪽',exact:true}).boundingBox(),right=await p.getByRole('button',{name:'오른쪽',exact:true}).boundingBox(),rotate=await p.getByRole('button',{name:'회전',exact:true}).boundingBox()
   const point=(b,id)=>({x:b.x+b.width/2,y:b.y+b.height/2,id})
   const before=await state(p)
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(left,1)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(left,1),point(rotate,2)]})
   const simultaneous=await state(p);assert.equal(await p.locator('.game-controller .is-held').count(),2);assert.equal(simultaneous.players[0].current.x,before.players[0].current.x-1);assert.notEqual(simultaneous.players[0].current.rotation,before.players[0].current.rotation)
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(right,1),point(rotate,2)]});assert.ok((await state(p)).players[0].current.x>=simultaneous.players[0].current.x+1)
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.locator('.game-controller .is-held').count(),0);const stopped=(await state(p)).players[0].current.x;await p.evaluate(()=>window.advanceTime(250));assert.equal((await state(p)).players[0].current.x,stopped)
   await p.getByRole('button',{name:'홀드',exact:true}).tap();assert.ok((await state(p)).players[0].hold)
   await p.getByRole('button',{name:'빠른 낙하',exact:true}).tap();assert.ok((await state(p)).players[0].board.flat().some(Boolean))
   await p.getByRole('button',{name:'조작 설정',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.waitFor();assert.ok((await state(p)).paused)
   await dialog.getByRole('combobox',{name:'버튼 크기',exact:true}).selectOption('large');await dialog.getByRole('checkbox',{name:'왼손잡이 배치 · 방향과 회전 패드 바꾸기'}).check();await dialog.getByRole('slider',{name:'연속 이동 시작',exact:true}).fill('60');await dialog.getByRole('slider',{name:'연속 이동 간격',exact:true}).fill('25')
   await p.screenshot({path:'output/simple-glass/settings-mobile.png',fullPage:true});await dialog.getByRole('button',{name:'완료',exact:true}).click();await p.getByRole('button',{name:'RESUME',exact:true}).click();await p.screenshot({path:'output/simple-glass/game-mobile.png',fullPage:true})
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
   await p.reload();await loaded(p);const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('tetris-controller')));assert.equal(saved.moveDelay,60);assert.equal(saved.moveRepeat,25);assert.equal(saved.leftHanded,true)
   const landscapeContext=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const landscape=await landscapeContext.newPage();await landscape.goto('http://127.0.0.1:8080/?mode=battle2p');await loaded(landscape);await landscape.getByRole('button',{name:'빠른 낙하',exact:true}).waitFor({state:'visible'});await landscape.screenshot({path:'output/simple-glass/game-landscape.png'});assert.ok(await landscape.getByRole('button',{name:'빠른 낙하',exact:true}).isVisible())
  }else{await p.screenshot({path:'output/simple-glass/game-desktop.png',fullPage:true})}
 }
 const host=await make(false),phones=[await make(true),await make(true)]
 await host.goto('http://127.0.0.1:8080/');await loaded(host);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();assert.equal(await host.getByRole('combobox',{name:'대전 모드'}).locator('option').count(),3);await host.getByRole('combobox',{name:'대전 모드'}).selectOption('speed');await host.getByRole('checkbox',{name:'맥은 관전 · 아이폰끼리 플레이'}).check();await host.getByRole('button',{name:'방 만들기',exact:true}).click();const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 await host.waitForFunction(code=>document.querySelector('[aria-label="아이폰 접속 주소"]').value.includes(`room=${code}`),code);await host.getByRole('button',{name:'초대 링크 복사',exact:true}).click();assert.equal(new URL(await host.evaluate(()=>navigator.clipboard.readText())).searchParams.get('room'),code)
 await host.screenshot({path:'output/simple-glass/lobby-desktop.png',fullPage:true})
 for(const p of phones){await p.goto(`http://127.0.0.1:8080/?room=${code}`);await loaded(p);await p.getByRole('button',{name:'방 참가',exact:true}).click();await p.getByRole('heading',{name:`ROOM ${code}`}).waitFor()}
 await host.getByRole('button',{name:'대전 시작',exact:true}).click();for(const p of phones)await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await phones[0].getByRole('button',{name:'빠른 낙하',exact:true}).tap();await phones[1].getByRole('button',{name:'홀드',exact:true}).tap();await host.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.players[0].board.flat().some(Boolean)&&s.players[1].hold})
 await host.evaluate(()=>window.advanceTime(121000));for(const p of phones)await p.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.winner!==null&&s.rematchRequired.length===2});const old=(await state(host)).roundId
 for(const p of phones)await p.getByRole('button',{name:'재대전 준비',exact:true}).tap();for(const p of phones)await p.waitForFunction(old=>{const s=JSON.parse(window.render_game_to_text());return s.roundId!==old&&s.winner===null},old)
 assert.equal((await state(phones[0])).history.records.speed.games,1);await phones[0].locator('.classic-options').getByRole('button',{name:'홈',exact:true}).click();await phones[0].locator('.records summary').click();assert.equal(await phones[0].locator('[data-record="speed"]').count(),1)
 const oldURL=await make(false);await oldURL.goto('http://127.0.0.1:8080/?mode=unknown');await loaded(oldURL);assert.equal((await state(oldURL)).screen,'menu');assert.equal(await oldURL.locator('[data-mode]').count(),3)
 assert.deepEqual(errors,[]);console.log('PASS: three modes with CPU/local/LAN; glass home/game/lobby; actual multi-touch and sliding release; hold/drop; settings persistence; speed progression; spectator LAN input, rematch and records; unknown mode URL blocked. No browser errors.')
}finally{await browser.close()}
