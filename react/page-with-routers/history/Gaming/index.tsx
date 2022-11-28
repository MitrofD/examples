import React, {
  useState,
} from 'react';

import { subMonths } from 'date-fns';
import { Type } from 'api/game';
import { getDateWithGMTOffset } from 'api/tools';
import ClosedList from './ClosedList';
import OpenList from './OpenList';
import Breadcrumbs from '../Breadcrumbs';
import DateRangePicker from '../DateRangePicker';
import Dropdown from '../Dropdown';
import { getPrettyTimeParts } from '../../../../../common/helper';
import commonStyle from '../style.module.scss';

enum State {
  OpenGames = 'Open Games',
  ClosedGames = 'Closed Games',
}

type Props = {
  type: Type;
};

/*
type HistoryItem = {
  amount: number;
  assetName: string;
  className: string;
  expireTime: string;
  id: number;
  payout: number;
  price: number;
  prize: number;
  refund: number;
  assetScale: number;
  settingId: number;
  strikePrice: number;
  strikeTime: string;
};

type HistoryItems = HistoryItem[];

type Response = {
  items: HistoryItems;
};
*/

/*
const loadingContent = (
  <tr>
    <td
      className={commonStyle.loading}
      colSpan={9}
    >
      <Spin />
    </td>
  </tr>
);
*/

const getGameTypeTitle = (function genGetTypeTitleFunc() {
  const dict = {
    [Type.Duel]: 'Duels',
    [Type.Mega5]: 'Mega5',
    [Type.Classic]: 'Classic',
  };

  return (type: Type) => {
    const value = dict[type];
    return typeof value === 'string' ? value : '';
  };
}());

const Gaming = (props: Props) => {
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
    state: State.OpenGames,
  });

  /*
  const [
    content,
    setContent,
  ] = useState<React.ReactNode>(loadingContent);

  useEffect(() => {
    setContent(loadingContent);
    let unmounted = false;

    const setItems = (items: HistoryItems) => {
      if (unmounted) {
        return;
      }

      const itemsLength = items.length;
      let newContent: React.ReactNode = null;

      if (itemsLength === 0) {
        newContent = (
          <tr>
            <td
              className={commonStyle.empty}
              colSpan={11}
            >
              Don't Have {filter.state}
            </td>
          </tr>
        );
      }

      setContent(newContent);
    };

    const dateRangeFormat = getFromToFormat(filter.dateRange.from, filter.dateRange.to);

    const data = {
      accountType: props.type,
      dateRange: dateRangeFormat.replace(/\s+/g, ''),
      gameType: props.type,
      page: filter.page,
    };

    const getHistory = () => makePrivateRequest(() => new Promise<Response>((resolve, reject) => {
      request.make<Record<string, any>>(Method.Get, `/cabinet/game-history`, getPrivateRequestData({
        data,
        Type: RequestType.Array,
      })).then((response) => {
        const pureResponse = asObject(response.shift());

        resolve({
          items: [], // pureResponse.data,
        });
      }).catch(reject);
    }));

    Promise.all([
      getSettings(),
      getHistory(),
    ]).then(([
      settings,
    ]) => {
      setItems([]);
    }).catch(() => {
      setItems([]);
    });

    return () => {
      unmounted = true;
    };
  }, [
    filter,
    props.type,
    setContent,
  ]);
  */

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

  const fromDateParts = getPrettyTimeParts(filter.dateRange.from);
  const toDateParts = getPrettyTimeParts(filter.dateRange.to);
  const formattedDate = `${fromDateParts.date}/${fromDateParts.month}/${filter.dateRange.from.getFullYear()}-${toDateParts.date}/${toDateParts.month}/${filter.dateRange.to.getFullYear()}`;
  let content: React.ReactNode = null;

  if (filter.state === State.OpenGames) {
    content = (
      <OpenList
        formattedDate={formattedDate}
        type={props.type}
      />
    );
  } else {
    content = (
      <ClosedList
        formattedDate={formattedDate}
        type={props.type}
      />
    );
  }

  return (
    <div className={commonStyle.root}>
      <div className={commonStyle.control}>
        <Breadcrumbs items={[
          'Gaming History',
          getGameTypeTitle(props.type),
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
      {content}
    </div>
  );
};

export default Gaming;
