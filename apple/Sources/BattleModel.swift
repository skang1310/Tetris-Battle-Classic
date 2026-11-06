import SwiftUI
import JavaScriptCore
import GameController
import UIKit
import AVFoundation

struct Cell: Decodable { let x: Int; let y: Int }
struct Preview: Decodable { let blocks: [Cell]; let color: String }
struct Player: Decodable {
    let score: Int; let activeType: String; let heldType: String?; let gameOver: Bool
    let grid: [[Int]]; let active: [Cell]; let color: String; let ghost: [Cell]
    let hold: [Cell]; let next: [Preview]; let lines: Int; let sent: Int
    let ko: Int; let receivedKO: Int; let combo: Int; let pending: Int; let items: [String]
}
struct BattleState: Decodable {
    let remaining: Double; let finished: Bool; let outcome: String
    let winner: Int?; let leader: Int?; let paused: Bool; let players: [Player]
}

@MainActor final class BattleModel: ObservableObject {
    @Published var state: BattleState?
    @Published var playing = false
    @Published var countdown = 0
    @Published var controllers: [String] = []
    @Published var error: String?
    @Published var mode = "battle2p"
    @Published var twoPlayer = false
    @Published var map = 0
    @Published var musicEnabled = UserDefaults.standard.object(forKey:"battleMusic") as? Bool ?? true { didSet { UserDefaults.standard.set(musicEnabled,forKey:"battleMusic"); if !musicEnabled { music?.pause() } } }
    @Published var repeatDelay = UserDefaults.standard.object(forKey:"battleDelay") as? Double ?? 0.22 { didSet { UserDefaults.standard.set(repeatDelay,forKey:"battleDelay") } }
    @Published var repeatInterval = UserDefaults.standard.object(forKey:"battleRepeat") as? Double ?? 0.10 { didSet { UserDefaults.standard.set(repeatInterval,forKey:"battleRepeat") } }
    private var music: AVAudioPlayer?
    private let context = JSContext()!
    private var timer: Timer?
    private var pads: [GCController?] = [nil, nil]
    private var pressed: [Set<String>] = [[], []]
    private var held: [String: Double] = [:]
    private var observers: [NSObjectProtocol] = []
    private var last = CACurrentMediaTime()
    private var countdownLeft = 0.0
    private var lastMap = -1
    init() {
        context.exceptionHandler = { [weak self] _, exception in
            self?.error = exception?.toString() ?? "게임 엔진 오류"
        }
        if let url = Bundle.main.url(forResource: "engine", withExtension: "js"), let source = try? String(contentsOf: url) {
            context.evaluateScript(source)
        } else { error = "게임 리소스를 불러올 수 없어요." }
        for name in [Notification.Name.GCControllerDidConnect, .GCControllerDidDisconnect] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.refreshControllers() }
            })
        }
        if let url = Bundle.main.url(forResource:"battle-music",withExtension:"mp3") {
            try? AVAudioSession.sharedInstance().setCategory(.ambient,mode:.default)
            music = try? AVAudioPlayer(contentsOf:url); music?.numberOfLoops = -1; music?.volume = 0.35
        }
        refreshControllers()
        #if DEBUG
        if CommandLine.arguments.contains("--smoke-gameplay") {
            if CommandLine.arguments.contains("--item") { mode = "item" }
            map = 1; start()
        }
        #endif
        timer = Timer.scheduledTimer(withTimeInterval: 1.0/60, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.frame() }
        }
    }
    private func call(_ name: String, _ args: [Any] = []) -> JSValue? {
        context.objectForKeyedSubscript("BattleEngine")?.invokeMethod(name, withArguments: args)
    }
    private func read(_ value: JSValue?) {
        guard let text = value?.toString(), let data = text.data(using: .utf8) else { return }
        do { state = try JSONDecoder().decode(BattleState.self, from: data) }
        catch { self.error = "게임 상태 오류: \(error.localizedDescription)" }
    }
    func refreshControllers() {
        let connected = GCController.controllers().filter { $0.extendedGamepad != nil }
        let removed = pads.compactMap { $0 }.contains { old in !connected.contains(where: { $0 === old }) }
        for i in 0..<2 {
            if let old = pads[i], !connected.contains(where: { $0 === old }) { pads[i] = nil }
        }
        for pad in connected where !pads.contains(where: { $0 === pad }) {
            if let empty = pads.firstIndex(where: { $0 == nil }) { pads[empty] = pad }
        }
        controllers = pads.enumerated().compactMap { i,pad in pad.map { "\(i+1)P · \($0.vendorName ?? "Gamepad")" } }
        for (i,pad) in pads.enumerated() {
            pad?.playerIndex = i == 0 ? .index1 : .index2
        }
        print("[BattleInput] connected: \(controllers.joined(separator: "; "))")
        saveInputDiagnostics("controllers refreshed")
        pressed = [[], []]; held.removeAll()
        if removed && playing { setPaused(true) }
    }
    func start() {
        guard !twoPlayer || pads.compactMap({$0}).count >= 2 else { error = "2P 대전은 게임패드 두 개를 연결해 주세요."; return }
        error = nil
        var chosen = map
        if twoPlayer || map == -1 {
            var maps = Array(0...4).filter { $0 != lastMap }
            maps.shuffle(); chosen = maps[0]; lastMap = chosen
        }
        read(call("start", [mode, !twoPlayer, chosen]))
        UIApplication.shared.isIdleTimerDisabled = true
        music?.stop(); music?.currentTime = 0
        playing = true; countdownLeft = 3; countdown = 3
        pressed = [[], []]; held.removeAll(); last = CACurrentMediaTime()
    }
    func setPaused(_ pause: Bool) { guard playing else { return }; read(call("pause", [pause])); held.removeAll(); UIApplication.shared.isIdleTimerDisabled = !pause; if pause { music?.pause() } else if musicEnabled && countdown==0 { music?.play() } }
    func leave() { music?.stop(); UIApplication.shared.isIdleTimerDisabled = false; playing = false; held.removeAll(); pressed = [[], []] }
    func action(_ seat: Int, _ action: String) {
        guard playing, countdown == 0, state?.paused == false, state?.finished == false else { return }
        _ = call("action", [seat, action]); read(call("snapshot"))
    }
    private func input(_ seat: Int, _ action: String, _ down: Bool, _ dt: Double) {
        let key = "\(seat):\(action)"
        let was = pressed[seat].contains(action)
        if down {
            pressed[seat].insert(action)
            if !was {
                print("[BattleInput] seat=\(seat+1) action=\(action) playing=\(playing) countdown=\(countdown) paused=\(state?.paused ?? false)")
                saveInputDiagnostics("\(seat+1)P \(action)")
                if action == "menu" {
                    if !playing { start() }
                    else if state?.finished == true { start() }
                    else { setPaused(!(state?.paused ?? false)) }
                }
                else { self.action(seat, action) }
                held[key] = 0
            } else if ["left", "right", "down"].contains(action), state?.paused == false, countdown == 0 {
                let previous = held[key] ?? 0; let now = previous + dt
                let delay = action == "down" ? 0.04 : repeatDelay
                let interval = action == "down" ? 0.035 : repeatInterval
                if now >= delay && (previous < delay || Int((now-delay)/interval) > Int(max(0,previous-delay)/interval)) { self.action(seat, action) }
                held[key] = now
            }
        } else { pressed[seat].remove(action); held.removeValue(forKey: key) }
    }
    private func saveInputDiagnostics(_ input: String) {
        let folder=FileManager.default.urls(for:.cachesDirectory,in:.userDomainMask)[0]
        try? FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
        let value:[String:Any] = ["time":ISO8601DateFormatter().string(from:Date()),"controllers":controllers,"lastInput":input,"playing":playing,"countdown":countdown,"paused":state?.paused ?? false]
        if let data=try? JSONSerialization.data(withJSONObject:value,options:.prettyPrinted) {
            try? data.write(to:folder.appendingPathComponent("input-diagnostics.json"),options:.atomic)
        }
    }
    private func frame() {
        let now = CACurrentMediaTime(); let dt = min(0.05, max(0,now-last)); last = now
        for (seat,pad) in pads.prefix(2).enumerated() {
            guard let p = pad?.extendedGamepad else { continue }
            let x = abs(p.dpad.xAxis.value) > 0.5 ? p.dpad.xAxis.value : p.leftThumbstick.xAxis.value
            let y = abs(p.dpad.yAxis.value) > 0.5 ? p.dpad.yAxis.value : p.leftThumbstick.yAxis.value
            let values: [(String,Bool)] = [("left",x < -0.55),("right",x > 0.55),("down",y < -0.55),("rotate",p.buttonA.isPressed),("drop",p.buttonB.isPressed),("hold",p.leftShoulder.isPressed),("item1",p.buttonX.isPressed),("item2",p.buttonY.isPressed),("item3",p.rightShoulder.isPressed),("menu",p.buttonMenu.isPressed)]
            for (action,down) in values { input(seat,action,down,dt) }
        }
        guard playing, state?.paused == false, state?.finished == false else { return }
        if countdownLeft > 0 {
            countdownLeft = max(0,countdownLeft-dt); countdown = Int(ceil(countdownLeft)); return
        }
        if musicEnabled && music?.isPlaying == false { music?.play() }
        read(call("tick", [dt*1000]))
        if state?.finished == true { music?.pause(); UIApplication.shared.isIdleTimerDisabled = false }
    }
}
