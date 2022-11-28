import React, {
  Fragment,
} from 'react';
import SimpleBar from 'simplebar-react';
import {
  BetStatus,
  Type,
  getHistory,
} from 'api/game';

import Modal from 'components/Modal';
import Spin from 'components/spins/DoubleBounceSpin';
import sounds from 'api/sounds';
import {
  asArray,
  asNumber,
  getDateWithGMTOffset,
  getStringOr,
  isObject,
} from 'api/tools';

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
  items: Gaming.ClosedItem[];
  page: number;
};

class ClosedList extends React.PureComponent<Props, State> {
  nodeOfError: React.ReactNode = null;

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

  loadData() {
    this.nodeOfError = null;

    this.setState({
      isShownBets: false,
      isXHR: true,
    });

    getHistory(this.props.type, {
      dateRange: this.props.formattedDate,
      page: this.state.page,
    }, true).then((data) => {
      const stateItems: Gaming.ClosedItem[] = [];
      let lengthOfStateItems = 0;

      const items = asArray(data.items);
      const lengthOfItems = items.length;
      let i = 0;

      for (; i < lengthOfItems; i += 1) {
        const item = items[i];

        if (isObject(item)) {
          const dateOfCreatedAt = getDateWithGMTOffset(+item.strikeTime * 1000);
          const dateOfExpiryTime = getDateWithGMTOffset(+item.expiryTime * 1000);

          if (!Number.isNaN(dateOfCreatedAt.getMonth()) && !Number.isNaN(dateOfExpiryTime.getMonth())) {
            const dateOfCreatedAtParts = getPrettyTimeParts(dateOfCreatedAt);
            const dateOfExpiryTimeParts = getPrettyTimeParts(dateOfExpiryTime);

            let prizeClassName = style.prize;

            if (item.betStatus === BetStatus.Loss) {
              prizeClassName += ` ${style.loss}`;
            } else if (item.betStatus === BetStatus.Win) {
              prizeClassName += ` ${style.win}`;
            }

            stateItems[lengthOfStateItems] = {
              amount: asNumber(item.amount),
              createdAt: `${dateOfCreatedAtParts.date}/${dateOfCreatedAtParts.month} ${dateOfCreatedAtParts.hours}:${dateOfCreatedAtParts.minutes}:${dateOfCreatedAtParts.seconds}`,
              closedPrice:  item.closingRate ? asNumber(item.closingRate) : null,
              expireTime: `${dateOfExpiryTimeParts.date}/${dateOfExpiryTimeParts.month} ${dateOfExpiryTimeParts.hours}:${dateOfExpiryTimeParts.minutes}:${dateOfExpiryTimeParts.seconds}`,
              id: asNumber(item.id),
              status: item.status,
              nodeOfPrize: (
                <div className={prizeClassName}>
                  {item.betStatus !== BetStatus.Canceled ? '$' + asNumber(item.returnMoney) : '--'}
                </div>
              ),

              // price: asNumber(item.targetRate),
              price: item.targetRate ? asNumber(item.targetRate) : null,
              setting: {
                id: asNumber(item.assetId),
                name: getStringOr(item.assetAbbr),
                scale: asNumber(item.assetScale),
                range: asNumber(item.range),
              },
            };

            lengthOfStateItems += 1;
          }
        }
      }

      this.setStateSafe({
        isXHR: false,
        items: stateItems,
      });
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
            let textOfClosedPrice = '--';

            if (item.price !== null) {
              textOfPrice = item.price.toFixed(item.setting.scale);
              const distance = Math.abs(item.closedPrice - item.price - item.setting.range);
              textOfDistance = distance.toFixed(item.setting.scale);
            }

            if (item.closedPrice !== null) {
              textOfClosedPrice = item.closedPrice.toFixed(item.setting.scale);
            }

            if (idOfActiveGame === item.id) {
              priceOfActiveGame = item.closedPrice;
              scaleOfActiveGame = item.setting.scale;
              rangeOfActiveGame = item.setting.range;
            }

            return (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.setting.name}</td>
                <td>{item.createdAt}</td>
                <td>{item.expireTime}</td>
                <td>{this.props.type !== Type.Mega5 ? textOfPrice : `${(item.price - item.setting.range).toFixed(item.setting.scale)}-${(item.price + item.setting.range).toFixed(item.setting.scale)}`}</td>
                {/*<td>{item.closedPrice.toFixed(item.setting.scale)}</td>*/}
                {/*<td>{distance.toFixed(item.setting.scale)}</td>*/}
                <td>{textOfClosedPrice}</td>
                <td>{textOfDistance}</td>
                <td>${item.amount}</td>
                <td>{item.nodeOfPrize}</td>
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
            Don't Have Open Games
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
              id={idOfActiveGame}
              price={priceOfActiveGame}
              scale={scaleOfActiveGame}
              // gameStatus={items[idOfActiveGame].status}
              gameStatus={'CLOSED'}
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
              <th>TARGET {this.props.type === Type.Mega5 ? 'CORRIDOR' : ' RATE'}</th>
              <th>CLOSING RATE</th>
              <th>DISTANCE</th>
              <th>AMOUNT</th>
              <th>WINNING</th>
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

export default ClosedList;
