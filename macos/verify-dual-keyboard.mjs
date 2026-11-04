import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1120,height:1000}}),errors=[]
p.on('pageerror',e=>errors.push(e.message))
await p.addInitScript(()=>{window.nativeMessages=[];window.webkit={messageHandlers:{desktop:{postMessage:v=>window.nativeMessages.push(v)}}}})
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()))
const emit=data=>p.evaluate(data=>window.dispatchEvent(new CustomEvent('native-keyboards',{detail:data})),data)
const status={type:'status',enabled:true,permission:true,devices:[{id:'one',name:'Apple Keyboard · 0001'},{id:'two',name:'USB Keyboard · 0002'}],seats:['one','two'],learning:null,note:'두 키보드 등록 완료'}
const key=(player,key,down)=>emit({type:'key',player,key,down})
try{
 await p.goto('http://127.0.0.1:8080/');await p.waitForFunction(()=>window.render_game_to_text);await p.getByRole('button',{name:'2P',exact:true}).click();await p.locator('[data-mode="battle2p"]').click();await emit(status)
 await p.waitForFunction(()=>window.nativeMessages.some(v=>v.command==='capture'&&v.enabled))
 const start=(await state()).players.map(v=>v.current.x);await key(0,'ArrowLeft',true);await key(1,'ArrowLeft',true);assert.deepEqual((await state()).players.map(v=>v.current.x),start.map(x=>x-1));await key(0,'ArrowLeft',false);await p.evaluate(()=>window.advanceTime(250));const positions=(await state()).players.map(v=>v.current.x);assert.equal(positions[0],start[0]-1);assert.ok(positions[1]<start[1]-1);await key(1,'ArrowLeft',false)
 const stopped=(await state()).players.map(v=>v.current.x);await p.keyboard.press('ArrowRight');assert.deepEqual((await state()).players.map(v=>v.current.x),stopped)
 for(const player of [0,1]){await key(player,'c',true);await key(player,'c',false);assert.ok((await state()).players[player].hold);await key(player,' ',true);await key(player,' ',false);assert.ok((await state()).players[player].board.flat().some(Boolean))}
 await p.keyboard.press('p');assert.equal((await state()).paused,true);await key(0,'ArrowRight',true);await key(0,'ArrowRight',false);await p.keyboard.press('p');assert.equal((await state()).paused,false)
 await p.getByRole('button',{name:'조작 설정',exact:true}).click();const d=p.getByRole('dialog');await d.getByRole('button',{name:'1P 등록',exact:true}).click();assert.ok(await p.evaluate(()=>window.nativeMessages.some(v=>v.command==='learn'&&v.player===0)));await p.screenshot({path:'output/simple-glass/dual-keyboard-settings.png'});await d.getByRole('button',{name:'완료',exact:true}).click();await p.getByRole('button',{name:'RESUME',exact:true}).click()
 await emit({...status,seats:['one',null],devices:[status.devices[0]],note:'키보드가 분리됐습니다.'});assert.equal((await state()).paused,true)
 await p.getByRole('button',{name:'RESUME',exact:true}).click();const before=(await state()).players[0].current.x;await p.keyboard.press('ArrowRight');assert.ok((await state()).players[0].current.x>before)
 assert.deepEqual(errors,[]);console.log('PASS: native bridge messages drive independent same-key movement and release/repeat; duplicate DOM inputs suppressed; both seats Hold/drop; pause/resume; settings registration command; disconnection pauses and fallback works. Hardware HID events and permission grant require physical verification.')
}finally{await browser.close()}
