// Supplemental game-skill reproduction of a real KO via repeated hard drops.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}), errors=[]
const page=async()=>{const c=await browser.newContext({viewport:{width:1120,height:800}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return p}
const state=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
const loaded=p=>p.waitForFunction(()=>typeof window.render_game_to_text==='function')
const knockOut=async(p,key,index)=>{await p.locator('canvas').focus();for(let i=0;i<80;i++){await p.keyboard.press(key);await p.evaluate(()=>window.advanceTime(17));if((await state(p)).kos[index]===1)return}throw Error('KO was not triggered')}
fs.mkdirSync('output/ko-fix',{recursive:true})
try{
 const local=await page();await local.goto('http://127.0.0.1:8080/?mode=battle2p');await loaded(local);await local.locator('.classic-options').getByRole('button',{name:'홈',exact:true}).click();await local.getByRole('button',{name:'2P',exact:true}).click();await local.locator('[data-mode="battle2p"]').click()
 await knockOut(local,'q',0);assert.ok((await state(local)).koEffectTime[0]>0)
 await local.screenshot({path:'output/ko-fix/visible.png'})
 await local.keyboard.press('p');const timer=(await state(local)).koEffectTime[0];await local.evaluate(()=>window.advanceTime(2500));assert.equal((await state(local)).koEffectTime[0],timer)
 await local.keyboard.press('p');await local.evaluate(()=>window.advanceTime(2100));const expired=await state(local);assert.equal(expired.koEffectTime[0],0);assert.equal(expired.kos[0],1);assert.equal(expired.winner,null)
 await local.screenshot({path:'output/ko-fix/expired.png'})
 const host=await page(),guest=await page();await host.goto('http://127.0.0.1:8080/');await loaded(host);await host.getByRole('button',{name:'LAN · iPhone',exact:true}).click();await host.getByRole('button',{name:'방 만들기',exact:true}).click();const heading=host.getByRole('heading',{name:/ROOM/});await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)[0]
 await guest.goto(`http://127.0.0.1:8080/?room=${code}`);await loaded(guest);await guest.getByRole('button',{name:'방 참가',exact:true}).click();await guest.getByRole('heading',{name:`ROOM ${code}`}).waitFor();await host.getByRole('button',{name:'대전 시작',exact:true}).click();await guest.waitForFunction(()=>JSON.parse(window.render_game_to_text()).network)
 await knockOut(host,'Space',1);await guest.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.kos[1]===1&&s.koEffectTime[1]>0})
 await host.evaluate(()=>window.advanceTime(2100));await guest.waitForFunction(()=>{const s=JSON.parse(window.render_game_to_text());return s.kos[1]===1&&s.koEffectTime[1]===0})
 assert.equal((await state(guest)).winner,null);assert.deepEqual(errors,[])
 console.log('PASS: actual local and LAN first KO appears then expires after two gameplay seconds; KO count preserved, pause freezes timer, match continues. No page errors.')
}finally{await browser.close()}
