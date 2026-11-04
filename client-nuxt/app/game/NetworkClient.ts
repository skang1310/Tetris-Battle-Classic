export interface RoomPeer { seat: number; name: string }
export class NetworkClient {
 private socket: WebSocket | null = null
 constructor(private receive: (message: any) => void) {}
 connect(message: { type:'create'|'join'; mode?:string; code?:string; name:string; spectator?:boolean }): void {
   this.close()
   const scheme=location.protocol==='https:'?'wss':'ws'
   this.socket=new WebSocket(`${scheme}://${location.host}/arena-ws`)
   this.socket.onopen=()=>this.send(message)
   this.socket.onmessage=e=>{try{this.receive(JSON.parse(e.data))}catch{this.receive({type:'error',error:'게임 상태를 읽을 수 없습니다.'})}}
   this.socket.onerror=()=>this.receive({type:'error',error:'서버에 연결할 수 없습니다. 같은 Wi-Fi와 맥 앱 실행 상태를 확인해 주세요.'})
   this.socket.onclose=()=>this.receive({type:'closed',error:'연결이 종료되었습니다.'})
 }
 send(message: unknown) { if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(message)) }
 close() {if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null}}
}
