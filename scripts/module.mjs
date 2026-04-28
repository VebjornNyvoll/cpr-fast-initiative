// CPR Fast Initiative
//
// Suppresses Dice So Nice's 3D dice animation for initiative rolls in the
// Cyberpunk Red Core (cpr) system. Other rolls keep their animation.
//
// ── Why we use libWrapper, not just a hook ────────────────────────────────
//
// CPR rolls initiative through its own DiceHandler.handle3dDice helper, which
// calls game.dice3d.showForRoll DIRECTLY, before any chat message is created.
// DSN's `diceSoNiceMessagePreProcess` hook fires only during DSN's chat-
// message interception path, which CPR never enters for initiative. So the
// "use the DSN hook" approach (v0.1.x) silently never fired.
//
// Correct interception point = game.dice3d.showForRoll itself. We must skip
// it only while inside CPRCombat.rollInitiative; other CPR rolls (attacks,
// skill checks, damage) must still animate. So we wrap two things with
// libWrapper:
//
//   1. CONFIG.Combat.documentClass.prototype.rollInitiative
//      ↳ flag _skipDsnForInit = true for the duration of execution.
//   2. game.dice3d.showForRoll / .show
//      ↳ when the flag is set, return false immediately (DSN's "did not
//        animate" convention) instead of triggering the 3D animation.
//
// Pure libWrapper-managed wrapping. No monkey-patching, conflict-aware.

const MODULE_ID     = "cpr-fast-initiative";
const TARGET_SYSTEM = "cyberpunk-red-core";

let _skipDsnForInit = false;

// ---------------------------------------------------------------------------
// Settings (world-scope — GM only)

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enabled", {
    name:    "CPR_FAST_INIT.Settings.Enabled.Name",
    hint:    "CPR_FAST_INIT.Settings.Enabled.Hint",
    scope:   "world",
    config:  true,
    type:    Boolean,
    default: true
  });
});

// ---------------------------------------------------------------------------
// libWrapper registration at ready

Hooks.once("ready", () => {
  if (!game.user?.isGM) return;

  // No-op on any non-CPR system.
  if (game.system.id !== TARGET_SYSTEM) {
    console.warn(`${MODULE_ID} | Active system is "${game.system.id}". This module only acts on "${TARGET_SYSTEM}".`);
    return;
  }

  if (!game.modules.get("lib-wrapper")?.active) {
    ui.notifications.error(game.i18n.localize("CPR_FAST_INIT.Notification.LibWrapperMissing"));
    return;
  }

  if (!game.modules.get("dice-so-nice")?.active) {
    ui.notifications.warn(game.i18n.localize("CPR_FAST_INIT.Notification.DSNMissing"));
    return;
  }

  // ── Wrapper 1: flag the rollInitiative call window ────────────────────
  libWrapper.register(
    MODULE_ID,
    "CONFIG.Combat.documentClass.prototype.rollInitiative",
    async function (wrapped, ...args) {
      if (!game.settings.get(MODULE_ID, "enabled")) {
        return wrapped.apply(this, args);
      }
      _skipDsnForInit = true;
      try {
        return await wrapped.apply(this, args);
      } finally {
        _skipDsnForInit = false;
      }
    },
    "WRAPPER"
  );

  // ── Wrapper 2: skip DSN's animation while the flag is set ─────────────
  // Both showForRoll (CPR's actual path) and show (defense in depth in case
  // CPR ever switches to the lower-level entry point).
  for (const path of ["game.dice3d.showForRoll", "game.dice3d.show"]) {
    libWrapper.register(
      MODULE_ID,
      path,
      async function (wrapped, ...args) {
        if (_skipDsnForInit) return false;   // DSN convention: false = did not animate
        return wrapped.apply(this, args);
      },
      "MIXED"
    );
  }

  console.log(`${MODULE_ID} | Active — CPR initiative rolls will skip Dice So Nice 3D animation.`);
});
