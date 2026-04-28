# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.1] - 2026-04-28

### Fixed (the actual actual fix)

- **No longer wraps `CPRCombat.rollInitiative`.** The v0.2.0 wrap was the proximate cause of the `TypeError: Cannot read properties of null (reading 'constructor')` crash inside `cpr-combat.js:72`. The wrap inserted an extra `await` boundary at the entry of `rollInitiative` that exposed a latent CPR bug where `combatant.token.actor` could resolve to `null` for synthetic-token combatants whose actor materialization was still in flight at the read site.
- **Module no longer touches `rollInitiative` at all.** It is byte-for-byte invisible to CPR's combat code path.
- **Detection now uses stack-trace inspection at the DSN entry point.** When `game.dice3d.showForRoll` or `.show` is called, the module checks the JS call stack for `rollInitiative` / `rollAll` / `rollNPC` markers. If any are present, returns `false` (DSN's "did not animate" convention) without triggering animation.
- **Registration moved from `Hooks.once("ready")` to `Hooks.once("diceSoNiceReady")`.** v0.2.0 could fail silently if our `ready` hook ran before DSN's, leaving `game.dice3d` undefined and our `libWrapper.register("game.dice3d.showForRoll", …)` throwing. Now we register only after DSN signals it is fully initialized.
- **Removed `if (!game.user?.isGM) return;` guard at the top of registration.** v0.2.0 only installed wraps on GM clients; player clients still saw 3D animation. The wraps now install on every connected client.

### Migration from v0.2.0

Direct upgrade. No settings changed. No new dependencies.

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
