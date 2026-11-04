#!/usr/bin/env python3
"""Exercise production native registration commands with seeded device IDs.
Only the temporary test copy relaxes Swift private visibility; no HID permission is requested.
"""
from pathlib import Path
import subprocess,tempfile
root=Path(__file__).resolve().parent
harness='import AppKit\nlet app=NSApplication.shared\nlet keyboard=DualKeyboard()\nvar messages=[[String:Any]]()\nkeyboard.send={messages.append($0)}\nfunc seed(){keyboard.enabled=true;keyboard.capture=true;keyboard.learning=nil;keyboard.seats=["a","b"];keyboard.down=["a:79"];messages=[]}\nseed();keyboard.command(["command":"clear","player":0]);assert(keyboard.seats[0]==nil&&keyboard.seats[1]=="b");assert(!keyboard.capture&&keyboard.down.isEmpty&&keyboard.learning==nil);assert(messages.contains{($0["type"] as? String)=="reset"})\nseed();keyboard.command(["command":"clear","player":1]);assert(keyboard.seats[0]=="a"&&keyboard.seats[1]==nil)\nseed();keyboard.command(["command":"learn","player":0]);assert(keyboard.learning==0&&keyboard.seats[0]=="a" && !keyboard.capture);keyboard.command(["command":"cancel"]);assert(keyboard.learning==nil&&keyboard.seats==["a","b"])\nseed();keyboard.command(["command":"swap"]);assert(keyboard.seats==["b","a"] && !keyboard.capture&&keyboard.down.isEmpty)\nseed();keyboard.learning=1;keyboard.command(["command":"clearAll"]);assert(keyboard.seats.allSatisfy{$0==nil}&&keyboard.learning==nil && !keyboard.capture&&keyboard.down.isEmpty)\nseed();keyboard.command(["command":"clear","player":5]);assert(keyboard.seats==["a","b"]&&keyboard.capture)\nprint("PASS: native clear per-seat preserves the other, clear-all, swap, learning cancellation preserves assignments, held-key reset, invalid seat rejected. No physical input permission requested.")\n'
with tempfile.TemporaryDirectory(prefix='tetris-keyboard-commands-') as folder:
    work=Path(folder)
    (work/'DualKeyboard.swift').write_text((root/'DualKeyboard.swift').read_text().replace('private ','').replace('UserDefaults.standard', 'UserDefaults(suiteName: "TetrisKeyboardCommandTest")!'))
    (work/'main.swift').write_text(harness)
    # Exercise the production permission state machine with deterministic OS/HID results.
    source=(root/'DualKeyboard.swift').read_text().replace('private ','').replace('UserDefaults.standard', 'UserDefaults(suiteName: "TetrisKeyboardCommandTest")!')
    source=source.replace('IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)', 'testAccess')
    source=source.replace('IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)', 'true')
    begin=source.index('    func start() -> Bool {')
    end=source.index('    func input(',begin)
    source=source[:begin]+'    func start() -> Bool { attempts += 1; return testOpen }\n'+source[end:]
    lifecycle='''import AppKit
var testAccess = kIOHIDAccessTypeDenied
var testOpen = false
var attempts = 0
let app = NSApplication.shared
let k = DualKeyboard()
k.command(["command":"enable"])
assert(!k.enabled && k.requested && attempts == 1)
k.command(["command":"refresh"])
assert(!k.enabled && attempts == 2)
testOpen = true
k.command(["command":"refresh"])
assert(k.enabled && attempts == 3)
k.devices=["a":"Keyboard A","b":"Keyboard B"]
k.enabled=false
k.command(["command":"assign","player":0,"device":"a"])
assert(k.seats[0]=="a")
k.command(["command":"assign","player":1,"device":"a"])
assert(k.seats[1]==nil)
k.command(["command":"assign","player":1,"device":"b"])
assert(k.seats==["a","b"])
k.command(["command":"assign","player":0,"device":"missing"])
assert(k.seats==["a","b"])
k.command(["command":"disable"])
assert(!k.requested && !k.enabled)
print("PASS: open attempted despite stale denied preflight, failed-open retry, OS-open success accepted, direct assignment while input unavailable, duplicate/unknown device rejected, explicit disable. OS/HID simulated.")
'''
    (work/'Lifecycle.swift').write_text(source)
    (work/'lifecycle-main.txt').write_text(lifecycle)
    subprocess.run(['swiftc',str(work/'DualKeyboard.swift'),str(work/'main.swift'),'-o',str(work/'check')],check=True,timeout=60)
    subprocess.run([str(work/'check')],check=True,timeout=15)

    (work/'main.swift').write_text(lifecycle)
    subprocess.run(['swiftc',str(work/'Lifecycle.swift'),str(work/'main.swift'),'-o',str(work/'lifecycle')],check=True,timeout=60)
    subprocess.run([str(work/'lifecycle')],check=True,timeout=15)
