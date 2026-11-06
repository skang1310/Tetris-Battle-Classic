import SwiftUI
import UIKit

/// Original Mac artwork and the same 800 × 600 board/sprite coordinates.
struct ClassicCanvas: View {
    let state: BattleState
    let mode: String
    let cpu: Bool
    var widescreen = false
    static let art: [String:UIImage] = {
        var result: [String:UIImage] = [:]
        for key in ["battle","ghost","G","win","lose","I","O","T","S","Z","J","L"] + (0...9).map({"n\($0)"}) {
            if let url=Bundle.main.url(forResource:key,withExtension:"png"),let image=UIImage(contentsOfFile:url.path) { result[key]=image }
        }
        return result
    }()
    static let pieces=["I","O","T","S","Z","J","L"]
    var body: some View {
        Canvas { context,size in
            context.withCGContext { cg in
                let scale = size.height / (widescreen ? 470 : 600)
                let logicalWidth = widescreen ? size.width/scale : 800
                let rightShift = logicalWidth-800
                cg.scaleBy(x:widescreen ? scale : size.width/800,y:scale)
                if widescreen { cg.translateBy(x:0,y:-80) }
                UIGraphicsPushContext(cg)
                defer { UIGraphicsPopContext() }
                func image(_ key:String,_ x:Double,_ y:Double,_ w:Double,_ h:Double) { Self.art[key]?.draw(in:CGRect(x:x,y:y,width:w,height:h)) }
                func text(_ value:String,_ x:Double,_ y:Double,_ size:Double,_ color:UIColor = .white,_ outline:UIColor? = nil) {
                    let font=UIFont(name:"Arial-BoldMT",size:size) ?? .boldSystemFont(ofSize:size)
                    var attrs:[NSAttributedString.Key:Any]=[.font:font,.foregroundColor:color]
                    if let outline { attrs[.strokeColor]=outline;attrs[.strokeWidth] = -3 }
                    let string=value as NSString; let width=string.size(withAttributes:attrs).width
                    string.draw(at:CGPoint(x:x-width/2,y:y-font.ascender),withAttributes:attrs)
                }
                func fill(_ rect:CGRect,_ color:UIColor) { cg.setFillColor(color.cgColor);cg.fill(rect) }
                func preview(_ blocks:[Cell],_ key:String,_ cx:Double,_ cy:Double,_ cell:Double) {
                    guard let minX=blocks.map(\.x).min(),let maxX=blocks.map(\.x).max(),let minY=blocks.map(\.y).min(),let maxY=blocks.map(\.y).max() else { return }
                    for b in blocks { image(key,cx+(Double(b.x-minX)-Double(maxX-minX+1)/2)*cell,cy+(Double(b.y-minY)-Double(maxY-minY+1)/2)*cell,cell,cell) }
                }
                if widescreen {
                    fill(CGRect(x:0,y:80,width:logicalWidth,height:470),UIColor(red:0.67,green:0.9,blue:0.34,alpha:1))
                    cg.saveGState();cg.clip(to:CGRect(x:17,y:80,width:383,height:448));image("battle",0,0,800,600);cg.restoreGState()
                    cg.saveGState();cg.clip(to:CGRect(x:logicalWidth-400,y:80,width:383,height:448));image("battle",rightShift,0,800,600);cg.restoreGState()
                    if rightShift>0,let crop=Self.art["battle"]?.cgImage?.cropping(to:CGRect(x:394,y:80,width:12,height:448)) {
                        UIImage(cgImage:crop).draw(in:CGRect(x:400,y:80,width:rightShift,height:448))
                    }
                } else { image("battle",0,0,800,600) }
                if !widescreen {
                fill(CGRect(x:0,y:0,width:800,height:24),UIColor(red:0.87,green:0.95,blue:1,alpha:1))
                text("TETRIS BATTLE",110,16,11,UIColor.darkGray)
                text("CONTROLLER · LOCAL PLAY",400,16,11,UIColor.darkGray)
                text(mode == "item" ? "ITEM BATTLE" : mode == "speed" ? "SPEED BATTLE" : "BATTLE 2P",660,16,11,UIColor.darkGray)
                }
                let seconds=max(0,Int(state.remaining/1000))
                text(String(format:"%d:%02d",seconds/60,seconds%60),logicalWidth/2,widescreen ? 126:69,28,UIColor(red:1,green:0.8,blue:0.2,alpha:1),.black)
                text("TIME",logicalWidth/2,widescreen ? 100:42,9,.darkGray)
                for (i,p) in state.players.enumerated() {
                    let sx=(i==0 ? 112.0:495.0+rightShift),sy=138.0
                    text(i==0 ? "1P" : cpu ? "CPU" : "2P",sx+90,widescreen ? 122:88,widescreen ? 17:15,.white,.black)
                    if !widescreen { text("LOCAL BATTLE · ★ ★ ★ ★ ★",sx+90,106,9,.white,.black) }
                    for y in 0..<20 { for x in 0..<10 {
                        let value=p.grid[y][x]
                        if value>0 { let key=value>=11 ? "O" : value>=8 ? "G" : Self.pieces[value-1]; image(key,sx+Double(x)*18,sy+Double(y)*18,18,18) }
                        if value==9 { text("☢",sx+Double(x)*18+9,sy+Double(y)*18+14,15,.yellow) }
                        if value==10 { fill(CGRect(x:sx+Double(x)*18+2,y:sy+Double(y)*18+2,width:14,height:14),.gray) }
                        if value>=11 { let icons=["🚀","🛡️","🧹","🫧","🎁"]; fill(CGRect(x:sx+Double(x)*18+2,y:sy+Double(y)*18+2,width:14,height:14),.black);text(icons[min(value-11,4)],sx+Double(x)*18+9,sy+Double(y)*18+14,12) }
                    }}
                    if !p.gameOver {
                        for b in p.ghost where b.y>=0 { image("ghost",sx+Double(b.x)*18,sy+Double(b.y)*18,18,18) }
                        for b in p.active where b.y>=0 { image(p.activeType,sx+Double(b.x)*18,sy+Double(b.y)*18,18,18) }
                    }
                    if let key=p.heldType { preview(p.hold,key,sx-46,186,12) }
                    for (j,next) in p.next.prefix(5).enumerated() {
                        let key=Self.pieces.first(where:{ Self.colors[$0]==next.color }) ?? "I"
                        preview(next.blocks,key,sx+233,[185.0,252,307,359,411][j],j==0 ? 12:8)
                    }
                    for (j,digit) in String(p.sent).enumerated() { image("n\(digit)",sx-57+Double(j)*27,379,29,29) }
                    text("KO",sx-46,267,19,.white,.black)
                    cg.setFillColor(UIColor.black.cgColor);cg.fillEllipse(in:CGRect(x:sx-67,y:270,width:42,height:42))
                    cg.setFillColor(UIColor.white.cgColor);cg.fillEllipse(in:CGRect(x:sx-64,y:273,width:36,height:36))
                    cg.setFillColor(UIColor.systemRed.cgColor);cg.fillEllipse(in:CGRect(x:sx-61,y:276,width:30,height:30))
                    text("\(p.receivedKO)",sx-46,300,25,.white,.black)
                    text("당한 횟수",sx-46,326,10,.white,.black)
                    if widescreen && mode == "item" {
                        let buttons=["□ / X","△ / Y","R1/RB"]
                        for slot in 0..<3 {
                            let y=432.0+Double(slot)*30
                            fill(CGRect(x:sx-71,y:y-12,width:50,height:27),UIColor(white:0.08,alpha:0.9))
                            text(slot<p.items.count ? p.items[slot]:"—",sx-57,y+7,17)
                            text(buttons[slot],sx-33,y+4,7,.white)
                        }
                    } else if widescreen && mode == "speed" {
                        text("SPEED",sx-46,441,11,.black)
                        text("Lv \(1+Int((120000-state.remaining)/15000))",sx-46,464,19,.black)
                    } else { text("지운 줄 \(p.lines)",sx-46,450,10,UIColor(red:0.1,green:0.3,blue:0.1,alpha:1)) }
                    text(widescreen ? "지운 줄 \(p.lines) · 획득 \(p.ko) KO" : "\(p.score)점 · 획득 \(p.ko) KO",sx+90,widescreen ? 520:535,12,widescreen ? .white:UIColor(red:0.1,green:0.3,blue:0,alpha:1),widescreen ? .black:nil)
                    if p.combo>0 { text("\(p.combo) COMBO!",sx+90,widescreen ? 537:557,15,.yellow,.black) }
                    if p.pending>0 { fill(CGRect(x:sx+187,y:498-Double(min(20,p.pending))*18,width:4,height:Double(min(20,p.pending))*18),.systemRed) }
                    if state.finished && state.winner != -1 { image(state.winner==i ? "win":"lose",sx+5,265,170,60) }
                }
            }
        }.aspectRatio(widescreen ? 16.0/9.0 : 4.0/3.0,contentMode:.fit).accessibilityLabel("원작 Tetris Battle 게임 화면")
    }
    static let colors=["I":"#00f0f0","O":"#f0f000","T":"#a000f0","S":"#00f000","Z":"#f00000","J":"#0000f0","L":"#f0a000"]
}
