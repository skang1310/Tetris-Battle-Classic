# Tetris Battle — Apple-inspired interface, bundle 42

Sources reviewed:
- https://developer.apple.com/design/
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/videos/play/wwdc2025/219/

The HIG separates Liquid Glass controls/navigation from standard content materials. This release uses a floating, blurred navigation surface, quiet content cards, readable light sheets, concentric rounded controls, system typography, blue primary actions, and restrained block-color accents. The original vivid game canvas is retained. This is a CSS/WebKit interpretation, not native SwiftUI Glass or system optical refraction.

Changed surfaces: home, mode cards, navigation and records, online lobby, help, setup/item style, map picker, settings/profile tabs, pause/results and surrounding game controls. Existing gameplay and rematch/map behavior are retained. Browser zoom is enabled rather than blocked by viewport metadata.

Accessibility: visible focus, 44px compact navigation targets, reduced-motion overrides, reduced-transparency opaque fallback, increased-contrast styles, and no automatic decorative animation. No external font, tracking, image provider, or runtime dependency added.

Validation: actual app typecheck; 419 unit tests; installed-browser home/navigation/records/setup/maps/settings/profiles/lobby and gameplay/pause; 320/390/768 viewport containment; reduced motion/contrast and emulated reduced transparency; real item number-key attacks and reason messages. Native macOS WebKit home visually inspected. Required game-client gameplay screenshot inspected. Physical keyboard/iPhone behavior was not newly exercised.
