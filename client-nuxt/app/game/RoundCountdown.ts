/** Split elapsed time so no game time, gravity, or item timer runs before GO. */
export function consumeCountdown(remaining:number,elapsed:number){
 const safeRemaining=Number.isFinite(remaining)?Math.max(0,remaining):0
 const safeElapsed=Number.isFinite(elapsed)?Math.max(0,elapsed):0
 return {remaining:Math.max(0,safeRemaining-safeElapsed),activeMs:Math.max(0,safeElapsed-safeRemaining)}
}
