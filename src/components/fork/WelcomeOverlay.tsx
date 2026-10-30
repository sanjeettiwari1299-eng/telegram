import { useEffect, useState } from '../../lib/teact/teact';

import {
  FORK_NAME, FORK_OWNER_NAME, FORK_SHOW_WELCOME, FORK_TAGLINE, FORK_WELCOME_DURATION,
} from '../../fork/config';
import buildClassName from '../../util/buildClassName';

import styles from './WelcomeOverlay.module.scss';

const BOOT_LINES = [
  { text: `> boot --shell=${FORK_NAME.toLowerCase()} --secure`, isAccent: true },
  { text: '[ ok ] mtproto handshake ......... verified' },
  { text: '[ ok ] session keys ............... rotated' },
  { text: '[ ok ] channel ..................... encrypted' },
  { text: '[ ok ] device fingerprint ......... trusted' },
  { text: '> identity accepted', isAccent: true },
];

const LINE_INTERVAL = 230;
const GREETING_DELAY = 320;
const FADE_OUT_DURATION = 420;

function WelcomeOverlay() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [isGreetingVisible, setIsGreetingVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isHidden, setIsHidden] = useState(!FORK_SHOW_WELCOME);

  useEffect(() => {
    if (!FORK_SHOW_WELCOME) return undefined;

    const timers = BOOT_LINES.map((_, index) => window.setTimeout(
      () => setVisibleLines(index + 1),
      LINE_INTERVAL * (index + 1),
    ));

    const linesDoneAt = LINE_INTERVAL * BOOT_LINES.length;
    timers.push(window.setTimeout(
      () => setIsGreetingVisible(true),
      linesDoneAt + GREETING_DELAY,
    ));
    timers.push(window.setTimeout(() => setIsLeaving(true), FORK_WELCOME_DURATION));
    timers.push(window.setTimeout(() => setIsHidden(true), FORK_WELCOME_DURATION + FADE_OUT_DURATION));

    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    if (!FORK_SHOW_WELCOME) return undefined;

    const hide = () => {
      setIsLeaving(true);
      window.setTimeout(() => setIsHidden(true), FADE_OUT_DURATION);
    };

    window.addEventListener('keydown', hide, { once: true });
    window.addEventListener('pointerdown', hide, { once: true });

    return () => {
      window.removeEventListener('keydown', hide);
      window.removeEventListener('pointerdown', hide);
    };
  }, []);

  if (isHidden) return undefined;

  return (
    <div className={buildClassName(styles.overlay, isLeaving && styles.leaving)}>
      <div className={styles.grid} />
      <div className={styles.scanlines} />

      <div className={styles.terminal}>
        <div className={styles.titleBar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <em className={styles.title}>{FORK_NAME.toLowerCase()}://secure-shell</em>
        </div>

        <div className={styles.body}>
          {BOOT_LINES.slice(0, visibleLines).map((line) => (
            <div
              key={line.text}
              className={buildClassName(styles.line, line.isAccent && styles.accent)}
            >
              {line.text}
            </div>
          ))}

          {isGreetingVisible && (
            <div className={styles.greeting}>
              <div className={styles.greetingTitle}>
                WELCOME BACK, {FORK_OWNER_NAME.toUpperCase()}
              </div>
              <div className={styles.greetingSub}>
                access granted · {FORK_TAGLINE} · {FORK_NAME}
              </div>
            </div>
          )}

          <span className={styles.cursor} />
        </div>
      </div>

      <div className={styles.hint}>press any key to continue</div>
    </div>
  );
}

export default WelcomeOverlay;
