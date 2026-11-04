import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import {mkdirSync} from 'node:fs'
mkdirSync('output/keyboard-offline',{recursive:true})
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1120,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message))
await p.addInitScript(()=>{
 const s={type:'status',enabled:false,permission:false,devices:[{id:'a',name:'Keyboard A'},{id:'b',name:'Keyboard B'}],seats:[null,null],learning:null,note:'Input connection unavailable'}
 const publish=()=>window.dispatchEvent(new CustomEvent('native-keyboards',{detail:structuredClone(s)}))
 window.testReconnect=()=>{s.enabled=true;s.permission=true;publish()}
 window.webkit={messageHandlers:{desktop:{postMessage:m=>{if(m.command==='assign'){if(s.seats[1-m.player]!==m.device)s.seats[m.player]=m.device;s.learning=null}if(m.command==='learn')s.learning=m.player;if(m.command==='cancel')s.learning=null;if(m.command!=='capture')publish()}}}}
})
try{
 await p.goto('http://127.0.0.1:8080/?mode=battle2p');const d=p.getByRole('dialog',{name:'어떻게 플레이할까요?'});await d.waitFor();await d.locator('[value="dual"]').check();const start=d.getByRole('button',{name:'준비 완료 · 시작',exact:true});assert.ok(await d.getByRole('button',{name:'1P 등록',exact:true}).isEnabled());await d.getByRole('button',{name:'1P 등록',exact:true}).click();await d.getByRole('button',{name:'재등록 취소',exact:true}).click();await d.getByLabel('1P 연결된 키보드 선택',{exact:true}).selectOption('a');assert.ok(await d.getByLabel('2P 연결된 키보드 선택',{exact:true}).locator('option[value="a"]').isDisabled());await d.getByLabel('2P 연결된 키보드 선택',{exact:true}).selectOption('b');assert.ok(await start.isDisabled());await p.screenshot({path:'output/keyboard-offline/registered.png'});await p.evaluate(()=>window.testReconnect());assert.ok(await start.isEnabled());await start.click();const s=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));assert.equal(s.opponent,'human');assert.ok(s.countdownRemaining>0);assert.deepEqual(errors,[]);console.log('PASS registration and direct assignment available while input permission unavailable; duplicate disabled; game remains gated until actual input connects; reconnect enables 2P countdown. Bridge simulated.')
}finally{await b.close()}
