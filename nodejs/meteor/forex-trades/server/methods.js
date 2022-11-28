import { Meteor } from 'meteor/meteor';
import { CRMAccounts } from '../../crm-accounts/crm-accounts.js';
import { ForexTrades } from '../forex-trades.js';

Meteor.methods({
	forexTradeNew(data) {
		const errorTitle = 'New forex trade';
		const { userId } = this;

    if (!userId) {
      throw new Meteor.Error('Permission denied', errorTitle);
    }

    const dataOrError = ForexTrades.newTrade({
			...data,
			userId,
		});

		if (isError(dataOrError)) {
	  	throw new Meteor.Error(dataOrError.message, errorTitle);
   	}

   	return dataOrError;
	},

	/*forexOrderNew(data) {
		const errorTitle = 'New forex order';
		const { userId } = this;

		if (!userId) {
      throw new Meteor.Error('Permission denied', errorTitle);
    }

    const dataOrError = ForexTrades.newOrder({ ...data, userId });

		if (isError(dataOrError)) {
	  	throw new Meteor.Error(dataOrError.message, errorTitle);
   	}

   	return dataOrError;
	},*/

  forexMyData() {
    const { userId } = this;
    const equity = ForexTrades.getEquityByUserId(userId);
    const margin = ForexTrades.getMarginByUserId(userId);
		const freeMargin = equity - margin;
		const marginLevel = ForexTrades.getMarginLevelByUserId(userId);

    return {
	    equity,
	    margin,
	    freeMargin,
	    marginLevel: isNaN(marginLevel) ? 0 : marginLevel,
      balance: CRMAccounts.getBalance(userId),
      openTrades: ForexTrades.getTradesForUser(userId),
      //orders: ForexTrades.getOrdersForUser(userId)
    };
  },

  forexCloseTrade(id) {
	  const user = Meteor.users.findOne(this.userId);
    const errorTitle = 'Close forex trade';

    if (!isObject(user)) {
      throw new Meteor.Error('Permission denied', errorTitle);
    }

    const trade = ForexTrades.getTradeById(id);

    if (!isObject(trade)) {
	    throw new Meteor.Error(`Trade with id "${id}" not found`, errorTitle);
    }

		if (isNumber(user.closeTradeTimeLimit)) {
			const timeNow = (new Date()).getTime() / ONE_SECOND_IN_MS | 0;
			const spentTime = timeNow - trade.createdAt;

			if (spentTime <= user.closeTradeTimeLimit) {
				const minutes = user.closeTradeTimeLimit / 60;
				const minutesText = `${minutes.toFixed(2)} minute${minutes >= 2 ? 's' : ''}`;
				throw new Meteor.Error(errorTitle, `The trade cannot be closed at this time. All trades must be open for a minimum time period of ${minutesText}`);
			}
		}

    const error = ForexTrades.closeTrade(trade, 'User');

    if (isError(error)) {
	    throw new Meteor.Error(errorTitle, error.message);
    }
  },

  forexCancelOrder(id) {
	  const { userId } = this;
    const errorTitle = 'Cancel forex order';

    if (!userId) {
      throw new Meteor.Error('Permission denied', errorTitle);
    }

    const order = ForexTrades.getOrderById(id);

    if (!isObject(order)) {
      throw new Meteor.Error(`Order with id "${id}" not found`, errorTitle);
    }

		const error = ForexTrades.cancelOrder(order, 'User');

    if (isError(error)) {
	    throw new Meteor.Error(error.message, errorTitle);
    }
  }
});
