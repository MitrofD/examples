import React, {
  useEffect,
  useState,
} from 'react';

import SimpleBar from 'simplebar-react';
import { subMonths } from 'date-fns';
import Spin from 'components/spins/DoubleBounceSpin';
import { Mode } from 'api/settings';
import {
  Direction,
  getSettings,
  history,
} from 'api/trade';

import {
  getDateWithGMTOffset,
  isArray,
  isObject,
} from 'api/tools';

import Breadcrumbs from '../Breadcrumbs';
import DateRangePicker from '../DateRangePicker';
import Dropdown from '../Dropdown';
import {
  getPrettyTime,
  getPrettyTimeParts,
} from '../../../../../common/helper';

import style from './style.module.scss';
import commonStyle from '../style.module.scss';
import 'simplebar-react/dist/simplebar.min.css';

enum State {
  OpenTrades = 'Open Trades',
  ClosedTrades = 'Closed Trades',
}

type HistoryItem = {
  amount: number;
  assetName: string;
  classNameOfDirection: string;
  classNameOfPrize: string;
  expireTime: string;
  id: number;
  payout: number;
  price: number;
  prize: number;
  refund: number;
  settingId: number;
  strikePrice: number;
  strikeTime: string;
};

type HistoryItems = HistoryItem[];

type Props = {
  mode: Mode;
};

const Trading = (props: Props) => {
  const [
    filter,
    setFilter,
  ] = useState({
    dateRange: (function getInitialDate() {
      const to = getDateWithGMTOffset(new Date());

      return {
        to,
        from: subMonths(to, 1),
      };
    }()),
    page: 1,
    state: State.OpenTrades,
  });

  const [
    historyItems,
    setHistoryItems,
  ] = useState<Nullable<HistoryItems>>(null);

  useEffect(() => {
    setHistoryItems(null);
    let unmounted = false;

    const safeSetHistoryItems = (newHistoryItems: HistoryItems) => {
      if (unmounted) {
        return;
      }

      setHistoryItems(newHistoryItems);
    };

    const fromDateParts = getPrettyTimeParts(filter.dateRange.from);
    const toDateParts = getPrettyTimeParts(filter.dateRange.to);

    const query = {
      accountType: props.mode,
      dateRange: `${fromDateParts.date}/${fromDateParts.month}/${filter.dateRange.from.getFullYear()}-${toDateParts.date}/${toDateParts.month}/${filter.dateRange.to.getFullYear()}`,
      page: filter.page,
    };

    Promise.all([
      getSettings(),
      filter.state === State.OpenTrades ? history.open(query) : history.closed(query),
    ]).then(([
      settings,
      trade,
    ]) => {
      const newItems: HistoryItems = [];
      let newItemsLength = 0;

      const tradeItems = trade.items;
      const tradeItemsLength = tradeItems.length;
      let i = 0;

      for (; i < tradeItemsLength; i += 1) {
        const tradeItem = tradeItems[i];
        const setting = settings[tradeItem.settingId];

        if (isObject(setting)) {
          const price = typeof tradeItem.closePrice === 'number' ? tradeItem.closePrice : setting.price;

          let classNameOfPrize = style.lose;
          let prizeOfItem = tradeItem.amount * tradeItem.refund;

          if (tradeItem.direction === Direction.Higher) {
            if (price > tradeItem.openPrice) {
              classNameOfPrize = style.win;
              prizeOfItem = tradeItem.amount * (1 + tradeItem.payout);
            }
          } else if (price < tradeItem.openPrice) {
            classNameOfPrize = style.win;
            prizeOfItem = tradeItem.amount * (1 + tradeItem.payout);
          }

          newItems[newItemsLength] = {
            classNameOfPrize,
            price,
            amount: tradeItem.amount,
            assetName: setting.name.replace('_', '/'),
            classNameOfDirection: tradeItem.direction === Direction.Higher ? style.higher : style.lower,
            expireTime: getPrettyTime(tradeItem.expireTime),
            id: tradeItem.id,
            payout: tradeItem.payout * 100,
            prize: +prizeOfItem.toFixed(2),
            refund: tradeItem.refund * 100,
            settingId: tradeItem.settingId,
            strikePrice: tradeItem.openPrice,
            strikeTime: getPrettyTime(tradeItem.createdAt),
          };

          newItemsLength += 1;
        }
      }

      safeSetHistoryItems(newItems);
    }).catch(() => {
      safeSetHistoryItems([]);
    });

    return () => {
      unmounted = true;
    };
  }, [
    filter,
    props.mode,
    setHistoryItems,
  ]);

  const onChangeState = (state: State) => {
    const newFilter = Object.assign({}, filter, {
      state,
    });

    setFilter(newFilter);
  };

  const onChangeDateRangePicker = (from, to) => {
    const newFilter = Object.assign({}, filter, {
      dateRange: {
        from,
        to,
      },
    });

    setFilter(newFilter);
  };

  let content: React.ReactNode = null;

  if (isArray(historyItems)) {
    const historyItemsLength = historyItems.length;

    if (historyItemsLength === 0) {
      content = (
        <tr>
          <td
            className={commonStyle.empty}
            colSpan={11}
          >
            No {filter.state}
          </td>
        </tr>
      );
    } else {
      const trs = [];
      let i = 0;

      for (; i < historyItemsLength; i += 1) {
        const historyItem = historyItems[i];

        trs[i] = (
          <tr key={i}>
            <td>{historyItem.id}</td>
            <td>{historyItem.assetName}</td>
            <td>{historyItem.strikeTime}</td>
            <td>{historyItem.expireTime}</td>
            <td className={style.direction}>
              <div className={historyItem.classNameOfDirection} />
            </td>
            <td>{historyItem.strikePrice}</td>
            { filter.state !== State.OpenTrades ? (
              <td>{historyItem.price}</td>
            ) : ('')
            }
            {/*<td>{historyItem.price}</td>*/}
            <td>${historyItem.amount}</td>
            <td>{historyItem.payout}%</td>
            <td>{historyItem.refund}%</td>
            <td className={historyItem.classNameOfPrize}>
              ${historyItem.prize}
            </td>
          </tr>
        );
      }

      content = trs;
    }
  } else {
    content = (
      <tr>
        <td
          className={commonStyle.loading}
          colSpan={11}
        >
          <Spin />
        </td>
      </tr>
    );
  }

  return (
    <div className={commonStyle.root}>
      <div className={commonStyle.control}>
        <Breadcrumbs items={[
          'Trading History',
          `${props.mode === Mode.Live ? 'Live' : 'Demo'} Account`,
        ]} />
        <div className={commonStyle.filters}>
          <Dropdown
            onChange={onChangeState}
            value={filter.state}
            items={Object.values(State)}
          />
          <DateRangePicker
            from={filter.dateRange.from}
            onChange={onChangeDateRangePicker}
            to={filter.dateRange.to}
          />
        </div>
      </div>
      <SimpleBar>
      <table className={`${commonStyle.list} ${style.list}`}>
        <thead>
          <tr>
            <th>ID</th>
            <th>ASSETS</th>
            <th>STRIKE TIME (UTC)</th>
            <th>EXPIRY TIME (UTC)</th>
            <th className={style.direction}>ORDER</th>
            <th>STRIKE RATE</th>
            { filter.state !== State.OpenTrades ? (
              <th>
                CLOSING RATE
              </th>
            ) : ('')
            }
            {/*<th>*/}
            {/*  {filter.state === State.OpenTrades ? 'CURRENT' : 'CLOSING'} RATE*/}
            {/*</th>*/}
            <th>AMOUNT</th>
            <th>PAYOUT</th>
            <th>REFUND</th>
            <th>RETURN</th>
          </tr>
        </thead>
        <tbody>
          {content}
        </tbody>
      </table>
      </SimpleBar>
    </div>
  );
};

export default Trading;
