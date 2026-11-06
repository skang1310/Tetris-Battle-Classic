import SwiftUI

@main struct BattleApp: App {
    @StateObject private var model = BattleModel()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            ControllerRoot(model:model)
                .onChange(of: phase) { _, phase in if phase != .active { model.setPaused(true) } }
        }
    }
}

struct BattleRoot: View {
    @EnvironmentObject var model: BattleModel
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex:"edffd5"),Color(hex:"b5ed56")],startPoint:.topLeading,endPoint:.bottomTrailing).ignoresSafeArea()
            if model.playing { arena } else { menu }
        }
        .preferredColorScheme(.light)
        #if os(tvOS)
        .onExitCommand { if model.playing { model.setPaused(true) } }
        #endif
        .alert("연결 확인", isPresented: Binding(get:{model.error != nil},set:{if !$0 {model.error=nil}})) { Button("확인") { model.error=nil } } message: { Text(model.error ?? "") }
    }
    var menu: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:24) {
                HStack { Text("TETRIS\nBATTLE").font(.system(size:48,weight:.black,design:.rounded)).italic(); Spacer(); Image(systemName:"gamecontroller.fill").font(.system(size:70)).foregroundStyle(Color(hex:"237643")) }
                Text("함께 쌓고, 함께 즐겨요.").font(.title2.bold())
                Text("iPhone · iPad · Apple TV   /   컨트롤러 로컬 대전").foregroundStyle(.secondary)
                HStack { ForEach([("battle2p","기본전"),("speed","스피드전"),("item","아이템전")],id:\.0) { mode in
                    Button { model.mode=mode.0 } label: { Text(mode.1).font(.headline).frame(maxWidth:.infinity).padding(.vertical,12) }
                        .tint(model.mode==mode.0 ? Color(hex:"237643") : .gray)
                }}
                Picker("플레이 방식",selection:$model.twoPlayer) { Text("컴퓨터 대전").tag(false); Text("컨트롤러 2P").tag(true) }
                Picker("맵",selection:$model.map) { Text("매 판 랜덤").tag(-1); Text("빈 보드").tag(0); ForEach(1...4,id:\.self) { Text("맵 \($0)").tag($0) } }.disabled(model.twoPlayer)
                if model.twoPlayer { Text("2P는 두 사람에게 같은 블록 순서와 매 판 새로운 랜덤 맵을 적용해요.").font(.callout) }
                VStack(alignment:.leading,spacing:8) {
                    Label("컨트롤러 \(model.controllers.count)/2",systemImage:"gamecontroller").font(.headline)
                    if model.controllers.isEmpty { Text("설정 → Bluetooth에서 DualSense 또는 Xbox 컨트롤러를 연결하세요.") }
                    ForEach(model.controllers,id:\.self) { Text($0).foregroundStyle(Color(hex:"237643")) }
                }.padding().frame(maxWidth:.infinity,alignment:.leading).background(.white.opacity(0.65),in:RoundedRectangle(cornerRadius:18))
                Button { model.start() } label: { Label("플레이 시작",systemImage:"play.fill").font(.title3.bold()).frame(maxWidth:.infinity).padding(12) }.tint(Color(hex:"237643")).disabled(model.twoPlayer && model.controllers.count<2)
                Text("DualSense: ✕ 회전 · ○ 낙하 · L1 홀드\nXbox: A 회전 · B 낙하 · LB 홀드\n아이템: □ / X → 1번 · △ / Y → 2번 · R1 / RB → 3번\nOptions / Menu: 일시정지").font(.callout).foregroundStyle(.secondary)
                Toggle("배경 음악",isOn:$model.musicEnabled)
                VStack(alignment:.leading,spacing:12) {
                    Text("키 반응 속도").font(.headline)
                    Picker("반복 시작",selection:$model.repeatDelay) { Text("느리게").tag(0.30); Text("보통").tag(0.22); Text("빠르게").tag(0.12) }
                    Picker("반복 간격",selection:$model.repeatInterval) { Text("느리게").tag(0.15); Text("보통").tag(0.10); Text("빠르게").tag(0.05) }
                }
            }.padding(32).frame(maxWidth:900).frame(maxWidth:.infinity)
        }.buttonStyle(.borderedProminent)
    }
    var arena: some View {
        GeometryReader { geo in
            VStack(spacing:8) {
                if let state = model.state {
                    ClassicCanvas(state:state,mode:model.mode,cpu:!model.twoPlayer)
                        .frame(maxWidth:.infinity,maxHeight:.infinity)
                    if model.mode == "item" {
                        HStack(spacing:20) {
                            ForEach(0..<state.players.count,id:\.self) { i in
                                HStack {
                                    Text(i==0 ? "1P" : model.twoPlayer ? "2P" : "CPU").font(.caption.bold())
                                    ForEach(0..<3,id:\.self) { slot in
                                        #if os(iOS)
                                        Button { model.action(i,"item\(slot+1)") } label: {
                                            Text(slot<state.players[i].items.count ? state.players[i].items[slot] : "—").font(.title3).frame(minWidth:36,minHeight:36)
                                        }.disabled(!model.twoPlayer && i==1)
                                        #else
                                        Text(slot<state.players[i].items.count ? state.players[i].items[slot] : "—").font(.title3).frame(minWidth:44,minHeight:44)
                                        #endif
                                    }
                                }.frame(maxWidth:.infinity)
                            }
                        }
                    }
                    #if os(iOS)
                    HStack { Button("일시정지") { model.setPaused(true) }; Spacer(); Text("✕ / A 회전 · ○ / B 낙하 · L1 / LB 홀드").font(.caption) }
                    if model.controllers.isEmpty { touchPad }
                    #else
                    Text("✕ / A 회전   ·   ○ / B 낙하   ·   L1 / LB 홀드   ·   Options / Menu 일시정지").font(.callout)
                    #endif
                }
            }.padding(geo.size.width<650 ? 8:24)
            if model.countdown>0 { overlay(title:"\(model.countdown)",subtitle:"READY TO BATTLE") }
            else if model.state?.finished == true {
                overlay(title:model.state?.winner == -1 ? "DRAW" : "\((model.state?.winner ?? 0)+1)P WIN!",subtitle:model.state?.outcome ?? "") {
                    Button("다시 플레이") { model.start() }; Button("메인 메뉴") { model.leave() }
                }
            } else if model.state?.paused == true {
                overlay(title:"일시정지",subtitle:"컨트롤러가 끊겼다면 다시 연결한 뒤 계속하세요.") {
                    Button("계속 플레이") { model.setPaused(false) }.disabled(model.twoPlayer && model.controllers.count<2); Button("메인 메뉴") { model.leave() }
                }
            }
        }
    }
    var time: String { let s=Int(ceil((model.state?.remaining ?? 120000)/1000)); return String(format:"%02d:%02d",s/60,s%60) }
    func overlay<Content:View>(title:String,subtitle:String,@ViewBuilder content:()->Content) -> some View {
        ZStack { Color.black.opacity(0.55).ignoresSafeArea(); VStack(spacing:20) { Text(title).font(.system(size:60,weight:.black,design:.rounded)); Text(subtitle).multilineTextAlignment(.center); content() }.padding(40).background(.regularMaterial,in:RoundedRectangle(cornerRadius:28)).padding(20) }.frame(maxWidth:.infinity,maxHeight:.infinity).buttonStyle(.borderedProminent).tint(Color(hex:"237643"))
    }
    func overlay(title:String,subtitle:String)->some View { overlay(title:title,subtitle:subtitle) { EmptyView() } }
    #if os(iOS)
    var touchPad: some View {
        HStack { ForEach([("◀","left"),("▼","down"),("▶","right"),("↻","rotate"),("⤓","drop"),("H","hold")],id:\.1) { button in
            Button(button.0) { model.action(0,button.1) }.font(.title2.bold()).frame(maxWidth:.infinity,minHeight:52).background(.white.opacity(0.8),in:RoundedRectangle(cornerRadius:12))
        }}
    }
    #endif
}

extension Color {
    init(hex:String) { let value=UInt64(hex.trimmingCharacters(in:CharacterSet.alphanumerics.inverted),radix:16) ?? 0; self.init(red:Double((value>>16)&255)/255,green:Double((value>>8)&255)/255,blue:Double(value&255)/255) }
}
