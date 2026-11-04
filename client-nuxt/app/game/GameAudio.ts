export type SoundEvent='move'|'rotate'|'soft'|'drop'|'hold'|'lock'|'clear'|'combo'|'tetris'|'ko'|'win'|'lose'|'item'|'collect'|'danger'|'count'|'go'|'pause'|'menu'
export interface AudioSettings{effects:boolean;effectsVolume:number;musicVolume:number;theme:'classic'|'battle'}
export const defaultAudioSettings=():AudioSettings=>({effects:true,effectsVolume:.55,musicVolume:.3,theme:'classic'})
export function readAudioSettings(value:unknown):AudioSettings{
 const d=defaultAudioSettings(),v=value&&typeof value==='object'?value as Record<string,unknown>:{}
 for(const key of ['effectsVolume','musicVolume'] as const)if(typeof v[key]==='number'&&Number.isFinite(v[key]))d[key]=Math.min(1,Math.max(0,v[key]))
 if(typeof v.effects==='boolean')d.effects=v.effects;if(v.theme==='battle')d.theme='battle';return d
}
// A new, synthesized arrangement of the traditional Korobeiniki melody.
// No commercial Tetris recording is loaded for this track.
export const CLASSIC_MELODY:[number,number][]=[
 [76,1],[71,.5],[72,.5],[74,1],[72,.5],[71,.5],[69,1],[69,.5],[72,.5],[76,1],[74,.5],[72,.5],[71,1.5],[72,.5],[74,1],[76,1],[72,1],[69,1],[69,2],
 [74,1.5],[77,.5],[81,1],[79,.5],[77,.5],[76,1.5],[72,.5],[76,1],[74,.5],[72,.5],[71,1],[71,.5],[72,.5],[74,1],[76,1],[72,1],[69,1],[69,2],
]
const sounds:Record<SoundEvent,number[]>={move:[280],soft:[160],rotate:[520,780],drop:[180,90],hold:[390,520],lock:[110],clear:[520,660,780],combo:[660,830,990],tetris:[520,660,780,1040],ko:[220,330,440,660],win:[523,659,784,1047,784,1047],lose:[440,349,294,220],item:[330,660,440],collect:[784,988,1175],danger:[880,440,880],count:[440],go:[880,1320],pause:[440,330],menu:[660]}
export class GameAudio{
 private context:AudioContext|null=null
 private musicGain:GainNode|null=null
 private effectsGain:GainNode|null=null
 private voices=new Set<OscillatorNode>()
 private musicVoices=new Set<OscillatorNode>()
 private timer:ReturnType<typeof setInterval>|undefined
 private nextNote=0
 private cursor=0
 private wanted=false
 private last=new Map<string,number>()
 settings=defaultAudioSettings()
 private ensure(){
  if(this.context?.state==='closed')return null
  if(!this.context){const Constructor=window.AudioContext||(window as any).webkitAudioContext;if(!Constructor)return null;this.context=new Constructor();const c=this.context!;this.musicGain=c.createGain();this.effectsGain=c.createGain();this.musicGain.connect(c.destination);this.effectsGain.connect(c.destination);this.configure(this.settings)}
  return this.context
 }
 unlock(){try{const c=this.ensure();if(c?.state==='suspended')void c.resume().then(()=>{if(this.wanted)this.schedule()}).catch(()=>{});return !!c}catch{return false}}
 configure(settings:AudioSettings){this.settings=readAudioSettings(settings);if(this.musicGain)this.musicGain.gain.value=this.settings.musicVolume*.045;if(this.effectsGain)this.effectsGain.gain.value=this.settings.effects?this.settings.effectsVolume*.12:0}
 private tone(frequency:number,start:number,duration:number,music=false){
  const c=this.context;if(!c||c.state!=='running')return
  const osc=c.createOscillator(),envelope=c.createGain();osc.type=music?'triangle':'square';osc.frequency.value=frequency;envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(1,start+.005);envelope.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(envelope);envelope.connect((music?this.musicGain:this.effectsGain)!);this.voices.add(osc);if(music)this.musicVoices.add(osc);osc.onended=()=>{this.voices.delete(osc);this.musicVoices.delete(osc);osc.disconnect();envelope.disconnect()};osc.start(start);osc.stop(start+duration+.01)
 }
 play(event:SoundEvent){if(!this.settings.effects||this.settings.effectsVolume===0)return;const c=this.context;if(!c||c.state!=='running')return;const now=c.currentTime,minimum=event==='move'||event==='soft'?.055:.07;if(now-(this.last.get(event)??-100)<minimum)return;this.last.set(event,now);const slow=['win','lose','ko','danger'].includes(event),step=slow?.12:.055;sounds[event].forEach((f,i)=>this.tone(f,now+i*step,slow?.18:.09))}
 private schedule(){const c=this.context;if(!this.wanted||c?.state!=='running')return;if(this.nextNote<c.currentTime)this.nextNote=c.currentTime+.03;while(this.nextNote<c.currentTime+.4){const [pitch,beats]=CLASSIC_MELODY[this.cursor%CLASSIC_MELODY.length]!;const length=beats*.29;this.tone(440*Math.pow(2,(pitch-69)/12),this.nextNote,length*.88,true);this.nextNote+=length;this.cursor++}}
 music(active:boolean){if(active===this.wanted)return;this.wanted=active;if(active){this.nextNote=this.context?.currentTime??0;this.schedule();this.timer=setInterval(()=>this.schedule(),100)}else{clearInterval(this.timer);this.timer=undefined;for(const voice of this.musicVoices){try{voice.stop()}catch{}}this.musicVoices.clear()}}
 dispose(){this.music(false);for(const voice of this.voices){try{voice.stop()}catch{}}this.voices.clear();if(this.context)void this.context.close().catch(()=>{});this.context=null}
}
