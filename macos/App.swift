import AppKit
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    var server: Process?
    var attempts = 0
    let token = UUID().uuidString
    var timer: Timer?
    let dualKeyboard = DualKeyboard()
    var sharePicker: NSSharingServicePicker?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let running = NSRunningApplication.runningApplications(withBundleIdentifier: "local.tetris.battle")
        if let other = running.first(where: { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }) {
            other.activate(options: [.activateAllWindows]); NSApp.terminate(nil); return
        }
        if let icon = Bundle.main.path(forResource: "AppIcon", ofType: "icns"), let image = NSImage(contentsOfFile: icon) { NSApp.applicationIconImage = image }
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Tetris Battle", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Tetris Battle", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let mainMenu = NSMenu(); let item = NSMenuItem(); item.submenu = appMenu; mainMenu.addItem(item)
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Reload", action: #selector(reload), keyEquivalent: "r")
        viewMenu.addItem(withTitle: "Enter Full Screen", action: #selector(fullscreen), keyEquivalent: "f")
        let viewItem = NSMenuItem(title: "View", action: nil, keyEquivalent: ""); viewItem.submenu = viewMenu; mainMenu.addItem(viewItem)
        NSApp.mainMenu = mainMenu
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1160, height: 860), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Tetris Battle"; window.minSize = NSSize(width: 700, height: 650); window.center()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "desktop")
        configuration.preferences.setValue(true, forKey: "fullScreenEnabled")
        web = WKWebView(frame: .zero, configuration: configuration)
        dualKeyboard.send = { [weak self] payload in
            guard let self=self, self.web.url?.host == "127.0.0.1", let data=try? JSONSerialization.data(withJSONObject:payload), let json=String(data:data,encoding:.utf8) else {return}
            self.web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('native-keyboards',{detail:\(json)}))",completionHandler:nil)
        }
        web.navigationDelegate = self
        window.contentView = web; window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        guard let path = Bundle.main.path(forResource: "tetris-server", ofType: nil) else { fail("The bundled game server is missing."); return }
        let process = Process(); process.executableURL = URL(fileURLWithPath: path)
        var env = ProcessInfo.processInfo.environment
        env["TETRIS_PARENT_PID"] = String(ProcessInfo.processInfo.processIdentifier)
        env["TETRIS_LAUNCH_TOKEN"] = token; process.environment = env
        let logDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/Tetris Battle")
        try? FileManager.default.createDirectory(at: logDir, withIntermediateDirectories: true)
        let logPath = logDir.appendingPathComponent("server.log").path
        FileManager.default.createFile(atPath: logPath, contents: nil)
        let handle = FileHandle(forWritingAtPath: logPath)
        process.standardOutput = handle; process.standardError = handle
        do { try process.run(); server = process } catch { fail(error.localizedDescription); return }
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in self?.checkReady() }
    }
    func checkReady() {
        attempts += 1
        guard server?.isRunning == true else { fail("Could not start the game server. Port 8080 may already be in use. Close the other server and reopen this app."); return }
        if attempts > 50 { fail("The game server did not respond. See ~/Library/Logs/Tetris Battle/server.log."); return }
        var request = URLRequest(url: URL(string: "http://127.0.0.1:8080/desktop-health")!); request.timeoutInterval = 1
        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let self = self, self.timer != nil, let data = data, String(data: data, encoding: .utf8) == self.token else { return }
                self.timer?.invalidate(); self.timer = nil
                // The embedded server already supports offline play. Clear PWA caches
                // on launch so updates cannot show an old frontend. Keep local scores.
                let types: Set<String> = [WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache,
                    WKWebsiteDataTypeServiceWorkerRegistrations, WKWebsiteDataTypeFetchCache]
                WKWebsiteDataStore.default().removeData(ofTypes: types, modifiedSince: .distantPast) {
                    self.web.load(URLRequest(url: URL(string: "http://127.0.0.1:8080")!))
                    self.window.makeFirstResponder(self.web)
                }
            }
        }.resume()
    }
    func fail(_ message: String) {
        timer?.invalidate(); timer = nil
        let alert = NSAlert(); alert.messageText = "Tetris Battle"; alert.informativeText = message; alert.runModal(); NSApp.terminate(nil)
    }
    func applicationDidResignActive(_ notification: Notification) {dualKeyboard.blur()}
    @objc func reload() { web.reload() }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.host == "127.0.0.1" else { return }
        if let body=message.body as? [String:Any], body["action"] as? String == "dualKeyboard" {dualKeyboard.command(body);return}
        if message.body as? String == "quit" { NSApp.terminate(nil); return }
        if let body = message.body as? [String: String], body["action"] == "haptic", let event = body["event"], ["rotate", "hold", "drop", "clear", "tetris", "ko", "finish"].contains(event) {
            NSHapticFeedbackManager.defaultPerformer.perform(event == "rotate" || event == "hold" ? .alignment : .levelChange, performanceTime: .now)
            return
        }
        guard let body = message.body as? [String: String], let action = body["action"], let link = body["url"], let url = URL(string: link), ["http", "https"].contains(url.scheme ?? "") else { return }
        if action == "copyLink" {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(link, forType: .string)
        } else if action == "shareLink" {
            sharePicker = NSSharingServicePicker(items: [url])
            sharePicker?.show(relativeTo: web.bounds, of: web, preferredEdge: .minY)
        }
    }
    @objc func fullscreen() { window.toggleFullScreen(nil) }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { timer?.invalidate(); if server?.isRunning == true { server?.terminate(); server?.waitUntilExit() } }
}
@main
struct TetrisApplication {
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.setActivationPolicy(.regular)
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
