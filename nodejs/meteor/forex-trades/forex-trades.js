import Currencies from '../currencies';
import RedisStack from '../redis-stack';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { CRMApi } from '../crm/crm.js';
import { Assets } from '../assets/assets.js';
import { CRMAccounts } from '../crm-accounts/crm-accounts.js';
import { CFDAndForexTrades } from '../cfd-and-forex-trades/cfd-and-forex-trades.js';

export const ForexTrades = {
  CloseCollection: new Mongo.Collection('forexCloseTrades'),
  typesRelToPointPart: {},
  KEY: 'forex',
};

const availableTypes = {
	buy: {
		pointPart: 'ask',
	},
	sell: {
		pointPart: 'bid',
	}
};

for (const availableType in availableTypes) {
	const availableTypeData = availableTypes[availableType];
	ForexTrades.typesRelToPointPart[availableType] = availableTypeData.pointPart;
	const checkMethodName = `is${availableType.capitalizeFirstLetter()}`;
	eval(`ForexTrades['${checkMethodName}'] = function(type) { return type === '${availableType}'; };`)
}

if (Meteor.isServer) {
	const { ServerConfig } = require('../server-config/server-config.js');
	let MIN_MARGIN_LEVEL = ServerConfig.getOption('minMarginLevel');

	ServerConfig.subscribe('minMarginLevel', (newValue) => {
		MIN_MARGIN_LEVEL = newValue;
	});

	const ITERATE_FUNCS = {};
	const applyStopLossAndTakeProfitOrError = (data, maxOffset) => {
	  // Stop loss
	  if (has.call(data, 'stopLoss')) {
      const stopLoss = parseFloat(data.stopLoss);

      if (isNaN(stopLoss)) {
        return new Error(`Stop loss (${data.stopLoss}) attribute must have "Number" type`);
      }

      data.stopLoss = stopLoss;

      if (ForexTrades.isBuy(data.type)) {
        if (data.openPrice < stopLoss + maxOffset) {
          return new Error(`Stop loss (${stopLoss}) must be less than open price (${data.openPrice}) on ${maxOffset} pips`);
        }
      } else if (ForexTrades.isSell(data.type)) {
        if (data.openPrice > stopLoss - maxOffset) {
          return new Error(`Stop loss (${stopLoss}) must be great than open price (${data.openPrice}) on ${maxOffset} pips`);
        }
      } else {
	      data.stopLoss = null;
      }
    }

    // Take profit
    if (has.call(data, 'takeProfit')) {
      const takeProfit = parseFloat(data.takeProfit);

      if (isNaN(takeProfit)) {
        return new Error(`Take profit (${data.takeProfit}) attribute must have "Number" type`);
      }

      data.takeProfit = takeProfit;

      if (ForexTrades.isBuy(data.type)) {
        if (data.openPrice > takeProfit - maxOffset) {
          return new Error(`Take profit (${takeProfit}) must be great than open price (${data.openPrice}) on ${maxOffset} pips`);
        }
      } else if (ForexTrades.isSell(data.type)) {
        if (data.openPrice < takeProfit + maxOffset) {
          return new Error(`Take profit (${takeProfit}) must be less than open price (${data.openPrice}) on ${maxOffset} pips`);
        }
      } else {
		    data.takeProfit = null;
	    }
    }
  };

	// Init vars
	const equityByUsers = {};
	const netProfitByUsers = {};
	const marginByUsers = {};
	const marginLevelByUsers = {};
  const openTradesByUsers = {};
  const openTradesByAssetsName = {};
  const openTrades = {};
  const ordersByUsers = {};
  const ordersByAssetsName = {};
  const orders = {};

  // Helper functions
	const assetLastPoint = (assetName) => {
		return Assets.points.getAsset(assetName);
	};

  /*const orderBuyIteration = (order, withPoint) => {
    const ask = withPoint.ask;

    if (order.openPrice <= ask) {
      order.currentPrice = ask;
      convertOrderToTrade(order, withPoint);
    }
  };

  const orderSellIteration = (order, withPoint) => {
    const bid = withPoint.bid;

    if (order.openPrice >= bid) {
      order.currentPrice = bid;
      convertOrderToTrade(order, withPoint);
    }
  };*/

  const appendTrade = tradeData => {
	  const { asset, userId, id, type, convertAsset, convertAssetReversed, stopLoss, takeProfit, currency } = tradeData;
	  let funcName = `F_${type}`;

	  if (convertAsset) {
		  funcName += `_CA`;

		  if (convertAssetReversed) {
			  funcName += `_CAR`;
		  }
	  }

	  if (stopLoss) {
		  funcName += `_SL`;
	  }

	  if (takeProfit) {
		  funcName += `_TP`;
	  }

	  if (currency) {
		  funcName += `_${currency}`;
	  }

	  // create iterate function
	  if (!isFunction(ITERATE_FUNCS[funcName])) {
		  let funcBody = 'var basePrice = assetPrice(assetPoint);';
		  let pipFuncName = 'pipValueM';

			if (convertAsset) {
				funcBody += 'var convertAssetPoint = assetLastPoint(trade.convertAsset);';
				funcBody += 'var convertPrice = assetPrice(convertAssetPoint);';

				if (convertAssetReversed) {
					pipFuncName = 'pipValueD';
				}
			} else {
				funcBody += 'var convertPrice = 1;';
			}

			funcBody += `trade.pipValue = ${pipFuncName}(trade.volume, trade.pointStep, basePrice, convertPrice);`;
			const convertCurrency = Currencies[currency];

		  if (convertCurrency) {
			  funcBody += `var convertCurrencyPoint = assetLastPoint('${convertCurrency}');`;
			  funcBody += 'trade.pipValue /= assetPrice(convertCurrencyPoint);';
		  }

			let buySellBothActions = 'var intOpenPrice = parseInt(trade.openPrice / trade.pointStep);';
			buySellBothActions += 'var intCurrPrice = parseInt(trade.currentPrice / trade.pointStep);';

		  if (ForexTrades.isBuy(type)) {
			  funcBody += 'trade.currentPrice = assetPoint.ask;';
			  funcBody += buySellBothActions;
			  funcBody += 'trade.netProfit = (intCurrPrice - intOpenPrice) * trade.pipValue;';

			  if (stopLoss) {
				  funcBody += 'if (trade.currentPrice <= trade.stopLoss) { ForexTrades.closeTrade(trade, "Stop loss"); return true; }';
				}

				if (takeProfit) {
				  funcBody += 'if (trade.currentPrice >= trade.takeProfit) { ForexTrades.closeTrade(trade, "Take profit"); return true; }';
				}
		  } else if (ForexTrades.isSell(type)) {
			  funcBody += 'trade.currentPrice = assetPoint.bid;';
			  funcBody += buySellBothActions;
			  funcBody += 'trade.netProfit = (intOpenPrice - intCurrPrice) * trade.pipValue;';

			  if (stopLoss) {
				  funcBody += 'if (trade.currentPrice >= trade.stopLoss) { ForexTrades.closeTrade(trade, "Stop loss"); return true; }';
				}

				if (takeProfit) {
				  funcBody += 'if (trade.currentPrice <= trade.takeProfit) { ForexTrades.closeTrade(trade, "Take profit"); return true; }';
				}
		  } else {
			  return;
		  }

		  funcBody += `return false;`;
		  eval(`ITERATE_FUNCS[funcName] = (trade, assetPoint) => { ${funcBody} }`);
	  }

	  tradeData.funcName = funcName;

		if (!has.call(equityByUsers, userId)) {
      equityByUsers[userId] = CRMAccounts.getBalance(userId);
      netProfitByUsers[userId] = 0;
    }

    if (!has.call(marginByUsers, userId)) {
	    marginByUsers[userId] = 0;
    }

    if (!isObject(openTradesByAssetsName[asset])) {
      openTradesByAssetsName[asset] = {};
    }

    if (!isObject(openTradesByUsers[userId])) {
      openTradesByUsers[userId] = {};
    }

    openTrades[id] = tradeData;
    openTradesByAssetsName[asset][id] = tradeData;
    openTradesByUsers[userId][id] = tradeData;
    netProfitByUsers[userId] += (tradeData.netProfit - tradeData.spread);
    marginByUsers[userId] += tradeData.margin;
    //ForexTrades.handleSetNetProfitForUser(userId, netProfitByUsers[userId]);
    return tradeData;
  };

  /*const appendOrder = (orderData) => {
	  const { asset, userId, id } = orderData;
    let iterateFuncBody = 'function(pointData) { const self = this; ';
    iterateFuncBody += orderData.type == 'buy' ? 'orderBuyIteration(self, pointData); ' : 'orderSellIteration(self, pointData); ';
    iterateFuncBody += '};';
    eval(`orderData.iterate = ${iterateFuncBody}`);

    if (!isObject(ordersByAssetsName[asset])) {
      ordersByAssetsName[asset] = {};
    }

    if (!isObject(ordersByUsers[userId])) {
      ordersByUsers[userId] = {};
    }

		orders[id] = orderData;
    ordersByAssetsName[asset][id] = orderData;
    ordersByUsers[userId][id] = orderData;
    return orderData;
  };*/

  /*const convertOrderToTrade = (order, withPoint) => {
    const tradeData = { ...order };
    delete tradeData.iterate;
    const equity = ForexTrades.getEquityByUserId(tradeData.userId);
    ForexTrades.cancelOrder(order);
    tradeData.pipValue = CFDAndForexTrades.pipValue(tradeData.deposit, tradeData.leverage, assetData.ask, assetData.bid, tradeData.minPips);
    tradeData.spread *= tradeData.pipValue;
	  tradeData.netProfit = -tradeData.spread;
	  tradeData.closeValue = tradeData.deposit + tradeData.netProfit;
    const tradeIdOrError = CRMApi.openTradeRequest({ ...tradeData, equity }, ForexTrades.KEY);

    if (isError(tradeIdOrError)) {
	    return tradeIdOrError;
    }

    tradeData.id = tradeIdOrError;
    appendTrade(tradeData);
  };*/

  // Equity
  ForexTrades.getEquityByUserId = (userId) => {
	  return has.call(equityByUsers, userId) ? equityByUsers[userId] : 0;
  };

  // Margin
  ForexTrades.getMarginByUserId = (userId) => {
	  return has.call(marginByUsers, userId) ? marginByUsers[userId] : 0;
  };

  ForexTrades.getFreeMarginByUserId = (userId) => {
	  return ForexTrades.getEquityByUserId(userId) - ForexTrades.getMarginByUserId(userId);
  };

  ForexTrades.getMarginLevelByUserId = (userId) => {
	  return has.call(marginLevelByUsers, userId) ? marginLevelByUsers[userId] : 0;
  };

  // Trades getters
  ForexTrades.getTradesForUser = (userId) => {
    return openTradesByUsers[userId] || {};
  };

  ForexTrades.getTradesForAsset = (asset) => {
    return openTradesByAssetsName[asset] || {};
  };

  ForexTrades.getTradeById = (id) => {
    return openTrades[id];
  };

  // Orders getters
  ForexTrades.getOrdersForUser = (userId) => {
    return ordersByUsers[userId] || {};
  };

  ForexTrades.getOrdersForAsset = (asset) => {
    return ordersByAssetsName[asset] || {};
  };

  ForexTrades.getOrderById = (id) => {
    return orders[id];
  };

	// All trades/orders
	ForexTrades.getTrades = () => {
		const openTrades = CFDAndForexTrades.getTrades(ForexTrades.KEY);
    return openTrades;
  };

  /*ForexTrades.getOrders = () => {
	  const orders = CFDAndForexTrades.getOrders(ForexTrades.KEY);
    return orders;
  };*/

  // Append trade/order
  ForexTrades.newTrade = (tradeData) => {
	  if (!isObject(tradeData)) {
		  return new Error('Attribute "tradeData" must have "object" type');
	  }

	  const { type, userId, asset } = tradeData;

	  // check type
	  const pointPart = ForexTrades.typesRelToPointPart[type] || null;

		if (!pointPart) {
			return new Error(`Trade type is incorrect.Available types: ${(Object.keys(ForexTrades.typesRelToPointPart).join(',')).toUpperCase()}`);
		}

    // check user
	  if (!userId) {
		  return new Error('Attribute "userId" is required');
	  }

	  const userCRMData = CRMAccounts.infoFromUserId(userId);

	  if (!isObject(userCRMData)) {
      return new Error(`User with id "${userId}" not found`);
    }

    tradeData.client_id = userCRMData.id;
    tradeData.currency = userCRMData.currency;
    tradeData.id_pamm = parseInt(userCRMData.pammId) || 0;

		// check base asset
    if (!asset) {
		  return new Error('Attribute "asset" is required');
	  }

	  const assetData = assetLastPoint(asset);

    if (!isObject(assetData)) {
      return new Error(`Asset with name "${asset}" not found`);
    }

    const currAssetPrice = assetPrice(assetData);
    const startPrice = assetData[pointPart];
    const assetSettings = Meteor.call('assetSettings', asset);

	  if (!isObject(assetSettings)) {
		  return new Error(`Settings for "${asset}" asset not found`);
	  }

   	for (const option in assetSettings) {
	 		tradeData[option] = assetSettings[option];
   	}

   	tradeData.lot = parseFloat(tradeData.lot);

   	if (!tradeData.lot) {
	  	return new Error('Attribute "lot" is required');
   	}

   	if (!tradeData.leverage) {
	   	return new Error('Attribute "leverage" is required');
   	} else {
	   	const crmUserLeverage = parseFloat(userCRMData.leverage);

	   	if (!isNaN(crmUserLeverage)) {
		   	tradeData.leverage *= crmUserLeverage;
	   	}
   	}

	 	tradeData.volume = tradeData.contractSize * tradeData.lot;
   	let margin = tradeData.volume * currAssetPrice;
   	// check convert asset
   	tradeData.convertAssetReversed = tradeData.convertAssetReversed ? 1 : 0;
   	let pipValueFunc = pipValueM;
   	let convertPrice = 1;

   	if (tradeData.convertAsset) {
	  	const convertAssetData = assetLastPoint(tradeData.convertAsset);

	    if (!isObject(convertAssetData)) {
	      return new Error(`Asset with name "${convertAsset}" not found`);
	    }

	    convertPrice = assetPrice(convertAssetData);

	    if (tradeData.convertAssetReversed) {
	   		margin /= convertPrice;
		 		pipValueFunc = pipValueD;
	   	} else {
		  	margin *= convertPrice;
	   	}
   	}

   	const freeMargin = ForexTrades.getFreeMarginByUserId(tradeData.userId);
   	tradeData.margin = Math.round100(margin / tradeData.leverage);
    tradeData.pipValue = pipValueFunc(tradeData.volume, tradeData.pointStep, currAssetPrice, convertPrice);
    const convertCurrency = Currencies[tradeData.currency];

    if (convertCurrency) {
	    const convertCurrencyPoint = assetLastPoint(convertCurrency);
	    tradeData.pipValue /= assetPrice(convertCurrencyPoint);
    }

	  if (tradeData.margin > freeMargin) {
		  return new Error('Insufficient free margin');
	  }

    // spread
    tradeData.spreadPips = parseFloat(tradeData.spread) || 0;
    tradeData.spread = Math.round100(tradeData.spreadPips * tradeData.pipValue);

    if (tradeData.spread > tradeData.margin) {
	    return new Error(`Spread can't be great than margin`);
    }

    // finished
    tradeData.createdAt = (new Date()).getTime() / ONE_SECOND_IN_MS | 0;
    tradeData.currentPrice = startPrice;
    tradeData.openPrice = startPrice;
    tradeData.netProfit = 0;
    const applyError = applyStopLossAndTakeProfitOrError(tradeData, tradeData.pointStep * CFDAndForexTrades.sLtPPipsOffset);

    if (isError(applyError)) {
	    return applyError;
    }

    const CRMAnswer = CRMApi.GETRequestToCRMUri({
      ...tradeData,
      action: `forexOpenTrade`
    });

	  try {
	    const jsonData = JSON.parse(CRMAnswer);

	    if (isObject(jsonData)) {
		    const tradeCRMId = parseInt(jsonData.id);

		    if (tradeCRMId) {
			    tradeData.id = tradeCRMId;
			    return appendTrade(tradeData);
		    }

		    return new Error(jsonData.message || 'Unknown error');
		  }
    } catch (error) {
	    return error;
    }
  };

  /*ForexTrades.newOrder = function(orderData) {
	  const dataOrError = CFDAndForexTrades.newOrder(orderData, this.KEY);
    return isError(dataOrError) ? dataOrError : appendOrder(dataOrError);
  };*/

  // Close trade/order
	ForexTrades.closeTrade = (openTrade, closeBy) => {
		const { asset, id, userId } = openTrade;
	  openTrade.closeTime = (new Date()).getTime() / ONE_SECOND_IN_MS | 0;
	  openTrade.closePrice = openTrade.currentPrice;
	  delete openTrade.currentPrice;
	  const newProfitAndSpread = openTrade.netProfit - openTrade.spread;
	  openTrade.return =  openTrade.margin + newProfitAndSpread;
	  netProfitByUsers[userId] -= newProfitAndSpread;
	  marginByUsers[userId] -= openTrade.margin;
	  openTrade.netProfit = newProfitAndSpread;
    openTrade.closeBy = closeBy;
    delete openTrades[id];
    delete openTradesByAssetsName[asset][id];
    delete openTradesByUsers[userId][id];

    if (!Object.keys(openTradesByAssetsName[asset]).length) {
      delete openTradesByAssetsName[asset];
    }

    if (!Object.keys(openTradesByUsers[userId]).length) {
      delete openTradesByUsers[userId];
      netProfitByUsers[userId] = 0;
      marginByUsers[userId] = 0;
    }

    delete openTrade.funcName;

    try {
      const responseData = CRMApi.GETRequestToCRMUri({
        ...openTrade,
        action: `forexCloseTrade`,
      });

	    const jsonData = JSON.parse(responseData);
	    CRMAccounts.setBalanceForUser(userId, jsonData.balance, true);
    } catch (error) {
	    RedisStack.pushClosedForexTrade(openTrade);
	    ForexTrades.handleSetNetProfitForUser(userId, netProfitByUsers[userId]);
    }

    ForexTrades.CloseCollection.insert(openTrade);
    return openTrade;
  };

  ForexTrades.handleUpdateBalanceForUser = (userId, balance) => {
	   ForexTrades.handleSetNetProfitForUser(userId, has.call(netProfitByUsers, userId) ? netProfitByUsers[userId] : 0);
  };

  ForexTrades.handleSetNetProfitForUser = (userId, netProfit) => {
	  const balance = CRMAccounts.getBalance(userId);
	  const equity = balance + netProfit;
	  const margin = marginByUsers[userId];
	  const marginLevel = margin == 0 ? 0 : equity / margin * 100;
	  netProfitByUsers[userId] = netProfit;
	  equityByUsers[userId] = equity;
	  marginLevelByUsers[userId] = marginLevel;

    if (equity <= 0 || marginLevel <= MIN_MARGIN_LEVEL) {
      ForexTrades.closeTradeWithMaxNetProfitForUser(userId);
    }
  };

  // Others
  ForexTrades.closeTradeWithMaxNetProfitForUser = (userId) => {
	  let needTrade = null;
    const trades = ForexTrades.getTradesForUser(userId);

    for (const tradeId in trades) {
      const trade = trades[tradeId];

			if (!needTrade) {
				needTrade = trade;
			} else if (trade.netProfit < needTrade.netProfit) {
				needTrade = trade;
			}
    }

    if (needTrade) {
      ForexTrades.closeTrade(needTrade, 'Stop out');
    }
  };

  // Iterate
  ForexTrades.applyPoint = (asset) => {
	  const openTrades = ForexTrades.getTradesForAsset(asset.name);

    for (const tradeId in openTrades) {
      const openTrade = openTrades[tradeId];
      let userNetProfit = netProfitByUsers[openTrade.userId];
      const oldNetProfit = openTrade.netProfit;
      const willClosed = ITERATE_FUNCS[openTrade.funcName](openTrade, asset);

      if (!willClosed) {
        userNetProfit -= oldNetProfit;
        userNetProfit += openTrade.netProfit;
				ForexTrades.handleSetNetProfitForUser(openTrade.userId, userNetProfit);
      }
    }
  };

  // Fill variables after sturtup system...
  Meteor.startup(() => {
	  CRMAccounts.didInit(() => {
		  const forexTrades = ForexTrades.getTrades();

		  for (let i = 0; i < forexTrades.length; i += 1) {
			  const trade = forexTrades[i];
			  appendTrade(trade);
		  }
	  });
  });
}
