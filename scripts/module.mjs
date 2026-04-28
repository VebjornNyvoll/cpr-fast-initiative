// CPR Fast Initiative
//
// Suppresses Dice So Nice's 3D dice animation for initiative rolls in the
// Cyberpunk Red Core (cpr) system. Other rolls keep their animation.
//
// ── Why this design ──────────────────────────────────────────────────────
//
// CPR rolls initiative through its own DiceHandler.handle3dDice helper, which
// calls game.dice3d.showForRoll DIRECTLY, before any chat message is created.
// DSN's `diceSoNiceMessagePreProcess` hook fires only during DSN's chat-
// message interception path, which CPR never enters for initiative. So a
// hook-only approach (v0.1.x) never fired.
//
// v0.2.0 tried wrapping CPRCombat.rollInitiative AND game.dice3d.showForRoll.
// That broke for two reasons: (1) wraps only installed on the GM client due
// to an over-eager early-return guard; (2) wrapping rollInitiative inserted
// an extra microtask boundary that exposed a latent CPR bug where a
// synthetic-actor's `combatant.token.actor` could be null at the read site.
//
// v0.2.1: do NOT wrap rollInitiative at all. Wrap ONLY game.dice3d.showForRoll
// (and .show as defence-in-depth) and use stack-trace inspection at call
// time to decide whether the call is initiative-driven. This makes us
// completely invisible to CPR's rollInitiative — no wrap, no flag, no extra
// async boundary. We only intercept DSN's own entry point.
//
// We also register on DSN's `diceSoNiceReady` hook (which DSN fires after
// fully initializing `game.dice3d`), guaranteeing our wraps are installed
// at the correct time regardless of module load order.

const MODULE_ID     = "cpr-fast-initiative";
const TARGET_SYSTEM = "cyberpunk-red-core";

// Function names we treat as "this is an initiative roll" when seen in the
// JS call stack. CPR's source is unminified by default, so its function names
// appear as-is in stack frames.
const INIT_STACK_MARKERS = [
  "rollInitiative",   // CPRCombat.rollInitiative (and Foundry Combat.rollInitiative)
  "rollAll",          // Combat.rollAll convenience that fans out to rollInitiative
  "rollNPC",          // Combat.rollNPC convenience
];

// ---------------------------------------------------------------------------
// Settings — world-scope so only the GM can change them.

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enabled", {
    name:    "CPR_FAST_INIT.Settings.Enabled.Name",
    hint:    "CPR_FAST_INIT.Settings.Enabled.Hint",
    scope:   "world",
    config:  true,
    type:    Boolean,
    default: true,
  });
});

// ---------------------------------------------------------------------------
// libWrapper registration — driven by DSN's own ready hook so we know
// `game.dice3d` is fully constructed before we try to wrap it.

Hooks.once("diceSoNiceReady", () => {
  if (game.system.id !== TARGET_SYSTEM) {
    console.warn(`${MODULE_ID} | Active system is "${game.system.id}"; this module only acts on "${TARGET_SYSTEM}". Idle.`);
    return;
  }

  if (!game.modules.get("lib-wrapper")?.active) {
    if (game.user?.isGM) {
      ui.notifications.error(game.i18n.localize("CPR_FAST_INIT.Notification.LibWrapperMissing"));
    }
    return;
  }

  if (!game.dice3d) {
    console.warn(`${MODULE_ID} | diceSoNiceReady fired but game.dice3d is missing. Cannot install wraps.`);
    return;
  }

  // Wrap both DSN entry points. CPR uses showForRoll today; show is wrapped as
  // defence in depth for any caller that uses the lower-level entry point.
  for (const path of ["game.dice3d.showForRoll", "game.dice3d.show"]) {
    try {
      libWrapper.register(
        MODULE_ID,
        path,
        async function (wrapped, ...args) {
          // Fast paths: feature off, wrong system → straight through.
          if (!game.settings.get(MODULE_ID, "enabled")) return wrapped.apply(this, args);
          if (game.system.id !== TARGET_SYSTEM)         return wrapped.apply(this, args);

          // Inspect the JS call stack at THIS frame. If any of the initiative
          // markers appear, this DSN call originated from CPR's initiative
          // pipeline → suppress.
          const stack = new Error().stack || "";
          if (INIT_STACK_MARKERS.some((m) => stack.includes(m))) {
            // DSN convention: returning false signals "did not animate".
            // CPR's DiceHandler awaits the result but doesn't act on it.
            return false;
          }

          return wrapped.apply(this, args);
        },
        "MIXED"
      );
    } catch (err) {
      console.error(`${MODULE_ID} | Failed to register wrap on ${path}:`, err);
    }
  }

  console.log(`${MODULE_ID} | v0.2.1 active — CPR initiative DSN animation suppressed.`);
});
