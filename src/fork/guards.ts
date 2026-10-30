import { FORK_HIDE_PURCHASES, FORK_NAME } from './config';

/**
 * Returns `true` when a purchase surface (Telegram Premium, Stars, gifts) must be
 * rejected. Used as a hard guard inside action handlers, so hidden buttons or
 * deep links can never open a payment flow.
 */
export function isPurchaseBlocked() {
  return FORK_HIDE_PURCHASES;
}

export const PURCHASE_BLOCKED_MESSAGE = `Purchases are disabled on ${FORK_NAME}.`;
