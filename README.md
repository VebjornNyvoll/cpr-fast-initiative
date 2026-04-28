# CPR Fast Initiative

A Foundry VTT module that **suppresses [Dice So Nice's](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) 3D dice animation for initiative rolls** in the [Cyberpunk Red Core](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) system. Other rolls (attacks, skill checks, damage) keep their 3D animation. Speeds up combat-tracker startup without losing 3D dice flavor elsewhere.

> **Status: v0.2.0 — actually works.** v0.1.x had a wrong-path detection mechanism that never fired for CPR initiative. v0.2.0 intercepts the correct entry point via `lib-wrapper`. See [CHANGELOG.md](CHANGELOG.md) for details.

## Install

Paste this manifest URL into Foundry → *Add-on Modules → Install Module*:

```
https://github.com/VebjornNyvoll/cpr-fast-initiative/releases/latest/download/module.json
```

You also need:

- [Dice So Nice](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) (the thing we're selectively suppressing)
- [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper) (used to safely wrap CPR's `rollInitiative` and DSN's `showForRoll`)

Both are widely-used dependencies you may already have installed.

## How it works

CPR rolls initiative through its own `DiceHandler.handle3dDice` helper, which calls `game.dice3d.showForRoll` **directly**, before any chat message is created. DSN's normal extension hook (`diceSoNiceMessagePreProcess`) fires only in DSN's chat-message interception path — which CPR never enters for initiative. Hence we have to intercept at the actual call site.

Mechanism:

1. `lib-wrapper`-wraps `CONFIG.Combat.documentClass.prototype.rollInitiative` (which CPR overrides as `CPRCombat.rollInitiative`). For the duration of that call, sets a module-internal `_skipDsnForInit = true` flag inside a `try/finally`.
2. `lib-wrapper`-wraps `game.dice3d.showForRoll` (and `game.dice3d.show` defensively). When invoked while the flag is set, returns `false` immediately (DSN's "did not animate" convention) instead of triggering the 3D animation.

The chat card still appears with the rolled total — only the 3D animation is suppressed. All non-initiative CPR rolls (attacks, skill checks, damage, recovery, etc.) animate normally.

## Settings (world-scope, GM only)

| Setting | Default | Description |
|---|---|---|
| Skip 3D dice for initiative | `true` | Master toggle. Set false to re-enable initiative animations without uninstalling the module. |

## Compatibility

| Requirement | Version |
|---|---|
| Foundry VTT | v12 minimum, v13 verified |
| System | `cyberpunk-red-core` (no-op on any other system) |
| Required: Dice So Nice | any recent version |
| Required: lib-wrapper | any recent version |

## License

MIT — see [LICENSE](LICENSE).
