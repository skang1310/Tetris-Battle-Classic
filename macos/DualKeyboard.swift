import AppKit
import IOKit.hid

// Non-exclusive HID observation. Only game usages in the active game window are forwarded.
final class DualKeyboard {
    var send: ([String: Any]) -> Void = { _ in }
    private var manager: IOHIDManager?
    private var devices: [String: String] = [:]
    private var seats: [String?] = [nil, nil]
    private var fingerprints: [String: String] = [:]
    private var savedSeats = UserDefaults.standard.stringArray(forKey: "TetrisKeyboardSeatsV1") ?? ["", ""]
    private var learning: Int?
    private var enabled = false
    private var requested = false
    private var permissionTimer: Timer?
    private var capture = false
    private var monitor: Any?
    private var down = Set<String>()
    private var note = "키보드를 두 개 연결한 뒤 등록해 주세요."
    private let keys: [Int: String] = [89:"1",90:"2",91:"3",40:"Enter",88:"Enter",4:"a",7:"d",22:"s",26:"w",20:"q",8:"e",30:"1",31:"2",32:"3",79:"ArrowRight",80:"ArrowLeft",81:"ArrowDown",82:"ArrowUp",44:" ",6:"c",27:"x",29:"z",225:"Shift",229:"Shift",25:"v",5:"b",17:"n"]

    init() {
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp]) { [weak self] event in
            guard let self = self, NSApp.isActive, NSApp.keyWindow != nil,
                  self.enabled, self.capture || self.learning != nil,
                  !event.modifierFlags.contains(.command), !event.modifierFlags.contains(.option) else { return event }
            let codes: Set<UInt16> = [83,84,85,36,76,0,2,1,13,12,14,123,124,125,126,49,8,7,6,56,60,9,11,45,18,19,20]
            return codes.contains(event.keyCode) ? nil : event
        }
    }
    private func id(_ device: IOHIDDevice) -> String {
        var value: UInt64 = 0
        IORegistryEntryGetRegistryEntryID(IOHIDDeviceGetService(device), &value)
        return String(value)
    }
    private func fingerprint(_ device: IOHIDDevice) -> String {
        // Registry IDs are ephemeral; use hardware identity and interface details instead.
        let fields = [kIOHIDVendorIDKey, kIOHIDProductIDKey, kIOHIDSerialNumberKey, kIOHIDLocationIDKey, kIOHIDTransportKey, kIOHIDProductKey, kIOHIDPrimaryUsagePageKey, kIOHIDPrimaryUsageKey, "bInterfaceNumber", "ReportDescriptor", "PhysicalDeviceUniqueID"]
        return fields.map { String(describing: IOHIDDeviceGetProperty(device, $0 as CFString) ?? "" as CFString) }.joined(separator: "|")
    }
    private func saveSeats() {
        savedSeats = seats.enumerated().map { i, key in key.flatMap { fingerprints[$0] } ?? (savedSeats.indices.contains(i) ? savedSeats[i] : "") }
        UserDefaults.standard.set(savedSeats, forKey: "TetrisKeyboardSeatsV1")
    }
    private func restoreSeats() {
        guard savedSeats.count == 2 else { return }
        for i in 0...1 where !savedSeats[i].isEmpty {
            if devices.keys.filter({ fingerprints[$0] == savedSeats[i] }).count > 1 {
                seats[i] = nil; capture = false; note = "동일한 키보드 정보가 여러 개여서 자동 배정을 보류했어요. Space로 다시 등록해 주세요."
            }
        }
        for i in 0...1 where seats[i] == nil && !savedSeats[i].isEmpty {
            let matches = devices.keys.filter { fingerprints[$0] == savedSeats[i] }
            if matches.count == 1, let match = matches.first, seats[1-i] != match {
                seats[i] = match; note = "저장한 \(i+1)P 키보드를 자동으로 연결했습니다."
            }
        }
    }
    private func publish() {
        send(["type":"status", "enabled":enabled,
              "permission":enabled || IOHIDCheckAccess(kIOHIDRequestTypeListenEvent) == kIOHIDAccessTypeGranted,
              "devices":devices.sorted{$0.key < $1.key}.map{["id":$0.key,"name":$0.value]},
              "seats":seats.map{$0 as Any? ?? NSNull()}, "learning":learning as Any? ?? NSNull(), "note":note])
    }
    private func reset() { down.removeAll(); send(["type":"reset"]) }
    func command(_ body: [String: Any]) {
        switch body["command"] as? String {
        case "enable":
            requested = true
            _ = IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)
            refreshAccess()
            if permissionTimer == nil {
                permissionTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                    guard let self = self, self.requested, NSApp.isActive else { return }
                    let granted = IOHIDCheckAccess(kIOHIDRequestTypeListenEvent) == kIOHIDAccessTypeGranted
                    if !self.enabled || !granted { self.refreshAccess(); self.publish() }
                }
            }
        case "refresh":
            refreshAccess()
        case "learn":
            guard let seat = body["player"] as? Int, (0...1).contains(seat) else { publish(); return }
            if !enabled { command(["command":"enable"]) }
            reset(); capture=false; learning=seat;note="\(seat+1)P가 사용할 키보드에서 Space를 눌러 주세요."
        case "assign":
            guard let seat=body["player"] as? Int,(0...1).contains(seat),
                  let device=body["device"] as? String,devices[device] != nil else { publish(); return }
            guard seats[1-seat] != device else {note="다른 플레이어에게 등록된 키보드입니다.";publish();return}
            capture=false;learning=nil;reset();seats[seat]=device;saveSeats()
            note="\(seat+1)P 키보드를 선택했습니다." + (enabled ? "" : " 입력 연결은 연결 상태 새로고침으로 다시 시도할 수 있어요.")
        case "clear":
            guard let seat = body["player"] as? Int, (0...1).contains(seat) else { return }
            capture=false;learning=nil;seats[seat]=nil;if savedSeats.indices.contains(seat) { savedSeats[seat]="" };saveSeats();reset();note="\(seat+1)P 키보드 등록을 해제했습니다. 다른 키보드를 등록할 수 있어요."
        case "clearAll":
            capture=false;learning=nil;seats=[nil,nil];savedSeats=["",""];saveSeats();reset();note="1P·2P 키보드 등록을 모두 해제했습니다. 다시 등록해 주세요."
        case "swap":
            guard seats.allSatisfy({$0 != nil}), seats[0] != seats[1] else { return }
            capture=false;learning=nil;seats.swapAt(0,1);saveSeats();reset();note="1P와 2P 키보드를 서로 바꿨습니다."
        case "cancel": learning=nil; reset();note="재등록을 취소했습니다. 기존 키보드 등록은 유지됩니다."
        case "capture":
            capture = (body["enabled"] as? Bool == true) && enabled && seats.allSatisfy{$0 != nil} && learning == nil
            if !capture { reset() }
            return
        case "disable":requested=false;stop();enabled=false;capture=false;learning=nil;reset();note="기존 한 키보드 조작을 사용합니다."
        case "settings": NSWorkspace.shared.open(URL(string:"x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent")!)
        default: break
        }
        publish()
    }
    private func stop() {
        capture=false;learning=nil;reset()
        if let m=manager {
            IOHIDManagerUnscheduleFromRunLoop(m,CFRunLoopGetMain(),CFRunLoopMode.commonModes.rawValue)
            IOHIDManagerClose(m,0)
        }
        manager=nil;devices.removeAll();fingerprints.removeAll();seats=[nil,nil]
    }
    private func refreshAccess() {
        // The actual OS-protected open is authoritative. A stale preflight result must
        // not prevent device discovery or retry after the user has already approved us.
        if manager == nil {
            enabled=start()
            if enabled { note="연결된 키보드를 목록에서 선택하거나 Space로 등록해 주세요." }
        }
    }
    private func start() -> Bool {
        let m=IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone));manager=m
        IOHIDManagerSetDeviceMatching(m,[kIOHIDDeviceUsagePageKey:kHIDPage_GenericDesktop,kIOHIDDeviceUsageKey:kHIDUsage_GD_Keyboard] as CFDictionary)
        let context=Unmanaged.passUnretained(self).toOpaque()
        IOHIDManagerRegisterDeviceMatchingCallback(m,{context,_,_,device in
            guard let context=context else{return};let owner=Unmanaged<DualKeyboard>.fromOpaque(context).takeUnretainedValue()
            let key=owner.id(device);let product=IOHIDDeviceGetProperty(device,kIOHIDProductKey as CFString) as? String ?? "Keyboard"
            owner.devices[key]="\(product) · \(key.suffix(4))";owner.fingerprints[key]=owner.fingerprint(device);owner.restoreSeats();owner.publish()
        },context)
        IOHIDManagerRegisterDeviceRemovalCallback(m,{context,_,_,device in
            guard let context=context else{return};let owner=Unmanaged<DualKeyboard>.fromOpaque(context).takeUnretainedValue(),key=owner.id(device)
            owner.devices.removeValue(forKey:key);owner.fingerprints.removeValue(forKey:key)
            if owner.seats.contains(where:{$0==key}) {owner.seats=owner.seats.map{$0==key ? nil:$0};owner.capture=false;owner.reset();owner.note="키보드가 분리되어 일시정지했습니다. 다시 연결하면 자동 배정을 시도합니다."}
            owner.publish()
        },context)
        IOHIDManagerRegisterInputValueCallback(m,{context,_,_,value in
            guard let context=context else{return};Unmanaged<DualKeyboard>.fromOpaque(context).takeUnretainedValue().input(value)
        },context)
        IOHIDManagerScheduleWithRunLoop(m,CFRunLoopGetMain(),CFRunLoopMode.commonModes.rawValue)
        let result=IOHIDManagerOpen(m,IOOptionBits(kIOHIDOptionsTypeNone))
        if let connected=IOHIDManagerCopyDevices(m) as? Set<IOHIDDevice> {
            for device in connected {
                let key=id(device)
                let product=IOHIDDeviceGetProperty(device,kIOHIDProductKey as CFString) as? String ?? "Keyboard"
                devices[key]="\(product) · \(key.suffix(4))";fingerprints[key]=fingerprint(device)
            }
        }
        restoreSeats()
        if result != kIOReturnSuccess {
            IOHIDManagerUnscheduleFromRunLoop(m,CFRunLoopGetMain(),CFRunLoopMode.commonModes.rawValue)
            IOHIDManagerClose(m,0);manager=nil;capture=false;reset()
            note="키보드 입력 연결 실패 (\(result)). 목록에서 등록은 가능합니다. 권한이 이미 켜져 있다면 시스템 설정에서 이 앱을 껐다 켠 뒤 앱을 다시 열어 주세요."
            return false
        }
        return true
    }
    private func input(_ value: IOHIDValue) {
        guard enabled,NSApp.isActive,NSApp.keyWindow != nil else {return}
        let element=IOHIDValueGetElement(value)
        guard IOHIDElementGetUsagePage(element)==kHIDPage_KeyboardOrKeypad,
              let key=keys[Int(IOHIDElementGetUsage(element))] else{return}
        let device=id(IOHIDElementGetDevice(element)),pressed=IOHIDValueGetIntegerValue(value) != 0
        let token="\(device):\(IOHIDElementGetUsage(element))"
        if !pressed {down.remove(token)}
        else if !down.insert(token).inserted {return}
        if let seat=learning {
            guard pressed,key==" " else{return}
            guard seats[1-seat] != device else {note="다른 플레이어의 키보드입니다. 다른 키보드에서 Space를 눌러 주세요.";publish();return}
            seats[seat]=device;saveSeats();learning=nil;reset();note="\(seat+1)P 키보드가 등록됐습니다.";publish();return
        }
        guard capture,let seat=seats.firstIndex(where:{$0==device}) else{return}
        send(["type":"key","player":seat,"key":key,"down":pressed])
    }
    func blur() { reset() }
    deinit {
        permissionTimer?.invalidate()
        if let monitor=monitor {NSEvent.removeMonitor(monitor)}
        if let manager=manager {IOHIDManagerUnscheduleFromRunLoop(manager,CFRunLoopGetMain(),CFRunLoopMode.commonModes.rawValue);IOHIDManagerClose(manager,0)}
    }
}
