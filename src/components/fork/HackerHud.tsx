import { useEffect, useState } from '../../lib/teact/teact';

import type { HackerFeedback } from '../../fork/hackerFeedback';
import { subscribeToHackerFeedback } from '../../fork/hackerFeedback';
import buildClassName from '../../util/buildClassName';

import styles from './HackerHud.module.scss';

const FEEDBACK_LIFETIME = 2400;
const FEEDBACK_LIMIT = 3;

type VisibleFeedback = HackerFeedback & { isLeaving?: boolean };

function HackerHud() {
  const [feedbacks, setFeedbacks] = useState<VisibleFeedback[]>([]);

  useEffect(() => subscribeToHackerFeedback((feedback) => {
    setFeedbacks((current) => [...current, feedback].slice(-FEEDBACK_LIMIT));

    window.setTimeout(() => {
      setFeedbacks((current) => current.map((item) => (
        item.id === feedback.id ? { ...item, isLeaving: true } : item
      )));
    }, FEEDBACK_LIFETIME - 320);

    window.setTimeout(() => {
      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));
    }, FEEDBACK_LIFETIME);
  }), []);

  if (!feedbacks.length) return undefined;

  return (
    <div className={styles.hud} aria-live="polite">
      {feedbacks.map((feedback) => (
        <div
          key={feedback.id}
          className={buildClassName(styles.chip, feedback.isLeaving && styles.leaving)}
        >
          <span className={styles.prompt}>&gt;</span>
          <span className={styles.label}>{feedback.label}</span>
          {feedback.detail && <span className={styles.detail}>{feedback.detail}</span>}
          <span className={styles.blink} />
        </div>
      ))}
    </div>
  );
}

export default HackerHud;
