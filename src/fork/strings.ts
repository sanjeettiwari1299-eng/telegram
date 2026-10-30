/**
 * Fork-owned string overrides.
 *
 * Telegram Web loads its English strings from a language pack (and from
 * `assets/localization/fallback.strings`), so the login screen would otherwise
 * greet people with Telegram branding. These overrides are applied before any
 * pack lookup, which means they survive upstream language-pack updates and do
 * not require editing (and re-fixing) `fallback.strings` after every sync.
 *
 * Rules of thumb:
 *   - Do NOT rename strings that refer to the Telegram app on the user's phone
 *     (e.g. `LoginQRHelp1` "Open Telegram on your phone") — that app is real.
 *   - Only override user-facing product name, never protocol wording.
 */
import type { LangKey } from '../types/language';

export const FORK_STRING_OVERRIDES: Partial<Record<LangKey, string>> = {
  // Login screen heading (QR view)
  LoginQRTitle: 'Welcome to Telegrow',

  // Same heading on the phone-number gate
  LoginQRLogin: 'Log in with QR Code',

  // "Please confirm your country code and enter your phone number."
  StartText: 'Please confirm your country code\nand enter your phone number.',
};
