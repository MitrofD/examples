import { ForexTrades } from '../forex-trades.js';

['userId', 'asset'].forEach((indexName) => {
  const indexObj = {};
  indexObj[indexName] = 1;
  ForexTrades.CloseCollection._ensureIndex(indexObj);
});
