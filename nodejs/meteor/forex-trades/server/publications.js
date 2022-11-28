import { Meteor } from 'meteor/meteor';
import { ForexTrades } from '../forex-trades.js';

Meteor.publish('forex.closeTrades.my', function() {
  return ForexTrades.CloseCollection.find({
    userId: this.userId
  }, {
    offset: 0,
    limit: 30,
    sort: {
      closeTime: -1
    }
  });
});
