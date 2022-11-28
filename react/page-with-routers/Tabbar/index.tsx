import React, {
  useEffect,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import sounds from 'api/sounds';
import { isObject } from 'api/tools';
import BaseTabbar from '../../../common/Tabbar';
import TabbarItemGeneral from '../../../common/Tabbar/Item/General';
import TabbarItemPrimary from '../../../common/Tabbar/Item/Primary';
import style from './style.module.scss';

const dataByPath = (function makeDataByPath() {
  const historyData = {
    className: style.history,
    appClassName: style.historyTab,
  };

  const bankingData = {
    className: style.banking,
    appClassName: style.bankingTab,
  };

  return {
    '/': {
      className: style.profile,
      appClassName: style.profileTab,
    },
    '/trading-history': historyData,
    '/trading-history/demo': historyData,
    '/gaming-history': historyData,
    '/gaming-history/mega5': historyData,
    '/deposit': bankingData,
    '/withdrawal': bankingData,
    '/security': {
      className: style.security,
      appClassName: style.securityTab,
    },
  };
}());

const Tabbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [
    className,
    setClassName,
  ] = useState<Nullable<string>>(function getInitClassName() {
    const data = dataByPath[location.pathname];
    return isObject(data) ? data.className : null;
  });

  useEffect(() => {
    const data = dataByPath[location.pathname];

    if (isObject(data)) {
      setClassName(data.className);

      window.appManager.addClass(data.appClassName);

      return () => {
        window.appManager.removeClass(data.appClassName);
      };
    }
  }, [
    className,
    location,
  ]);

  const onClickToProfile = () => {
    sounds.click();
    navigate('/');
  };

  const onClickToHistory = () => {
    sounds.click();
    navigate('/trading-history');
  };

  const onClickToBanking = () => {
    sounds.click();
    navigate('/deposit');
  };

  const onClickToSecurity = () => {
    sounds.click();
    navigate('/security');
  };

  const iconNode = <div className={style.icon} />;

  return (
    <BaseTabbar>
      <TabbarItemPrimary
        className={style.profile}
        icon={iconNode}
        onClick={onClickToProfile}
        text="Profile"
      />
      <TabbarItemPrimary
        className={style.history}
        icon={iconNode}
        onClick={onClickToHistory}
        text="History"
      />
      <TabbarItemGeneral
        className={style.general}
        href="/support"
      >
        {iconNode}
      </TabbarItemGeneral>
      <TabbarItemPrimary
        className={style.banking}
        icon={iconNode}
        onClick={onClickToBanking}
        text="Banking"
      />
      <TabbarItemPrimary
        className={style.security}
        icon={iconNode}
        onClick={onClickToSecurity}
        text="Security"
      />
    </BaseTabbar>
  );
};

export default Tabbar;
