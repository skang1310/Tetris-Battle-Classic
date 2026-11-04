export const PROFILE_KEY='tetris-player-profiles-v1'
export const controls=['left','right','down','rotate','drop','hold'] as const
export type Control=typeof controls[number]
export const controlNames:Record<Control,string>={left:'왼쪽',right:'오른쪽',down:'내리기',rotate:'회전',drop:'빠른 낙하',hold:'홀드'}
export const canonical=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','c']
export const keyOptions=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','c','x','z','Shift','a','d','s','w','q','e']
export function keyLabel(key:string){return ({ArrowLeft:'←',ArrowRight:'→',ArrowDown:'↓',ArrowUp:'↑',' ':'Space',Shift:'Shift'} as Record<string,string>)[key]??key.toUpperCase()}
export interface PlayerProfile{name:string;avatar:string;delay:number;repeat:number;keys:Record<Control,string>}
export const avatars=['🟦','🟪','🟩','🟨','🟥','🟧','⭐','🐱']
export function defaultProfile(i:number):PlayerProfile{return {name:`PLAYER ${i+1}`,avatar:avatars[i]!,delay:220,repeat:100,keys:Object.fromEntries(controls.map((c,j)=>[c,canonical[j]])) as Record<Control,string>}}
export function readProfiles(raw:string|null):[PlayerProfile,PlayerProfile]{let data:any;try{data=JSON.parse(raw||'null')}catch{};return [0,1].map(i=>{const p=defaultProfile(i),s=data?.[i];if(!s)return p;if(typeof s.name==='string')p.name=s.name.trim().slice(0,16)||p.name;if(avatars.includes(s.avatar))p.avatar=s.avatar;for(const k of ['delay','repeat'] as const)if(Number.isFinite(s[k]))p[k]=Math.max(k==='delay'?100:30,Math.min(k==='delay'?400:200,s[k]));if(s.keys&&controls.every(c=>keyOptions.includes(s.keys[c]))&&new Set(controls.map(c=>s.keys[c])).size===6)p.keys={...s.keys};return p}) as [PlayerProfile,PlayerProfile]}
export function profileKey(p:PlayerProfile,key:string){const i=controls.findIndex(c=>p.keys[c]===key);return i<0?null:canonical[i]!}

export function customProfile(p:PlayerProfile){return controls.some((c,i)=>p.keys[c]!==canonical[i])}
