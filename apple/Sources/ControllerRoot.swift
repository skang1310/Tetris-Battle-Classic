import SwiftUI
import GameController

#if os(tvOS)
typealias ControllerContainer = GCEventViewController
#else
typealias ControllerContainer = UIViewController
#endif

/// tvOS defaults to sending gamepad input to focus navigation. Capture it only
/// while the game owns input; return it to SwiftUI for menus and pause/results.
struct ControllerRoot: UIViewControllerRepresentable {
    @ObservedObject var model: BattleModel
    func makeUIViewController(context: Context) -> ControllerContainer {
        let container = ControllerContainer()
        let host = UIHostingController(rootView: BattleRoot().environmentObject(model))
        container.addChild(host)
        container.view.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo:container.view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo:container.view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo:container.view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo:container.view.bottomAnchor)
        ])
        host.didMove(toParent:container)
        updateRouting(container)
        return container
    }
    func updateUIViewController(_ container: ControllerContainer, context: Context) { updateRouting(container) }
    private func updateRouting(_ container: ControllerContainer) {
        #if os(tvOS)
        let navigate = !model.playing || model.state?.paused == true || model.state?.finished == true
        if container.controllerUserInteractionEnabled != navigate {
            container.controllerUserInteractionEnabled = navigate
            print("[BattleInput] tvOS routing: \(navigate ? "menu navigation" : "gameplay capture")")
        }
        #endif
    }
}
