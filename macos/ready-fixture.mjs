// Existing gameplay regression checks enter the explicit preflight and finish its countdown.
export async function finishPreflight(page){
 await page.waitForFunction(()=>window.render_game_to_text)
 const setup=page.getByRole('dialog',{name:'어떻게 플레이할까요?',exact:true})
 if(await setup.isVisible())await setup.getByRole('button',{name:'준비 완료 · 시작',exact:true}).click()
 const s=await page.evaluate(()=>JSON.parse(window.render_game_to_text()))
 if(s.countdownRemaining>0){
  if(s.network&&s.seat>0)await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).countdownRemaining===0)
  else await page.evaluate(()=>window.advanceTime(JSON.parse(window.render_game_to_text()).countdownRemaining))
 }
}
