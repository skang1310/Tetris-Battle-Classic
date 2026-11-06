#if os(tvOS)
import SwiftUI

struct TVMenu: View {
    @EnvironmentObject var model: BattleModel
    @FocusState private var focus: String?
    @State private var showSettings=false
    @State private var showMaps=false
    private var ready: Bool { model.controllers.count >= (model.twoPlayer ? 2:1) }
    var body: some View {
        GeometryReader { geo in
            HStack(alignment:.top,spacing:64) {
                VStack(alignment:.leading,spacing:26) {
                    VStack(alignment:.leading,spacing:8) {
                        Text("TETRIS BATTLE").font(.system(size:58,weight:.black,design:.rounded)).italic()
                        Text("오늘의 한 판, 함께 즐겨요.").font(.system(size:28)).foregroundStyle(.white.opacity(0.65))
                    }.padding(.bottom,12)
                    label("01  게임 모드")
                    HStack(spacing:20) {
                        tile("basic",title:"기본전",subtitle:"콤보와 KO로 승부",icon:"square.grid.3x3.fill",color:.cyan,selected:model.mode=="battle2p") { model.mode="battle2p" }
                        tile("speed",title:"스피드전",subtitle:"점점 빨라지는 배틀",icon:"bolt.fill",color:.yellow,selected:model.mode=="speed") { model.mode="speed" }
                        tile("item",title:"아이템전",subtitle:"블록을 지워 아이템 수집",icon:"sparkles",color:.pink,selected:model.mode=="item") { model.mode="item" }
                    }.frame(height:152)
                    label("02  함께할 상대")
                    HStack(spacing:20) {
                        tile("cpu",title:"컴퓨터",subtitle:"게임패드 1개로 플레이",icon:"cpu",color:.green,selected:!model.twoPlayer) { model.twoPlayer=false }
                        tile("two",title:"컨트롤러 2P",subtitle:"각자의 게임패드로 대전",icon:"person.2.fill",color:.purple,selected:model.twoPlayer) { model.twoPlayer=true }
                    }.frame(height:128)
                    HStack(spacing:20) {
                        utility("map",title:model.twoPlayer ? "매 판 랜덤 맵" : mapName,icon:"map") { showMaps=true }.disabled(model.twoPlayer)
                        utility("settings",title:"조작 · 사운드",icon:"slider.horizontal.3") { showSettings=true }
                    }.frame(height:70)
                    Button { model.start() } label: {
                        HStack { Image(systemName:"play.fill");Text(ready ? "플레이 시작" : "게임패드를 연결해 주세요");Spacer(); Text("A / ✕").font(.system(size:22,weight:.bold)).opacity(0.65) }.font(.system(size:32,weight:.bold)).padding(.horizontal,30).frame(maxWidth:.infinity,minHeight:86)
                    }.buttonStyle(.plain).background(ready ? Color(hex:"beef66"):.gray.opacity(0.3),in:RoundedRectangle(cornerRadius:22)).foregroundStyle(ready ? Color(hex:"142b19"):.white.opacity(0.45)).overlay(RoundedRectangle(cornerRadius:22).stroke(focus=="start" ? .white:.clear,lineWidth:5)).scaleEffect(focus=="start" ? 1.025:1).focused($focus,equals:"start").focusEffectDisabled().disabled(!ready)
                    Text("3 · 2 · 1 후 시작  ·  같은 블록 순서  ·  2분 배틀").font(.system(size:21)).foregroundStyle(.white.opacity(0.5))
                }.frame(maxWidth:.infinity)
                VStack(alignment:.leading,spacing:24) {
                    Image("TVArtwork").resizable().aspectRatio(5/3,contentMode:.fit).clipShape(RoundedRectangle(cornerRadius:28)).overlay(RoundedRectangle(cornerRadius:28).stroke(.white.opacity(0.12),lineWidth:1))
                    HStack { Image(systemName:"gamecontroller.fill").foregroundStyle(Color(hex:"beef66"));Text("컨트롤러 \(model.controllers.count) / 2").fontWeight(.bold) }.font(.system(size:28))
                    ForEach(0..<2,id:\.self) { seat in
                        HStack(spacing:16) {
                            Text("\(seat+1)P").font(.system(size:22,weight:.black)).padding(12).background(.white.opacity(0.1),in:RoundedRectangle(cornerRadius:12))
                            Text(seat<model.controllers.count ? model.controllers[seat].replacingOccurrences(of:"\(seat+1)P · ",with:"") : "연결 대기 중").font(.system(size:23,weight:.medium)).foregroundStyle(seat<model.controllers.count ? .white:.white.opacity(0.4)).lineLimit(2)
                        }.padding(16).frame(maxWidth:.infinity,alignment:.leading).background(.white.opacity(0.05),in:RoundedRectangle(cornerRadius:18))
                    }
                    Text("방향패드로 선택\nA / ✕로 결정\nMenu / Options로 일시정지").font(.system(size:23)).lineSpacing(12).foregroundStyle(.white.opacity(0.65))
                    if model.controllers.isEmpty { Text("Apple TV 설정 → 리모컨 및 기기 → Bluetooth에서 게임패드를 연결하세요.").font(.system(size:22)).foregroundStyle(Color(hex:"beef66")) }
                }.frame(width:geo.size.width*0.29)
            }.padding(.horizontal,80).padding(.vertical,60)
        }.background(LinearGradient(colors:[Color(hex:"0d2031"),Color(hex:"092b25"),Color(hex:"0b1726")],startPoint:.topLeading,endPoint:.bottomTrailing).ignoresSafeArea()).foregroundStyle(.white).ignoresSafeArea()
        .onAppear { focus=ready ? "start":"basic" }
        .confirmationDialog("시작할 맵",isPresented:$showMaps,titleVisibility:.visible) {
            Button("매 판 랜덤") { model.map = -1 }
            Button("빈 보드") { model.map = 0 }
            ForEach(1...4,id:\.self) { index in Button("맵 \(index)") { model.map=index } }
        }
        .sheet(isPresented:$showSettings) { TVSettings().environmentObject(model) }
    }
    var mapName:String { model.map == -1 ? "랜덤 맵" : model.map == 0 ? "빈 보드" : "맵 \(model.map)" }
    func label(_ text:String)->some View { Text(text).font(.system(size:22,weight:.semibold)).foregroundStyle(.white.opacity(0.55)) }
    func utility(_ id:String,title:String,icon:String,action:@escaping()->Void)->some View {
        Button(action:action) { Label(title,systemImage:icon).font(.system(size:24,weight:.semibold)).frame(maxWidth:.infinity,maxHeight:.infinity) }.buttonStyle(.plain).background(.white.opacity(0.08),in:RoundedRectangle(cornerRadius:16)).overlay(RoundedRectangle(cornerRadius:16).stroke(focus==id ? .white:.clear,lineWidth:4)).focused($focus,equals:id).focusEffectDisabled().scaleEffect(focus==id ? 1.03:1)
    }
    func tile(_ id:String,title:String,subtitle:String,icon:String,color:Color,selected:Bool,action:@escaping()->Void)->some View {
        Button(action:action) {
            VStack(alignment:.leading,spacing:12) {
                HStack { Image(systemName:icon).foregroundStyle(color);Spacer();if selected { Image(systemName:"checkmark.circle.fill").foregroundStyle(Color(hex:"beef66")) } }.font(.system(size:26))
                Text(title).font(.system(size:29,weight:.bold));Text(subtitle).font(.system(size:19)).foregroundStyle(.white.opacity(0.65)).lineLimit(1)
            }.padding(22).frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.leading)
        }.buttonStyle(.plain).background(selected ? color.opacity(0.16):.white.opacity(0.055),in:RoundedRectangle(cornerRadius:22)).overlay(RoundedRectangle(cornerRadius:22).stroke(focus==id ? .white : selected ? color.opacity(0.6):.white.opacity(0.12),lineWidth:focus==id ? 5:2)).focused($focus,equals:id).focusEffectDisabled().scaleEffect(focus==id ? 1.045:1).animation(.easeOut(duration:0.15),value:focus)
    }
}

struct TVSettings: View {
    @EnvironmentObject var model: BattleModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(alignment:.leading,spacing:28) {
            Text("조작 · 사운드").font(.system(size:46,weight:.bold))
            Text("DualSense  /  Xbox").font(.title3).foregroundStyle(.secondary)
            Text("방향패드·왼쪽 스틱: 이동 / 아래: 천천히 낙하\n✕ / A: 회전     ○ / B: 빠른 낙하\nL1 / LB: 홀드     Menu / Options: 일시정지\n아이템 1: □ / X     2: △ / Y     3: R1 / RB").font(.system(size:27)).lineSpacing(12)
            Toggle("배경 음악",isOn:$model.musicEnabled)
            Picker("반복 시작",selection:$model.repeatDelay) { Text("느리게").tag(0.30);Text("보통").tag(0.22);Text("빠르게").tag(0.12) }
            Picker("반복 간격",selection:$model.repeatInterval) { Text("느리게").tag(0.15);Text("보통").tag(0.10);Text("빠르게").tag(0.05) }
            Button("완료") { dismiss() }.buttonStyle(.borderedProminent)
        }.padding(60).frame(maxWidth:1100)
    }
}
#endif
