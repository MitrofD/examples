import React, {
  Fragment,
} from 'react';

import SimpleBar from 'simplebar-react';
import LoadableImage from 'components/LoadableImage';
import Spin from 'components/spins/DoubleBounceSpin';
import {
  BetStatus,
  Type,
  getBetsByGameId,
} from 'api/game';

import style from './style.module.scss';
import { getPrettyTimeParts } from '../../../../../../common/helper';
import commonStyle from '../../style.module.scss';
import 'simplebar-react/dist/simplebar.min.css';

type Item = {
  createdAt: string;
  id: number;
  nodeOfPrize: React.ReactNode;
  nodeOfUser: React.ReactNode;
  price: Nullable<number>;
};

type Items = Item[];

type Props = {
  id: number;
  price: number;
  scale: number;
  className?: string;
  // eslint-disable-next-line react/no-unused-prop-types
  gameStatus?: string;
  gameType: Type;
  range: number;
};

type State = {
  isXHR: boolean;
  items: Items;
};

class Bets extends React.PureComponent<Props, State> {
  classNameOfList = commonStyle.list;

  nodeOfError: React.ReactNode = null;

  unmounted = true;

  constructor(props: Props, context: null) {
    super(props, context);

    if (typeof props.className === 'string') {
      this.classNameOfList += ` ${props.className}`;
    }

    this.state = {
      isXHR: true,
      items: [],
    };
  }

  componentDidMount() {
    this.unmounted = false;
    this.loadData();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.id !== this.props.id) {
      this.loadData();
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  loadData() {
    this.nodeOfError = null;

    this.setState({
      isXHR: true,
    });

    getBetsByGameId(this.props.id).then((unsortedBets) => {
      const items: Items = [];
      const bets = unsortedBets.sort((fBet, sBet) => {
        if (fBet.prize === sBet.prize) {
          return 0;
        }

        return fBet.prize > sBet.prize ? 1 : -1;
      });

      const lengthOfBets = bets.length;
      let i = 0;

      for (; i < lengthOfBets; i += 1) {
        const bet = bets[i];
        const dateOfCreatedAtParts = getPrettyTimeParts(bet.createdAt);
        let prizeClassName = commonStyle.prize;

        if (bet.status === BetStatus.Loss) {
          prizeClassName += ` ${commonStyle.loss}`;
        } else if (bet.status === BetStatus.Win) {
          prizeClassName += ` ${commonStyle.win}`;
        }

        items[i] = {
          createdAt: `${dateOfCreatedAtParts.date}/${dateOfCreatedAtParts.month} ${dateOfCreatedAtParts.hours}:${dateOfCreatedAtParts.minutes}:${dateOfCreatedAtParts.seconds}`,
          id: bet.id,
          nodeOfPrize: (
            <div className={prizeClassName}>
              {bet.status !== BetStatus.Canceled ? '$' + bet.prize : '--'}
            </div>
          ),

          nodeOfUser: (
            <div className={style.user}>
              {/*<div className={style.avatar}>*/}
              {/*  <LoadableImage src={bet.userAvatarPath} />*/}
              {/*</div>*/}
              <div className={style.info}>
                <div className={style.name}>
                  {bet.userName}
                </div>
              </div>
            </div>
          ),

          price: bet.price,
        };
      }

      this.setStateSafe({
        items,
        isXHR: false,
      });
    }).catch((error) => {
      this.nodeOfError = (
        <tr>
          <td
            className={commonStyle.error}
            colSpan={6}
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
      isXHR,
      items,
    } = this.state;

    let content: React.ReactNode = null;

    if (isXHR) {
      content = (
        <tr>
          <td
            className={commonStyle.loading}
            colSpan={6}
          >
            <Spin />
          </td>
        </tr>
      );
    } else if (items.length > 0) {
      content = (
        <Fragment>
          {items.map((item) => {
            // const distance = Math.abs(item.price - this.props.price);

            let textOfPrice = '--';
            let textOfDistance = '--';
            let textOfClosedPrice = '--';

            // if (item.price !== null) {
            if (item.price > 0) {
              textOfPrice = item.price.toFixed(this.props.scale);
              const distance = Math.abs(this.props.price - item.price - this.props.range);
              textOfDistance = distance.toFixed(this.props.scale);
            }

            if (this.props.price !== null) {
              textOfClosedPrice = this.props.price.toFixed(this.props.scale);
            }

            return (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.nodeOfUser}</td>
                <td>{item.createdAt}</td>
                {/*<td>{item.price.toFixed(this.props.scale)}</td>*/}
                <td>{this.props.gameType !== Type.Mega5 ? textOfPrice : `${(item.price - this.props.range).toFixed(this.props.scale)}-${(item.price + this.props.range).toFixed(this.props.scale)}`}</td>
                {/*<td>{this.props.price.toFixed(this.props.scale)}</td>*/}
                <td>{textOfClosedPrice}</td>
                {/*<td>{distance.toFixed(this.props.scale)}</td>*/}
                <td>{textOfDistance}</td>
                <td>{item.nodeOfPrize}</td>
              </tr>
            );
          })}
        </Fragment>
      );
    } else {
      content = (
        <tr>
          <td
            className={commonStyle.empty}
            colSpan={6}
          >
            Don't Have Bets
          </td>
        </tr>
      );
    }

    return (
      <div className={`${style.root} ${commonStyle.root}`}>
        <div className={style.title}>
          Bets of Game #{this.props.id}
        </div>
        <SimpleBar>
          <table className={this.classNameOfList}>
            <thead>
              <tr>
                <th>ID</th>
                <th>USER</th>
                <th>STRIKE TIME (UTC)</th>
                <th>TARGET {this.props.gameType === Type.Mega5 ? 'CORRIDOR' : ' RATE'}</th>
                <th>{this.props.gameStatus !== 'CLOSED' ? 'CURRENT' : 'CLOSING'} RATE</th>
                <th>DISTANCE</th>
                <th>WINNING</th>
              </tr>
            </thead>
            <tbody>
              {this.nodeOfError}
              {content}
            </tbody>
          </table>
        </SimpleBar>
      </div>
    );
  }
}

export default Bets;
