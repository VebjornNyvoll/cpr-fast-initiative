// CPR Fast Initiative
//
// Suppresses Dice So Nice's 3D dice animation for initiative rolls in the
// Cyberpunk Red Core system. Other rolls keep their animation.
//
// Implementation: hooks into DSN's `diceSoNiceMessagePreProcess` extension
// hook (the canonical pre-decision seam) and sets `willTrigger3DRoll = false`
// when the chat message is an initiative roll under the cpr system.
//
// No monkey-patching, no libWrapper. Pure hook-based extension.

const MODULE_ID = "cpr-fast-initiative";
const TARGET_SYSTEM = "cyberpunk-red-core";

// ---------------------------------------------------------------------------
// Settings

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enabled", {
    name:    "CPR_FAST_INIT.Settings.Enabled.Name",
    hint:    "CPR_FAST_INIT.Settings.Enabled.Hint",
    scope:   "world",
    config:  true,
    type:    Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "matchByFlavor", {
    name:    "CPR_FAST_INIT.Settings.MatchByFlavor.Name",
    hint:    "CPR_FAST_INIT.Settings.MatchByFlavor.Hint",
    scope:   "world",
    config:  true,
    type:    Boolean,
    default: false
  });
});

// ---------------------------------------------------------------------------
// Initiative-roll detection

/**
 * Is this chat message an initiative roll?
 *
 * Primary signal: `flags.core.initiativeRoll === true`. Foundry core sets this
 * automatically when `Combat#rollInitiative` creates the chat message. Most
 * systems including CPR use the standard combat-tracker flow.
 *
 * Optional fallback signal (off by default): the message's flavor matches
 * /initiative/i. Enable via the "Match by flavor" setting if your CPR setup
 * uses a custom roll that doesn't set the standard flag.
 *
 * @param {ChatMessage} message
 * @returns {boolean}
 */
function isInitiativeRoll(message) {
  if (!message) return false;

  // Primary: Foundry's standard initiative-roll flag
  if (message.flags?.core?.initiativeRoll === true) return true;

  // Fallback: flavor match (opt-in)
  if (game.settings.get(MODULE_ID, "matchByFlavor")) {
    const flavor = (message.flavor ?? "").toString();
    if (/initiative/i.test(flavor)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// DSN extension hook

Hooks.on("diceSoNiceMessagePreProcess", (messageId, interception) => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (game.system.id !== TARGET_SYSTEM) return;
  if (!interception?.willTrigger3DRoll) return;        // already suppressed by something else

  const message = game.messages.get(messageId);
  if (!isInitiativeRoll(message)) return;

  interception.willTrigger3DRoll = false;
});

// ---------------------------------------------------------------------------
// One-time GM warning if dependencies are missing

Hooks.once("ready", () => {
  if (!game.user?.isGM) return;

  if (game.system.id !== TARGET_SYSTEM) {
    console.warn(`${MODULE_ID} | Active system is "${game.system.id}". This module only acts on "${TARGET_SYSTEM}" — it will be a no-op until you load a CPR world.`);
    return;
  }

  if (!game.modules.get("dice-so-nice")?.active) {
    ui.notifications.warn(game.i18n.localize("CPR_FAST_INIT.Notification.DSNMissing"));
  }
});
