import React, {
  Fragment,
} from 'react';

import SimpleBar from 'simplebar-react';

import {
  Status,
  Type,
  getHistory,
  getPureStatus,
} from 'api/game';

import Modal from 'components/Modal';
import Spin from 'components/spins/DoubleBounceSpin';
import sounds from 'api/sounds';
import {
  asArray,
  asNumber,
  getDateWithGMTOffset,
  getStringOr,
  has,
  isObject,
} from 'api/tools';

import ws from 'api/ws';
import Bets from './Bets';
import { getPrettyTimeParts } from '../../../../../common/helper';
import style from '../style.module.scss';
import 'simplebar-react/dist/simplebar.min.css';

type Props = {
  formattedDate: string;
  type: Type;
};

type State = {
  idOfActiveGame: Nullable<number>;
  isShownBets: boolean;
  isXHR: boolean;
  items: Gaming.OpenItem[];
  page: number;
};

class OpenList extends React.PureComponent<Props, State> {
  titleOfStatus = {
    [Status.Draft]: 'Draft',
    [Status.CanJoin]: 'Pending',
    [Status.Open]: 'Open',
    [Status.Playing]: 'Playing',
    [Status.Closed]: 'Closed',
    [Status.Cancelled]: 'Cancelled',
  };

  clientOfWS: Nullable<WS.StreamClient> = null;

  nodeOfError: React.ReactNode = null;

  priceOfSettings: Record<number, number> = {};

  unmounted = true;

  constructor(props: Props, context: null) {
    super(props, context);

    this.state = {
      idOfActiveGame: null,
      isShownBets: false,
      isXHR: true,
      items: [],
      page: 1,
    };

    this.onClickToBets = this.onClickToBets.bind(this);
    this.onCloseModal = this.onCloseModal.bind(this);
  }

  componentDidMount() {
    this.unmounted = false;
    this.loadData();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.formattedDate !== this.props.formattedDate || prevProps.type !== this.props.type) {
      this.loadData();
    }
  }

  componentWillUnmount() {
    this.resetWSClientIfNeeded();
    this.unmounted = true;
  }

  onClickToBets(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const index = asNumber(event.currentTarget.dataset.idx);
    const game = this.state.items[index];

    if (isObject(game)) {
      sounds.click();

      this.setState({
        idOfActiveGame: game.id,
        isShownBets: true,
      });
    }
  }

  onCloseModal() {
    sounds.click();

    this.setState({
      isShownBets: false,
    });
  }

  getPriceBySettingId(settingId: number) {
    return has.call(this.priceOfSettings, settingId) ? this.priceOfSettings[settingId] : 0;
  }

  loadData() {
    this.resetWSClientIfNeeded();
    this.priceOfSettings = {};
    this.nodeOfError = null;

    this.setState({
      isShownBets: false,
      isXHR: true,
    });

    getHistory(this.props.type, {
      dateRange: this.props.formattedDate,
      page: this.state.page,
    }).then((data) => {
      const stateItems: Gaming.OpenItem[] = [];
      let lengthOfStateItems = 0;

      const items = asArray(data.items);
      const lengthOfItems = items.length;
      let i = 0;

      const storageOfSettingIds: Record<number, boolean> = {};

      for (; i < lengthOfItems; i += 1) {
        const item = items[i];

        if (isObject(item)) {
          const dateOfCreatedAt = getDateWithGMTOffset(+item.strikeTime * 1000);
          const dateOfExpiryTime = getDateWithGMTOffset(+item.expiryTime * 1000);

          if (!Number.isNaN(dateOfCreatedAt.getMonth()) && !Number.isNaN(dateOfExpiryTime.getMonth())) {
            const idOfSetting = asNumber(item.assetId);
            storageOfSettingIds[idOfSetting] = true;
            const dateOfCreatedAtParts = getPrettyTimeParts(dateOfCreatedAt);
            const dateOfExpiryTimeParts = getPrettyTimeParts(dateOfExpiryTime);
            const statusOfGame = getPureStatus(item.gameTableStatus);

            stateItems[lengthOfStateItems] = {
              amount: asNumber(item.amount),
              createdAt: `${dateOfCreatedAtParts.date}/${dateOfCreatedAtParts.month} ${dateOfCreatedAtParts.hours}:${dateOfCreatedAtParts.minutes}:${dateOfCreatedAtParts.seconds}`,
              expireTime: `${dateOfExpiryTimeParts.date}/${dateOfExpiryTimeParts.month} ${dateOfExpiryTimeParts.hours}:${dateOfExpiryTimeParts.minutes}:${dateOfExpiryTimeParts.seconds}`,
              id: asNumber(item.id),
              price: item.targetRate ? asNumber(item.targetRate) : null,
              setting: {
                id: idOfSetting,
                name: getStringOr(item.assetAbbr),
                scale: asNumber(item.assetScale),
                range: asNumber(item.range),
              },

              status: has.call(this.titleOfStatus, statusOfGame) ? this.titleOfStatus[statusOfGame] : 'Unknown status',
            };

            lengthOfStateItems += 1;
          }
        }
      }

      const settingsIds = Object.keys(storageOfSettingIds);

      const applyState = () => {
        this.setStateSafe({
          isXHR: false,
          items: stateItems,
        });
      };

      if (settingsIds.length > 0) {
        ws.stream('/asset/req-stream/rate', {
          data: settingsIds,
        }).then((client) => {
          this.clientOfWS = client;
          applyState();

          client.addListener((response) => {
            let dataOfPrice: Nullable<Record<string, any>> = null;

            try {
              dataOfPrice = JSON.parse(response);
            } catch (error) {}

            if (isObject(dataOfPrice)) {
              this.priceOfSettings[dataOfPrice.i] = dataOfPrice.r;
              this.forceUpdate();
            }
          });
        }).catch((error) => {
          throw error;
        });

        return;
      }

      applyState();
    }).catch((error) => {
      this.nodeOfError = (
        <tr>
          <td
            className={style.error}
            colSpan={9}
          >
            {error.message}
          </td>
        </tr>
      );

      this.setStateSafe({
        isXHR: false,
        items: [],
      });
    });
  }

  setStateSafe(state: Partial<State>) {
    if (this.unmounted) {
      return;
    }

    this.setState(state as State);
  }

  resetWSClientIfNeeded() {
    if (isObject(this.clientOfWS)) {
      this.clientOfWS.close();
      this.clientOfWS = null;
    }
  }

  render() {
    const {
      idOfActiveGame,
      isXHR,
      items,
    } = this.state;

    let priceOfActiveGame = 0;
    let scaleOfActiveGame = 0;
    let rangeOfActiveGame = 0;
    let content: React.ReactNode = null;

    if (isXHR) {
      content = (
        <tr>
          <td
            className={style.loading}
            colSpan={9}
          >
            <Spin />
          </td>
        </tr>
      );
    } else if (items.length > 0) {
      content = (
        <Fragment>
          {items.map((item, index) => {
            let textOfPrice = '--';
            let textOfDistance = '--';
            const currentPrice = this.getPriceBySettingId(item.setting.id);

            // if (item.price > 0) {
            if (item.price !== null) {
              textOfPrice = item.price.toFixed(item.setting.scale);
              const distance = Math.abs(currentPrice - item.price);
              textOfDistance = distance.toFixed(item.setting.scale);
            }

            if (idOfActiveGame === item.id) {
              priceOfActiveGame = currentPrice;
              scaleOfActiveGame = item.setting.scale;
              rangeOfActiveGame = item.setting.range;
            }

            return (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.setting.name}</td>
                <td>{item.createdAt}</td>
                <td>{item.expireTime}</td>
                <td>{textOfPrice}</td>
                <td>{currentPrice.toFixed(item.setting.scale)}</td>
                <td>{textOfDistance}</td>
                <td>${item.amount}</td>
                <td>{item.status}</td>
                <td>
                  <a
                    data-idx={index}
                    href="#!"
                    onClick={this.onClickToBets}
                  >
                    Bets
                  </a>
                </td>
              </tr>
            );
          })}
        </Fragment>
      );
    } else {
      content = (
        <tr>
          <td
            className={style.empty}
            colSpan={9}
          >
            No Open Games
          </td>
        </tr>
      );
    }

    return (
      <SimpleBar>
        {typeof idOfActiveGame === 'number' && (
          <Modal
            className={style.modal}
            onClickToClose={this.onCloseModal}
            show={this.state.isShownBets}
          >
            <Bets
              className={style.hideLast}
              id={idOfActiveGame}
              price={priceOfActiveGame}
              scale={scaleOfActiveGame}
              gameType={this.props.type}
              range={rangeOfActiveGame}
            />
          </Modal>
        )}
        <table className={style.list}>
          <thead>
            <tr>
              <th>ID</th>
              <th>ASSETS</th>
              <th>STRIKE TIME (UTC)</th>
              <th>EXPIRY TIME (UTC)</th>
              <th>TARGET RATE</th>
              <th>CURRENT RATE</th>
              <th>DISTANCE</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {this.nodeOfError}
            {content}
          </tbody>
        </table>
      </SimpleBar>
    );
  }
}

export default OpenList;
