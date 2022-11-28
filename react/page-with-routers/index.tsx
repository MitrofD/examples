import { hot } from 'react-hot-loader/root';
import React, {
  Fragment,
  Suspense,
  lazy,
} from 'react';

import {
  Navigate,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';

import SimpleBar from 'simplebar-react';
import Spin from 'components/spins/DoubleBounceSpin';
import { withUser } from 'contexts/user';
import { Type } from 'api/game';
import { Mode } from 'api/settings';
import { isObject } from 'api/tools';
import Tabbar from './Tabbar';
import DuelsRoomInfo from '../../common/RoomInfo/Duels';
import LeftSidebar from '../../common/LeftSidebar';
import Mega5RoomInfo from '../../common/RoomInfo/Mega5';
import MobileOnly from '../../common/MobileOnly';
import TradeRoomInfo from '../../common/RoomInfo/Trade';
import style from './style.module.scss';
import 'simplebar-react/dist/simplebar.min.css';

const pageLoader = (relativePath) => lazy(() => import(`./${relativePath}`));

const GamingHistory = pageLoader('history/Gaming');
const Security = pageLoader('Security');
const Settings = pageLoader('Settings');
const TradingHistory = pageLoader('history/Trading');

type Props = UserContext.Props;

const Profile = (props: Props) => {
  let content: React.ReactNode = null;

  const getMenuItemClassName = (item) => {
    let retClassName = style.item;

    if (item.isActive) {
      retClassName += ` ${style.active}`;
    }

    return retClassName;
  };

  if (props.user === undefined) {
    content = <Spin />;
  } else if (isObject(props.user)) {

    content = (
      <Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={<Settings data={props.user} />}
          />
          <Route path="trading-history">
            <Route
              path=""
              element={<TradingHistory mode={Mode.Live} />}
            />
            <Route
              path="demo"
              element={<TradingHistory mode={Mode.Demo} />}
            />
          </Route>
          <Route path="gaming-history">
            <Route
              path=""
              element={<GamingHistory type={Type.Duel} />}
            />
            {
            /*
            <Route
              path="classic"
              element={<GamingHistory type={Type.Classic} />}
            />
            */
            }
            <Route
              path="mega5"
              element={<GamingHistory type={Type.Mega5} />}
            />
          </Route>
          <Route
            path="deposit"
            element={<h1>Deposit</h1>}
          />
          <Route
            path="withdrawal"
            element={<h1>Withdrawal</h1>}
          />
          <Route
            path="security"
            element={<Security />}
          />
          <Route
            path="*"
            element={(
              <Navigate
                replace
                to="/"
              />
            )}
          />
        </Routes>
      </Suspense>
    );
  } else {
    window.location.href = '/';
  }

  return (
    <Fragment>
      <LeftSidebar>
        {/*<TradeRoomInfo />*/}
        <DuelsRoomInfo />
        <Mega5RoomInfo />
      </LeftSidebar>
      <div className={style.root}>
        <div className={style.inner}>
          <div className={style.content}>
            <ul className={style.menu}>
              <li className={`${style.item} ${style.profile}`}>
                <NavLink
                  to="/"
                  className={getMenuItemClassName}
                >
                  USER PROFILE
                </NavLink>
              </li>
              {/*<li className={`${style.item} ${style.history}`}>*/}
              {/*  <NavLink*/}
              {/*    to="trading-history"*/}
              {/*    className={getMenuItemClassName}*/}
              {/*  >*/}
              {/*    TRADING HISTORY*/}
              {/*  </NavLink>*/}
              {/*  <ul className={style.submenu}>*/}
              {/*    <li className={style.item}>*/}
              {/*      <NavLink*/}
              {/*        end*/}
              {/*        to="trading-history"*/}
              {/*        className={getMenuItemClassName}*/}
              {/*      >*/}
              {/*        LIVE ACCOUNT*/}
              {/*      </NavLink>*/}
              {/*    </li>*/}
              {/*    <li className={style.item}>*/}
              {/*      <NavLink*/}
              {/*        to="trading-history/demo"*/}
              {/*        className={getMenuItemClassName}*/}
              {/*      >*/}
              {/*        DEMO ACCOUNT*/}
              {/*      </NavLink>*/}
              {/*    </li>*/}
              {/*  </ul>*/}
              {/*</li>*/}
              <li className={`${style.item} ${style.history}`}>
                <NavLink
                  to="gaming-history"
                  className={getMenuItemClassName}
                >
                  GAMING HISTORY
                </NavLink>
                <ul className={style.submenu}>
                  <li className={style.item}>
                    <NavLink
                      end
                      to="gaming-history"
                      className={getMenuItemClassName}
                    >
                      DUELS
                    </NavLink>
                  </li>
                  {
                  /*
                    <li className={style.item}>
                      <NavLink
                        to="gaming-history/classic"
                        className={getMenuItemClassName}
                      >
                        CLASSIC
                      </NavLink>
                    </li>
                  */
                  }
                  <li className={style.item}>
                    <NavLink
                      to="gaming-history/mega5"
                      className={getMenuItemClassName}
                    >
                      MEGA5
                    </NavLink>
                  </li>
                </ul>
              </li>
              <li className={`${style.item} ${style.banking}`}>
                <NavLink
                  to="deposit"
                  className={getMenuItemClassName}
                >
                  DEPOSIT
                </NavLink>
              </li>
              <li className={`${style.item} ${style.banking}`}>
                <NavLink
                  to="withdrawal"
                  className={getMenuItemClassName}
                >
                  WITHDRAWAL
                </NavLink>
              </li>
              <li className={`${style.item} ${style.security}`}>
                <NavLink
                  to="security"
                  className={getMenuItemClassName}
                >
                  SECURITY
                </NavLink>
              </li>
            </ul>
            <SimpleBar className={style.data}>
              {content}
            </SimpleBar>
          </div>
        </div>
      </div>
      <MobileOnly>
        <Tabbar />
      </MobileOnly>
    </Fragment>
  );
};

export default hot(withUser(Profile));
