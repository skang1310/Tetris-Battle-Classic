export type HapticEvent='rotate'|'hold'|'drop'|'clear'|'tetris'|'ko'|'finish'
const patterns:Record<HapticEvent,number|number[]>={rotate:8,hold:12,drop:22,clear:[18,30,18],tetris:[25,25,25,25,40],ko:[45,40,60],finish:[25,40,25,40,60]}
function bridge(){return typeof window==='undefined'?undefined:(window as any).webkit?.messageHandlers?.desktop}
export function hapticSupported(){return !!bridge() || (typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')}
export function playHaptic(event:HapticEvent){try{const native=bridge();if(native){native.postMessage({action:'haptic',event});return true}if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')return navigator.vibrate(patterns[event])}catch{}return false}
