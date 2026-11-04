// Supplemental game-skill browser checks for the redesigned non-game pages.
import { chromium } from '/Users/davidkang/.codex/skills/develop-web-game/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}),errors=[]
fs.mkdirSync('output/pages',{recursive:true})
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1120,height:800},isMobile:mobile,hasTouch:mobile})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.goto('http://127.0.0.1:8080/');await page.waitForFunction(()=>typeof window.render_game_to_text==='function');await page.getByRole('heading',{name:/한 판 더/}).waitFor()
  assert.ok(await page.getByRole('button',{name:'Start battle',exact:true}).isVisible())
  await page.screenshot({path:`output/pages/home-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
  await page.getByRole('button',{name:'게임 모드',exact:true}).click();assert.equal(await page.locator('[data-mode]').count(),14)
  await page.getByRole('button',{name:'혼자 도전',exact:true}).click();assert.equal(await page.locator('[data-mode]').count(),6)
  await page.getByRole('button',{name:'전체',exact:true}).click();await page.screenshot({path:`output/pages/modes-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  await page.getByRole('button',{name:'친구 대전',exact:true}).click();await page.getByRole('textbox',{name:'닉네임',exact:true}).fill('Menu test');await page.getByRole('textbox',{name:'방 코드',exact:true}).fill('111111')
  assert.ok(await page.getByRole('textbox',{name:'아이폰 접속 주소'}).inputValue());await page.screenshot({path:`output/pages/lobby-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  await page.getByRole('button',{name:'방 만들기',exact:true}).click();await page.getByRole('heading',{name:/ROOM \d{6}/}).waitFor();assert.equal(await page.getByRole('button',{name:'대전 시작',exact:true}).isDisabled(),true)
  await page.screenshot({path:`output/pages/room-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  await page.getByRole('button',{name:'Tetris Battle 홈'}).click();await page.getByRole('button',{name:'맵 설정',exact:true}).click();assert.equal(await page.getByRole('button',{name:/Choose .* map/}).count(),4)
  await page.screenshot({path:`output/pages/maps-${mobile?'mobile':'desktop'}.png`,fullPage:true});await page.getByRole('button',{name:'Choose Classic map',exact:true}).click()
  await page.getByRole('button',{name:'플레이 가이드',exact:true}).click();await page.getByRole('heading',{name:'맥 키보드'}).waitFor();await page.getByRole('heading',{name:'아이폰 터치 패드'}).waitFor();await page.screenshot({path:`output/pages/help-${mobile?'mobile':'desktop'}.png`,fullPage:true})
  await page.getByRole('button',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'스프린트',exact:false}).click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).screen==='battle');assert.equal(JSON.parse(await page.evaluate(()=>window.render_game_to_text())).mode,'sprint')
  await context.close()
 }
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile home, 14-mode catalog and filters, LAN QR/link, room creation, maps, controls guide, navigation and direct sprint launch. No console/page errors.')
}finally{await browser.close()}
