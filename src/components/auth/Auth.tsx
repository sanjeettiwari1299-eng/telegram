import '../../global/actions/initial';

import { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { IS_TAURI } from '../../util/browser/globalEnvironment';
import { IS_MAC_OS, PLATFORM_ENV } from '../../util/browser/windowEnvironment';
import { FORK_NAME, FORK_OWNER_NAME } from '../../fork/config';

import useCurrentOrPrev from '../../hooks/useCurrentOrPrev';
import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';

import Transition from '../ui/Transition';
import AuthCode from './AuthCode.async';
import AuthPassword from './AuthPassword.async';
import AuthPhoneNumber from './AuthPhoneNumber';
import AuthQrCode from './AuthQrCode';
import AuthRegister from './AuthRegister.async';

import './Auth.scss';

type StateProps = {
  authState: GlobalState['auth']['state'];
};

const Auth = ({
  authState,
}: StateProps) => {
  const {
    returnToAuthPhoneNumber, goToAuthQrCode,
  } = getActions();

  const lang = useLang();
  const isMobile = PLATFORM_ENV === 'iOS' || PLATFORM_ENV === 'Android';

  const handleChangeAuthorizationMethod = () => {
    if (!isMobile) {
      goToAuthQrCode();
    } else {
      returnToAuthPhoneNumber();
    }
  };

  useHistoryBack({
    isActive: (!isMobile && authState === 'authorizationStateWaitPhoneNumber')
      || (isMobile && authState === 'authorizationStateWaitQrCode'),
    onBack: handleChangeAuthorizationMethod,
  });

  // For animation purposes
  const renderingAuthState = useCurrentOrPrev(
    authState !== 'authorizationStateReady' ? authState : undefined,
    true,
  );

  function getScreen() {
    switch (renderingAuthState) {
      case 'authorizationStateWaitCode':
        return <AuthCode />;
      case 'authorizationStateWaitPassword':
        return <AuthPassword />;
      case 'authorizationStateWaitRegistration':
        return <AuthRegister />;
      case 'authorizationStateWaitPhoneNumber':
        return <AuthPhoneNumber />;
      case 'authorizationStateWaitQrCode':
        return <AuthQrCode />;
      default:
        return isMobile ? <AuthPhoneNumber /> : <AuthQrCode />;
    }
  }

  function getActiveKey() {
    switch (renderingAuthState) {
      case 'authorizationStateWaitCode':
        return 0;
      case 'authorizationStateWaitPassword':
        return 1;
      case 'authorizationStateWaitRegistration':
        return 2;
      case 'authorizationStateWaitPhoneNumber':
        return 3;
      case 'authorizationStateWaitQrCode':
        return 4;
      default:
        return isMobile ? 3 : 4;
    }
  }

  return (
    <div className="auth-experience">
      <aside className="auth-intro">
        <div className="auth-intro-brand">
          <span className="auth-intro-mark" aria-hidden="true" />
          <span>
            {FORK_NAME}
            <small>{lang('ForkPersonalEdition')}</small>
          </span>
        </div>
        <div className="auth-intro-content">
          <span className="auth-intro-eyebrow">{lang('ForkMadeForYou')}</span>
          <h2>{lang('ForkWelcomeTitle')}</h2>
          <p>{lang('ForkWelcomeDescription')}</p>
          <div className="auth-intro-signature">{lang('ForkMadeBy', { name: FORK_OWNER_NAME })}</div>
        </div>
        <div className="auth-intro-footer">{lang('ForkTelegramClient')}</div>
      </aside>
      <Transition
        activeKey={getActiveKey()}
        name="fade"
        className="Auth"
        data-tauri-drag-region={IS_TAURI && IS_MAC_OS ? true : undefined}
      >
        {getScreen()}
      </Transition>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => {
    return {
      authState: global.auth.state,
    };
  },
)(Auth));
