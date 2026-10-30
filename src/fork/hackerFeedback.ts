/**
 * Tiny event bus for hacker-style action feedback ("packet sent", "packet purged", …).
 *
 * Action handlers emit events, `HackerHud` renders them as terminal chips.
 * Keeping it as a DOM event means the fork can hook any place in the codebase
 * without touching global state or reducers.
 */

export type HackerFeedback = {
  id: number;
  label: string;
  detail?: string;
};

export const HACKER_FEEDBACK_EVENT = 'telegrow:hacker-feedback';

let feedbackId = 0;

export function emitHackerFeedback(label: string, detail?: string) {
  if (typeof window === 'undefined') return;

  feedbackId += 1;
  window.dispatchEvent(new CustomEvent<HackerFeedback>(HACKER_FEEDBACK_EVENT, {
    detail: { id: feedbackId, label, detail },
  }));
}

export function subscribeToHackerFeedback(handler: (feedback: HackerFeedback) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<HackerFeedback>).detail);

  window.addEventListener(HACKER_FEEDBACK_EVENT, listener);

  return () => window.removeEventListener(HACKER_FEEDBACK_EVENT, listener);
}
