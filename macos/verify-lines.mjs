// Run the retained game engine and relay its actual line-clear snapshots to a real browser guest.
import {chromium} from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import esbuild from '../client-nuxt/node_modules/esbuild/lib/main.js'
import WebSocket from '../client-nuxt/node_modules/ws/wrapper.mjs'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const temp=mkdtempSync(join(tmpdir(),'tetris-line-ui-'));mkdirSync('output/lines',{recursive:true})
await esbuild.build({stdin:{resolveDir:process.cwd(),contents:`export * from '${resolve('client-nuxt/app/game/GameModes.ts')}';export {Tetromino} from '${resolve('client-nuxt/app/game/Tetromino.ts')}';`},bundle:true,format:'esm',platform:'node',outfile:join(temp,'engine.mjs')})
const {ModeSession,Tetromino}=await import(pathToFileURL(join(temp,'engine.mjs')).href)
const socket=new WebSocket('ws://127.0.0.1:8080/arena-ws');await new Promise((r,j)=>{socket.once('open',r);socket.once('error',j)})
const messages=[];socket.on('message',raw=>messages.push(JSON.parse(String(raw))))
const until=async f=>{for(let i=0;i<150;i++){const value=f();if(value)return value;await new Promise(r=>setTimeout(r,20))}throw Error('Relay timeout')}
socket.send(JSON.stringify({type:'create',mode:'battle2p',name:'CounterHost',spectator:false}));const welcome=await until(()=>messages.find(m=>m.type==='welcome'))
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1120,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message))
let s=new ModeSession('battle2p',false),round='line-count-test'
const send=()=>socket.send(JSON.stringify({type:'state',state:{roundId:round,countdownRemaining:0,map:0,pieceSeed:s.pieceSeed,mode:s.mode,remaining:s.remaining,elapsed:s.elapsed,paused:s.paused,winner:s.winner,finished:s.finished,outcome:s.outcome,kos:s.kos,koEffectTime:s.koEffectTime,eliminated:s.eliminated,target:s.target,attackTargets:s.attackTargets,items:s.items,itemClock:s.itemClock,humanSeats:[0,1],players:s.players.map(g=>({data:g.serialize(),...Object.fromEntries(['sent','pending','event','effectTime','rallyReserve','rallyGoal','speedInterval','slowTime','pieceSeed','sequenceCursor'].map(k=>[k,g[k]]))}))}}))
const well=(seat,n)=>{const g=s.players[seat];g.board.clear();for(let y=20-n;y<20;y++)g.board.grid[y]=Array.from({length:10},(_,x)=>x===5?0:8);g.currentPiece=new Tetromino('I',3,0);g.currentPiece.rotationIndex=1;g.hardDrop()}
const expectLines=async(seat,n,sent)=>{await p.waitForFunction(({seat,n,sent})=>{const s=JSON.parse(window.render_game_to_text());return s.players[seat].lines===n&&s.players[seat].sent===sent},{seat,n,sent});assert.equal((await p.getByLabel(`${seat+1}P 지운 줄`,{exact:true}).innerText()).replace(/\s/g,''),`지운${n}줄`);assert.equal((await p.getByLabel(`${seat+1}P 보낸 줄`,{exact:true}).innerText()).replace(/\s/g,''),`보낸${sent}줄`)}
try{
await p.goto(`http://127.0.0.1:8080/?room=${welcome.code}`);await p.getByRole('button',{name:'방 참가',exact:true}).click();await p.getByRole('heading',{name:`ROOM ${welcome.code}`}).waitFor();send();await expectLines(0,0,0)
well(0,1);assert.equal(s.players[0].linesCleared,1);assert.equal(s.players[0].sent,0);send();await expectLines(0,1,0)
well(1,2);send();await expectLines(1,2,1)
well(0,4);send();await expectLines(0,5,s.players[0].sent);await p.screenshot({path:'output/lines/counters-desktop.png'})
s.players[1].isGameOver=true;s.update(1);send();await expectLines(1,2,1);assert.ok((await p.locator('.match-status>div').first().innerText()).includes('2P'));assert.ok((await p.locator('.match-status>div').last().innerText()).includes('1P'));await p.setViewportSize({width:390,height:844});await p.screenshot({path:'output/lines/counters-phone.png',fullPage:true});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
s.remaining=1;s.update(1);send();const table=p.getByRole('table',{name:'대전 결과'});await table.waitFor();assert.equal(await table.getByRole('columnheader',{name:'지운 줄',exact:true}).count(),1);for(const [seat,count] of [[0,5],[1,2]])assert.equal(await table.locator('tbody tr').nth(seat).getByRole('cell').nth(1).innerText(),String(count));await p.screenshot({path:'output/lines/results-phone.png'})
s=new ModeSession('battle2p',false);round='line-count-rematch';send();await expectLines(0,0,0);await expectLines(1,0,0);assert.deepEqual(errors,[]);console.log('PASS: real engine single=1 cleared/0 sent, double and cumulative Tetris, both seats, real relay/browser snapshots, KO preservation, mobile bounds, result clear column and new-round reset. No page errors.')
}finally{socket.close();await b.close();rmSync(temp,{recursive:true,force:true})}
