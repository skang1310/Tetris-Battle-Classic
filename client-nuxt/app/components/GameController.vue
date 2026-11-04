<template>
 <section ref="root" class="game-controller" :class="[size,{'left-handed':leftHanded}]" aria-label="터치 게임 조작">
  <header><button v-bind="input('c')" :disabled="disabled" aria-label="홀드" class="hold">▣ <span>홀드</span></button><span>TOUCH · DUO</span><button @click="emit('pause')" aria-label="일시정지" class="pause">Ⅱ</button></header>
  <div class="thumb-zones"><div class="movement"><div class="pair"><button v-for="d in directions" :key="d.key" :data-control="d.key" v-bind="input(d.key)" :disabled="disabled" :aria-label="d.label">{{ d.text }}</button></div><button data-control="ArrowDown" v-bind="input('ArrowDown')" :disabled="disabled" aria-label="천천히 낙하" class="soft">↓ <span>천천히</span></button></div><div class="rotation"><div class="pair"><button v-bind="input('ArrowUp')" :disabled="disabled" aria-label="회전">↻ <span class="rotate-label">회전</span></button></div><button v-bind="input(' ')" :disabled="disabled" aria-label="빠른 낙하" class="drop">⇓ <span>빠른 낙하</span></button></div></div>
  <footer><span>이동과 회전을 동시에</span><button @click="emit('settings')" aria-label="조작 설정">⚙ 조작 설정</button></footer>
 </section>
</template>
<script setup lang="ts">
import { ref,onMounted,onUnmounted,watch } from 'vue'
const props=defineProps<{size:'small'|'normal'|'large';leftHanded:boolean;disabled:boolean;retro?:boolean;multiplayer?:boolean}>()
const emit=defineEmits<{press:[key:string];release:[key:string];pause:[];settings:[];target:[]}>()
const activeKeys=ref<string[]>([])
function syncActive(){activeKeys.value=[...pointers.values()].map(p=>p.key).filter((key):key is string=>!!key)}
const root=ref<HTMLElement|null>(null)
const directions=[{key:'ArrowLeft',text:'←',label:'왼쪽'},{key:'ArrowRight',text:'→',label:'오른쪽'}]
const movementKeys=['ArrowLeft','ArrowRight','ArrowDown']
const pointers=new Map<number,{key:string|null;movement:boolean}>()
function pressKey(key:string){if(![...pointers.values()].some(p=>p.key===key))emit('press',key)}
function releaseKey(key:string){if(![...pointers.values()].some(p=>p.key===key))emit('release',key)}
function release(e:PointerEvent){const p=pointers.get(e.pointerId);if(p){pointers.delete(e.pointerId);if(p.key)releaseKey(p.key);syncActive()}}
function move(e:PointerEvent){const p=pointers.get(e.pointerId);if(!p?.movement)return
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>('[data-control]')
 const key=target&&root.value?.contains(target)&&!target.disabled?target.dataset.control||null:null
 if(key===p.key)return
 const old=p.key;p.key=null;if(old)releaseKey(old)
 if(key&&movementKeys.includes(key)){pressKey(key);p.key=key};syncActive()
}
function clear(){const keys=new Set([...pointers.values()].map(p=>p.key));pointers.clear();for(const key of keys)if(key)emit('release',key);syncActive()}
watch(()=>props.disabled,disabled=>{if(disabled)clear()})
function input(key:string){return{
 class:{'is-held':activeKeys.value.includes(key)},
 onPointerdown:(e:PointerEvent)=>{if(props.disabled)return;e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);pressKey(key);pointers.set(e.pointerId,{key,movement:movementKeys.includes(key)});syncActive()},
 onPointermove:move,onPointerup:release,onPointercancel:release,onLostpointercapture:release,
 onKeydown:(e:KeyboardEvent)=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();if(!e.repeat&&!props.disabled)emit('press',key)}},
 onKeyup:(e:KeyboardEvent)=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();emit('release',key)}},
 onClick:(e:MouseEvent)=>{if(e.detail===0&&!props.disabled){emit('press',key);emit('release',key)}}
}}
onMounted(()=>window.addEventListener('blur',clear))
onUnmounted(()=>{clear();window.removeEventListener('blur',clear)})
</script>
<style scoped>
.game-controller{--height:58px;box-sizing:border-box;flex-shrink:0;width:366px;max-width:calc(100vw - 16px);margin:12px 0 4px;padding:13px 15px 11px;border:1px solid #ffffff36;border-radius:28px;background:linear-gradient(140deg,#ffffff20,#ffffff0a);box-shadow:inset 0 1px #ffffff50,0 12px 45px #0004;backdrop-filter:blur(28px) saturate(1.5);-webkit-backdrop-filter:blur(28px) saturate(1.5);color:white;touch-action:none;user-select:none;-webkit-user-select:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
button{font:inherit;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;color:white;border:1px solid #ffffff28;background:linear-gradient(150deg,#ffffff20,#ffffff0a);box-shadow:inset 0 1px #ffffff30,0 3px 10px #0002;user-select:none;-webkit-user-select:none}button:focus-visible{outline:3px solid #91c6ff;outline-offset:3px}button:disabled{opacity:.35;cursor:default}button:active:not(:disabled){background:#ffffff35;transform:scale(.96)}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}header>span{font-size:8px;letter-spacing:2px;color:#a7bedf}header button{min-height:42px;border-radius:16px}.hold{padding:8px 15px;font-size:18px}.hold span{font-size:10px;margin-left:5px}.pause{width:43px;font-size:17px}.thumb-zones{display:flex;gap:22px}.movement,.rotation{flex:1;min-width:0}.left-handed .thumb-zones{flex-direction:row-reverse}.pair{display:flex;gap:8px}.pair button{flex:1;min-width:0;height:var(--height);border-radius:19px;font-size:28px}.rotation .pair button{background:linear-gradient(150deg,#b18fea35,#7b94d321);border-color:#d4c3ff3b}.soft,.drop{width:100%;height:calc(var(--height) - 5px);margin-top:9px;border-radius:18px;font-size:22px;display:flex;align-items:center;justify-content:center;gap:9px}.soft span,.drop span{font-size:11px;font-weight:600}.soft{color:#c0d1ea}.drop{background:linear-gradient(130deg,#739aee65,#8d70de55);border-color:#a8bafa75;color:#fff}footer{display:flex;align-items:center;justify-content:space-between;margin-top:11px;gap:8px}footer>span{font-size:8px;color:#8ea8cb}footer button{min-height:34px;border:0;background:none;box-shadow:none;padding:5px 8px;font-size:10px;color:#c1d3ee}.small{--height:50px;width:342px;padding:10px 12px}.large{--height:65px;width:382px;padding:15px 16px}.small .thumb-zones{gap:15px}.large .thumb-zones{gap:24px}@media(prefers-reduced-transparency:reduce){.game-controller{background:#20314f;backdrop-filter:none;-webkit-backdrop-filter:none}}@media(prefers-reduced-motion:reduce){button:active:not(:disabled){transform:none}}
</style>

<style scoped>.rotate-label{font-size:13px;font-weight:600;margin-left:8px}</style>
