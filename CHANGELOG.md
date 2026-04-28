# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-04-28

### Fixed (this is the actual fix)

- **The module now actually works.** v0.1.x silently failed to suppress DSN for CPR initiative because the detection mechanism was wrong. CPR rolls initiative through its own `DiceHandler.handle3dDice`, which calls `game.dice3d.showForRoll` directly — **bypassing DSN's `createChatMessage` interception entirely**. Our v0.1.x `diceSoNiceMessagePreProcess` hook fires only inside DSN's chat-message path, which CPR never enters for initiative animations. The chat card is created AFTER animation, so by the time the message hook would have fired, the dice had already rolled.

### Changed (BREAKING)

- New required dependency: `lib-wrapper`. Add it before installing/upgrading.
- Detection mechanism switched from DSN's chat-message hook to libWrapper-based interception of:
  - `CONFIG.Combat.documentClass.prototype.rollInitiative` — sets a module-internal flag for the duration of execution.
  - `game.dice3d.showForRoll` and `game.dice3d.show` — when the flag is set, returns `false` immediately (DSN's "did not animate" convention) instead of triggering the 3D animation.
- The `matchByFlavor` fallback setting is removed. The new mechanism is precise — no fallback needed.

### Migration from v0.1.x

1. Install `lib-wrapper` if not already active. (It's a widely-used soft dependency for many modules.)
2. Update `cpr-fast-initiative` normally. The world setting `enabled` carries forward.
3. The `matchByFlavor` setting silently disappears.

## [0.1.1] - 2026-04-28

### Changed

- Settings are now world-scope (GM only). Players see them in their config UI but cannot modify. The toggle should be a single table-wide decision.

### Note

The detection mechanism in this version still did not work for CPR — see v0.2.0 for the actual fix.

## [0.1.0] - 2026-04-28

### Added

- Initial release. Listened to DSN's `diceSoNiceMessagePreProcess` hook to detect initiative rolls via `flags.core.initiativeRoll`. **This approach did not work** for CPR because CPR bypasses DSN's chat-message path entirely — see v0.2.0 for the corrected approach.
