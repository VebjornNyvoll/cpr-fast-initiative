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
// message interception path, which CPR never enters for initiative.
//
// We wrap game.dice3d.showForRoll and decide whether to suppress based on TWO
// things, in order:
//
//   1. `messageID` argument (positional index 5).
//      If it's set, this call comes from DSN's own renderRolls() driven by
//      its createChatMessage hook — i.e. DSN is processing an existing chat
//      message. We MUST let those calls through. DSN has already added the
//      `dsn-hide` CSS class to the chat card and is depending on the
//      animation-completion callback to remove it. If we return `false` here,
//      the reveal never fires and the chat card stays invisible forever.
//      This is what broke v0.2.1 for some users.
//
//   2. Otherwise (no messageID = direct call from somewhere): check the stack
//      for `rollInitiative`. Foundry's Combat.rollAll and Combat.rollNPC both
//      delegate to rollInitiative internally, so the inner marker covers both.
//      We use a word-boundary regex (\brollInitiative\b) instead of substring
//      matching to avoid catching unrelated names like rerollInitiative.
//
// We register the wrap on Hooks.once("diceSoNiceReady") to guarantee
// game.dice3d is fully constructed regardless of module load order.

const MODULE_ID     = "cpr-fast-initiative";
const TARGET_SYSTEM = "cyberpunk-red-core";

// Word-boundary regex. Matches "rollInitiative" only when surrounded by
// non-word characters (e.g. ".rollInitiative " in a stack frame).
const INIT_MARKER = /\brollInitiative\b/;

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
    console.warn(`${MODULE_ID} | diceSoNiceReady fired but game.dice3d is missing. Cannot install wrap.`);
    return;
  }

  try {
    libWrapper.register(
      MODULE_ID,
      "game.dice3d.showForRoll",
      async function (wrapped, ...args) {
        // Fast paths: feature off, wrong system → straight through.
        if (!game.settings.get(MODULE_ID, "enabled")) return wrapped.apply(this, args);
        if (game.system.id !== TARGET_SYSTEM)         return wrapped.apply(this, args);

        // CRITICAL: if messageID is set, this call comes from DSN's own
        // renderRolls() driven by createChatMessage. DSN has already marked
        // the chat card as animating and added `dsn-hide`. We MUST let this
        // through so DSN's reveal callback fires. Returning false here would
        // leave the chat card invisible forever.
        // showForRoll signature: (roll, user, synchronize, users, blind, messageID, speaker, options)
        const messageID = args[5];
        if (messageID != null) return wrapped.apply(this, args);

        // No messageID = direct call (CPR's DiceHandler._passRoll, or anything
        // else calling showForRoll directly). Check the stack: if this is part
        // of an initiative pipeline, suppress.
        const stack = new Error().stack || "";
        if (INIT_MARKER.test(stack)) {
          return false;  // DSN convention: did not animate
        }

        return wrapped.apply(this, args);
      },
      "MIXED"
    );

    console.log(`${MODULE_ID} | v0.2.2 active — CPR initiative DSN animation suppressed (chat cards unaffected).`);
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to register wrap on game.dice3d.showForRoll:`, err);
  }
});
