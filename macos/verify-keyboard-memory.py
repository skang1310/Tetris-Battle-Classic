from pathlib import Path
import subprocess,tempfile
source=Path('macos/DualKeyboard.swift').read_text().replace('private ','').replace('UserDefaults.standard','UserDefaults(suiteName: "TetrisKeyboardMemoryTest")!')
harness='''import AppKit
let app=NSApplication.shared
let prefs=UserDefaults(suiteName:"TetrisKeyboardMemoryTest")!
prefs.removePersistentDomain(forName:"TetrisKeyboardMemoryTest")
let first=DualKeyboard()
first.devices=["oldA":"A","oldB":"B"];first.fingerprints=["oldA":"hardware-A","oldB":"hardware-B"]
first.command(["command":"assign","player":0,"device":"oldA"])
first.command(["command":"assign","player":1,"device":"oldB"])
let second=DualKeyboard()
second.devices=["newA":"A","newB":"B"];second.fingerprints=["newA":"hardware-A","newB":"hardware-B"]
second.restoreSeats();assert(second.seats==["newA","newB"])
second.seats[1]=nil;second.devices.removeValue(forKey:"newB");second.restoreSeats();assert(second.seats==["newA",nil])
second.devices["backB"]="B";second.fingerprints["backB"]="hardware-B";second.restoreSeats();assert(second.seats==["newA","backB"])
second.devices["ambiguous"]="B";second.fingerprints["ambiguous"]="hardware-B";second.restoreSeats();assert(second.seats[1]==nil)
second.devices.removeValue(forKey:"ambiguous");second.restoreSeats();assert(second.seats[1]=="backB")
second.command(["command":"swap"]);let third=DualKeyboard();assert(third.savedSeats==["hardware-B","hardware-A"])
second.command(["command":"clearAll"]);let fourth=DualKeyboard();assert(fourth.savedSeats==["",""])
prefs.removePersistentDomain(forName:"TetrisKeyboardMemoryTest")
print("PASS saved assignments survive registry-ID changes/relaunch, reconnect restores seats, ambiguity is withheld, swap persists and clear forgets; simulated devices, no HID access")
'''
with tempfile.TemporaryDirectory() as d:
 p=Path(d);(p/'DualKeyboard.swift').write_text(source);(p/'main.swift').write_text(harness)
 subprocess.run(['swiftc',str(p/'DualKeyboard.swift'),str(p/'main.swift'),'-o',str(p/'check')],check=True)
 subprocess.run([str(p/'check')],check=True)
