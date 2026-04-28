# CPR Fast Initiative

A small Foundry VTT module that **suppresses [Dice So Nice's](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) 3D dice animation for initiative rolls** in the [Cyberpunk Red Core](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) system. Other rolls (attacks, skill checks, damage) keep their 3D animation. Speeds up combat-tracker startup without losing 3D dice flavor elsewhere.

> **Status: v0.1.0 — initial release.**

## Install

Paste this manifest URL into Foundry → *Add-on Modules → Install Module*:

```
https://github.com/VebjornNyvoll/cpr-fast-initiative/releases/latest/download/module.json
```

## Why

Cyberpunk Red Core's combat tracker initiative rolls every combatant up front. With Dice So Nice enabled, the GM waits through one 3D dice animation per combatant before the encounter begins — typically 5-15 seconds of animation queue per fight. Disabling DSN globally for initiative loses the visual flair on every other roll for everyone.

This module removes only the initiative-roll animation, leaving every other CPR roll (attacks, skill checks, damage, recovery, etc.) animated normally.

## How it works

- Listens for the [`diceSoNiceMessagePreProcess`](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) extension hook (DSN's canonical pre-decision seam).
- Detects initiative rolls via Foundry's standard `flags.core.initiativeRoll === true` flag (set automatically by `Combat#rollInitiative`).
- Sets `interception.willTrigger3DRoll = false` for matching messages, telling DSN to skip the animation.
- The chat card itself appears immediately with the rolled total, no animation queue.

No monkey-patching, no `libWrapper`. Pure hook-based extension. Dormant on any other system.

## Settings

| Setting | Scope | Default | Description |
|---|---|---|---|
| Skip 3D dice for initiative | Client | `true` | Per-player toggle. Each player decides independently. |
| Match by flavor (fallback) | Client | `false` | Opt-in fallback that also matches chat messages whose flavor contains "initiative" — only enable if the standard flag detection misses your initiative rolls. |

## Compatibility

| Requirement | Version |
|---|---|
| Foundry VTT | v12 minimum, v13 verified |
| System | `cyberpunk-red-core` (no-op on any other system) |
| Required dependency | [Dice So Nice](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) — module hard-requires DSN; if absent the module is meaningless |

## License

MIT — see [LICENSE](LICENSE).
