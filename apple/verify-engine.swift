// Executes the shipped JS bundle inside Apple's JavaScriptCore, without a browser.
import Foundation
import JavaScriptCore
let context = JSContext()!
var failures = 0
context.exceptionHandler = { _, value in print("JS ERROR: \(value?.toString() ?? "unknown")"); failures += 1 }
context.evaluateScript(try String(contentsOfFile: CommandLine.arguments[1],encoding:.utf8))
let engine = context.objectForKeyedSubscript("BattleEngine")!
func call(_ name:String,_ args:[Any]=[]) -> JSValue { engine.invokeMethod(name,withArguments:args)! }
func state()->[String:Any] { let text=call("snapshot").toString()!; return try! JSONSerialization.jsonObject(with:Data(text.utf8)) as! [String:Any] }
func players()->[[String:Any]] { state()["players"] as! [[String:Any]] }
func check(_ value:Bool,_ message:String) { if !value { print("FAIL: \(message)"); failures += 1 } }
for mode in ["battle2p","speed","item"] {
    _ = call("start",[mode,false,0])
    let before=players()
    check((before[0]["active"] as! [[String:Int]]) == (before[1]["active"] as! [[String:Int]]),"same initial pieces")
    let x=(before[0]["active"] as! [[String:Int]])[0]["x"]!
    _ = call("action",[0,"left"])
    check((players()[0]["active"] as! [[String:Int]])[0]["x"] == x-1,"1P movement")
    check((players()[1]["active"] as! [[String:Int]])[0]["x"] == x,"independent seats")
    _ = call("action",[1,"right"])
    check((players()[1]["active"] as! [[String:Int]])[0]["x"] == x+1,"2P movement")
    _ = call("action",[0,"rotate"])
    _ = call("action",[0,"down"])
    _ = call("action",[0,"hold"])
    check(!(players()[0]["hold"] as! [Any]).isEmpty,"hold")
    _ = call("action",[0,"drop"])
    check((players()[0]["grid"] as! [[Int]]).flatMap{$0}.contains(where:{$0>0}),"hard drop locks")
    _ = call("tick",[1000])
    check(state()["remaining"] as! Int == 119000,"time advances")
    _ = call("pause",[true]); let paused=call("snapshot").toString()!
    _ = call("tick",[1000]); _ = call("action",[0,"drop"])
    check(call("snapshot").toString()==paused,"pause freezes actions and engine")
    _ = call("pause",[false])
    if mode == "item" {
        _ = call("action",[0,"item1"])
        check((players()[0]["items"] as! [String]).count == 1,"item consumed")
        check(players()[1]["pending"] as! Int == 3,"item attack delivered")
    }
    _ = call("tick",[120000])
    check(state()["finished"] as! Bool,"match ends")
    check(state()["winner"] is Int,"winner resolved")
}
_ = call("start",["battle2p",true,1]);let before=call("snapshot").toString()!
_ = call("action",[1,"drop"])
check(call("snapshot").toString()==before,"CPU cannot be controlled by second pad")
for _ in 0..<120 { _ = call("tick",[100]) }
check((players()[1]["grid"] as! [[Int]]).flatMap{$0}.contains(where:{$0>0}),"CPU plays")
check(failures==0,"native JavaScriptCore contract")
if failures>0 { exit(1) }
print("PASS: three modes, separate seats, shared pieces, movement, rotation, hold/drop, items, pause, timer, results, CPU")
