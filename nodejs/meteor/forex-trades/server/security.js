import { ForexTrades } from '../forex-trades.js';

ForexTrades.CloseCollection.deny({
  insert() {
    return true;
  },

  update() {
    return true;
  },

  remove() {
    return true;
  }
});
