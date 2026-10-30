import { CREDENTIALS_MISSING } from '../../config';

import styles from './CredentialsBanner.module.scss';

/**
 * Shown when the build was made without real Telegram API credentials.
 * Without them Telegram answers `API_ID_INVALID`, the auth token request fails and
 * the QR code never appears — which looks like a broken app. This says it out loud.
 */
function CredentialsBanner() {
  if (!CREDENTIALS_MISSING) return undefined;

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>!</span>
      <span className={styles.text}>
        <strong>API credentials missing</strong>
        <span className={styles.hint}>
          QR / phone login is disabled. Add <code>TELEGRAM_API_ID</code> and{' '}
          <code>TELEGRAM_API_HASH</code> (my.telegram.org) in GitHub → Settings → Secrets and
          variables → Actions, then re-run “Deploy to GitHub Pages”.
        </span>
      </span>
    </div>
  );
}

export default CredentialsBanner;
