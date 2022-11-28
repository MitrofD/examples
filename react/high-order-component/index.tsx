import React, {
  useEffect,
  useState,
} from 'react';

import {
  Type,
  getPureStatus,
} from 'api/game';

import {
  getMega5,
  getPureMega5,
} from 'api/game/mega5';

import settings from 'api/settings';
import {
  getDateWithGMTOffset,
  isObject,
} from 'api/tools';

import { authData } from 'api/user';
import {
  getStorageOfWSBets,
  makeWSListenerWithType,
} from '../helper';

type Options = Partial<{
  authDependency: boolean;
}>;

const wsListen = makeWSListenerWithType(Type.Mega5);

const withMega5 = <P extends object>(Component: React.ComponentType<P>, options?: Options): React.FC<Omit<P, keyof WithMega5.Props>> => (props) => {
  const [
    mega5,
    setMega5,
  ] = useState<WithMega5.Data>(null);

  useEffect(() => {
    let unmounted = false;
    let authDataSubId: Nullable<string> = null;
    let isSynchronizationMode = false;
    let wsUnlisten: Nullable<Function> = null;

    const wsUnlistenIfNeeded = () => {
      if (typeof wsUnlisten === 'function') {
        wsUnlisten();
      }

      wsUnlisten = null;
    };

    const safeSetData = (newMega5: WithMega5.Data) => {
      if (unmounted) {
        return;
      }

      let additionalGame: Nullable<Mega5.Game> = null;
      let baseGame: Nullable<Mega5.Game> = null;

      if (newMega5 instanceof Error) {
        setMega5(newMega5);
      } else if (isObject(newMega5)) {
        additionalGame = newMega5.additional;
        baseGame = newMega5.base;
        setMega5(newMega5);
      } else {
        setMega5(new Error('Game not found'));
      }

      isSynchronizationMode = false;

      const wsHandler = (dataOfGame) => {
        const game = getPureMega5(dataOfGame);

        // Set new game
        if (isObject(game)) {
          setMega5({
            additional: baseGame,
            base: game,
          });

          additionalGame = baseGame;
          baseGame = game;
        // Update game
        } else if (baseGame) {
          baseGame = Object.assign({}, baseGame);
          const newStatus = getPureStatus(dataOfGame.status);

          if (newStatus !== null) {
            baseGame.status = newStatus;
          }

          if (typeof dataOfGame.placingBetsTime === 'number') {
            baseGame.placingBetsTime = getDateWithGMTOffset(dataOfGame.placingBetsTime);
          }

          if (typeof dataOfGame.expiryTime === 'number') {
            baseGame.expireTime = getDateWithGMTOffset(dataOfGame.expiryTime);
          }

          if (typeof dataOfGame.closingRate === 'number') {
            baseGame.closedPrice = dataOfGame.closingRate;
          }

          const bets = Object.values(getStorageOfWSBets(dataOfGame.bets));
          const lengthOfBets = bets.length;

          if (lengthOfBets > 0) {
            const newBets: Mega5.Bets = [];
            let i = 0;

            for (; i < lengthOfBets; i += 1) {
              const bet = bets[i];

              newBets[i] = Object.assign(bet, {
                priceFrom: bet.price - baseGame.range,
                priceTo: bet.price + baseGame.range,
              });
            }

            baseGame.bets = baseGame.bets.concat(newBets);
          }

          setMega5({
            additional: additionalGame,
            base: baseGame,
          });
        }
      };

      /*
      setTimeout(() => {
        // eslint-disable-next-line
        const data = {"id":431,"type":20,"status":50,"closingRate":24004.210000000000000000,"bets":[{"id":556,"userId":2,"status":20, "returnMoney": 177, "strikeTime":1660329048000}]};
        console.log(data);
        wsHandler(data);
      }, 5000);
      */

      wsUnlisten = wsListen(wsHandler);
    };

    const synchronization = () => {
      if (isSynchronizationMode) {
        return;
      }

      wsUnlistenIfNeeded();
      isSynchronizationMode = true;
      getMega5().then(safeSetData).catch(safeSetData);
    };

    synchronization();

    if (isObject(options) && options.authDependency) {
      authDataSubId = settings.subscribe(authData.settingsName, synchronization);
    }

    return () => {
      wsUnlistenIfNeeded();

      if (typeof authDataSubId === 'string') {
        settings.unsubscribe(authDataSubId);
      }

      authDataSubId = null;
      unmounted = true;
    };
  }, [
    setMega5,
  ]);

  return (
    <Component
      {...props as P}
      mega5={mega5}
    />
  );
};

export default withMega5;
