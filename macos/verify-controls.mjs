// Supplemental game-skill UI checks: pointer repeat/release and saved controller preferences.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
const p=await context.newPage(), errors=[]
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const state=async()=>JSON.parse(await p.evaluate(()=>window.render_game_to_text()))
fs.mkdirSync('output/controllers',{recursive:true})
try{
 await p.goto('http://127.0.0.1:8080/?mode=sprint');await p.waitForFunction(()=>typeof window.render_game_to_text==='function')
 assert.ok(await p.locator('.game-controller.gameboy').isVisible())
 const box=await p.getByRole('button',{name:'왼쪽',exact:true}).boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.evaluate(()=>window.advanceTime(400));assert.equal((await state()).players[0].current.x,0);await p.mouse.up()
 await p.getByRole('button',{name:'오른쪽',exact:true}).tap();const x=(await state()).players[0].current.x;await p.evaluate(()=>window.advanceTime(200));assert.equal((await state()).players[0].current.x,x)
 await p.getByRole('button',{name:'회전',exact:true}).press('Space');assert.equal((await state()).players[0].board.flat().filter(Boolean).length,0)
 await p.getByRole('button',{name:'홀드',exact:true}).tap();assert.ok((await state()).players[0].hold)
 await p.getByRole('button',{name:'빠른 낙하',exact:true}).tap();assert.equal((await state()).players[0].board.flat().filter(Boolean).length,4)
 await p.screenshot({path:'output/controllers/gameboy.png',fullPage:true})
 await p.getByRole('button',{name:'조작 설정',exact:true}).click();assert.equal((await state()).paused,true)
 const dialog=p.getByRole('dialog');await dialog.waitFor();const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=390);await p.getByLabel('컨트롤러 스타일',{exact:true}).selectOption('battle');await p.getByLabel('버튼 크기',{exact:true}).selectOption('large');await p.getByRole('checkbox',{name:/왼손잡이 배치/}).check()
 await p.screenshot({path:'output/controllers/settings.png',fullPage:true})
 await p.getByRole('button',{name:'완료',exact:true}).click();await p.getByRole('button',{name:'RESUME',exact:true}).click()
 assert.ok(await p.locator('.game-controller.battle.large.left-handed').isVisible());await p.screenshot({path:'output/controllers/battle.png',fullPage:true})
 await p.reload();await p.waitForFunction(()=>typeof window.render_game_to_text==='function');assert.ok(await p.locator('.game-controller.battle.large.left-handed').isVisible())
 await p.getByRole('button',{name:'일시정지',exact:true}).click();await p.getByRole('button',{name:'조작 설정',exact:true}).first().click();await p.getByRole('button',{name:'조작 설정 닫기'}).press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'완료');await p.getByRole('button',{name:'완료'}).press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),'조작 설정 닫기')
 await p.getByRole('button',{name:'조작 설정 닫기'}).press('Escape');assert.equal(await dialog.count(),0);await p.getByRole('button',{name:'RESUME',exact:true}).click()
 await p.setViewportSize({width:844,height:390});await p.locator('.classic-shell.phone-landscape').waitFor();assert.ok(await p.locator('.game-controller').isVisible());const pad=await p.locator('.game-controller').boundingBox();assert.ok(pad.y+pad.height<=390);await p.screenshot({path:'output/controllers/landscape.png',fullPage:true});
 await p.setViewportSize({width:1280,height:800});await p.locator('.game-controller').waitFor({state:'hidden'});assert.equal(await p.locator('.game-controller').count(),0)
 await p.getByRole('button',{name:'컨트롤러 설정',exact:true}).click();await p.getByRole('checkbox',{name:'맥에서는 터치 패드 숨기기',exact:true}).uncheck();await p.getByRole('button',{name:'완료',exact:true}).click();assert.ok(await p.locator('.game-controller').isVisible())
 await p.goto('http://127.0.0.1:8080/?mode=retro');await p.waitForFunction(()=>typeof window.render_game_to_text==='function');assert.equal(await p.getByRole('button',{name:'홀드',exact:true}).isDisabled(),true);assert.equal(await p.getByRole('button',{name:'빠른 낙하',exact:true}).isDisabled(),true)
 assert.deepEqual(errors,[]);console.log('PASS: Gameboy and Battle layouts, pointer repeat/release, keyboard rotation, hold/drop, settings persistence, size/left-hand layout, desktop hide/show, dialog focus/Escape and retro restrictions.')
}finally{await browser.close()}
