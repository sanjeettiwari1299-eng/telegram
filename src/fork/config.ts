/**
 * Fork-specific configuration.
 *
 * Everything that makes this fork different from upstream Telegram Web A is
 * driven from this file, so upstream merges stay (mostly) conflict free.
 */

export const FORK_NAME = 'Telegrow';
export const FORK_OWNER_NAME = 'Lakshay';
export const FORK_TAGLINE = 'private messaging shell';

/**
 * Telegram Premium / Stars / gifts are purchase surfaces. They are switched off
 * in this build: entry points are hidden in the UI and the corresponding
 * actions are rejected as a hard guard.
 */
export const FORK_HIDE_PURCHASES = true;

/** Terminal-style "welcome back" boot screen shown when the app is opened. */
export const FORK_SHOW_WELCOME = true;

/** How long the welcome screen stays on screen, in ms (includes the fade out). */
export const FORK_WELCOME_DURATION = 4200;
