export type BoostId='shield'|'finalRush'|'twinBomb'
export interface MatchRules {bestOf:1|3|5;durationMs:60000|120000|180000;koTarget:1|2|3|5;handicap?:[number,number];cooperative?:boolean;goalLines?:40|80|120;original?:boolean;battleStyle?:'facebook'|'custom';itemStyle?:'boosts'|'collect';boostLoadouts?:[BoostId[],BoostId[]]}
export const defaultMatchRules=():MatchRules=>({bestOf:1,durationMs:120000,koTarget:3})
export function normalizeMatchRules(value:unknown):MatchRules{
 const v=(value&&typeof value==='object'?value:{}) as Partial<MatchRules>
 const rules:MatchRules={bestOf:([1,3,5].includes(v.bestOf!)?v.bestOf:1) as MatchRules['bestOf'],durationMs:([60000,120000,180000].includes(v.durationMs!)?v.durationMs:120000) as MatchRules['durationMs'],koTarget:([1,2,3,5].includes(v.koTarget!)?v.koTarget:3) as MatchRules['koTarget']}
 if(v.battleStyle==='facebook'||v.battleStyle==='custom')rules.battleStyle=v.battleStyle
 if(v.itemStyle==='boosts'||v.itemStyle==='collect')rules.itemStyle=v.itemStyle
 if(Array.isArray(v.boostLoadouts))rules.boostLoadouts=[0,1].map(i=>Array.isArray(v.boostLoadouts?.[i])?[...new Set(v.boostLoadouts![i]!.filter(id=>['shield','finalRush','twinBomb'].includes(id)))]:[]) as [BoostId[],BoostId[]]
 if(rules.itemStyle==='boosts'&&!rules.boostLoadouts)rules.boostLoadouts=[['shield','finalRush','twinBomb'],['shield','finalRush','twinBomb']]
 if((rules.battleStyle==='facebook'||rules.itemStyle==='boosts')&&!v.cooperative){rules.durationMs=120000;rules.koTarget=5;rules.bestOf=1}
 if(typeof v.original==='boolean')rules.original=v.original
 if(Array.isArray(v.handicap))rules.handicap=[0,1].map(i=>Number.isInteger(v.handicap?.[i])?Math.max(0,Math.min(6,v.handicap![i]!)):0) as [number,number]
 if(typeof v.cooperative==='boolean')rules.cooperative=v.cooperative
 if(v.goalLines!==undefined)rules.goalLines=([40,80,120].includes(v.goalLines)?v.goalLines:40) as 40|80|120
 if(rules.original&&!rules.cooperative){rules.bestOf=1;rules.durationMs=120000;rules.koTarget=v.koTarget===2?2:5}
 if(rules.cooperative){if(rules.original)rules.original=false;rules.bestOf=1;rules.goalLines=rules.goalLines??40}
 return rules
}
export interface MatchSeries {bestOf:1|3|5;wins:[number,number];rounds:number;draws:number;winner:0|1|null;lastRoundId:string}
export const newSeries=(bestOf:MatchRules['bestOf']):MatchSeries=>({bestOf,wins:[0,0],rounds:0,draws:0,winner:null,lastRoundId:''})
export const winsNeeded=(bestOf:number)=>Math.floor(bestOf/2)+1
export function recordSeriesRound(series:MatchSeries,roundId:string,winner:number|null):MatchSeries{
 if(!roundId||series.lastRoundId===roundId||series.winner!==null||winner===null||![-1,0,1].includes(winner))return series
 const wins:[number,number]=[...series.wins];if(winner!==-1)wins[winner as 0|1]++
 return {...series,wins,rounds:series.rounds+1,draws:series.draws+(winner===-1?1:0),lastRoundId:roundId,winner:wins[0]>=winsNeeded(series.bestOf)?0:wins[1]>=winsNeeded(series.bestOf)?1:null}
}
export function readSeries(value:unknown):MatchSeries{const v=value as MatchSeries|undefined;if(!v||![1,3,5].includes(v.bestOf)||!Array.isArray(v.wins)||v.wins.length!==2||!v.wins.every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isSafeInteger(v.rounds)||!Number.isSafeInteger(v.draws)||typeof v.lastRoundId!=='string'||![null,0,1].includes(v.winner))return newSeries(1);return {...v,wins:[...v.wins]}}
export function matchRulesLabel(rules:MatchRules){if(!rules.cooperative&&(rules.battleStyle==='facebook'||rules.itemStyle==='boosts'))return `Facebook 배틀 규칙 · 2분 · 5 KO · 폭탄 공격줄${rules.itemStyle==='boosts'?' · 자동 부스트':''}`;if(rules.original&&!rules.cooperative)return `원작 Battle ${rules.koTarget===2?'2P+':'2P'} · 2분 · ${rules.koTarget} KO · 폭탄 공격줄`;if(rules.cooperative)return `협동 · 합산 ${rules.goalLines??40}줄 · ${rules.durationMs/60000}분`;return `${rules.bestOf===1?'단판':`${rules.bestOf}판 ${winsNeeded(rules.bestOf)}선승`} · 한 판 ${rules.durationMs/60000}분 · ${rules.koTarget} KO 승리${rules.handicap?.some(Boolean)?` · 시작 장애물 ${rules.handicap[0]}/${rules.handicap[1]}줄`:""}`}
