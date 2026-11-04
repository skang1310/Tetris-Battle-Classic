export interface KeyboardStatus {enabled:boolean;permission:boolean;devices:{id:string;name:string}[];seats:(string|null)[];learning:number|null;note:string}
export const emptyKeyboardStatus=():KeyboardStatus=>({enabled:false,permission:false,devices:[],seats:[null,null],learning:null,note:'두 키보드를 연결한 뒤 등록해 주세요.'})
export const nativeGameKeys=['Enter','a','d','s','w','q','e','ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','c','x','z','Shift','v','b','n','p','Escape','1','2','3']
export function nativeKey(data:unknown):{player:number;key:string;down:boolean}|null {
 if(!data||typeof data!=='object')return null
 const v=data as Record<string,unknown>
 return v.type==='key'&&(v.player===0||v.player===1)&&typeof v.key==='string'&&nativeGameKeys.includes(v.key)&&typeof v.down==='boolean'?{player:v.player,key:v.key,down:v.down}:null
}
