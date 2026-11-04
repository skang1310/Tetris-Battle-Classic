import {finishPreflight} from './ready-fixture.mjs'
import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1120,height:900}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()))
try{
 await page.goto('http://127.0.0.1:8080/?mode=battle2p');await page.waitForFunction(()=>window.render_game_to_text);await finishPreflight(page)
 await page.getByRole('button',{name:'조작 설정',exact:true}).click();const d=page.getByRole('dialog');await d.getByRole('button',{name:'느리게',exact:true}).click();await page.screenshot({path:'output/simple-glass/keyboard-settings.png'});await d.getByRole('button',{name:'완료',exact:true}).click();await page.getByRole('button',{name:'RESUME',exact:true}).click()
 const x=(await state()).players[0].current.x;await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.advanceTime(200));assert.equal((await state()).players[0].current.x,x+1);await page.evaluate(()=>window.advanceTime(130));assert.equal((await state()).players[0].current.x,x+2);await page.keyboard.up('ArrowRight');const released=(await state()).players[0].current.x;await page.evaluate(()=>window.advanceTime(200));assert.equal((await state()).players[0].current.x,released)
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text);await finishPreflight(page);await page.getByRole('button',{name:'조작 설정',exact:true}).click();assert.equal(await d.getByRole('button',{name:'느리게',exact:true}).getAttribute('aria-pressed'),'true');await d.getByRole('button',{name:'빠르게',exact:true}).click();await d.getByRole('button',{name:'완료',exact:true}).click();await page.getByRole('button',{name:'RESUME',exact:true}).click();const fast=(await state()).players[0].current.x;await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.advanceTime(200));await page.keyboard.up('ArrowRight');assert.ok((await state()).players[0].current.x>=fast+3);assert.deepEqual(errors,[]);console.log('PASS: slow/fast actual keyboard hold timing, immediate single-cell move, release stops, persisted preset, no page errors.')
}finally{await browser.close()}
