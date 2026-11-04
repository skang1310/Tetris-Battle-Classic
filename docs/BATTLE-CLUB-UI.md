# Battle Club UI

The launcher groups mode, opponent/input style and preparation into a single home workbench. Desktop has a navigation rail; compact screens have a bottom dock and a persistent start action. Mode selection updates a preview without starting a game. Preparation receives the exact selected mode and style, focuses its start button for Enter, and expands opponent controls only when changed. Two-player maps are explicitly automatic; CPU games retain the map picker.

Records now have a dedicated profile summary and mode-best page. Profile edit opens the profile tab directly. Recent matches, online invite, guide and room handling use the existing game/network logic. The colorful original battle canvas remains.

## Main source

- `client-nuxt/app/components/ArcadePages.vue`
- `client-nuxt/app/components/HubIcon.vue`
- `client-nuxt/app/assets/css/battle-hub.css`
- `client-nuxt/app/components/ClassicArena.vue` (preparation handoff and focus)

## Verification

Local typecheck and 419 frontend tests pass. All Go packages pass race-enabled tests. The installed app passed `verify-hub43.mjs`: inline selection, preflight style handoff, profile/records/guide/lobby, 320/390/768/1024 layouts, countdown, item attack and opaque navigation fallback. `verify-hub-network43.mjs` verifies actual local host/guest WebSocket item attacks. Native WebKit home was visually inspected; physical two-keyboard and iPhone operation were not newly tested.

Historical browser scripts may require changes for this launcher or a local Playwright path; they are development evidence rather than a portable automated CI suite. The standard npm and Go checks are used by GitHub Actions.
