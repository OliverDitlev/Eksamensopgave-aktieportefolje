const express = require('express')

const router = express.Router()

const { reqLogin, reqActive, convertCurrency } = require('../middleware.js');

router.get('/dashboard', reqLogin, reqActive, convertCurrency, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.user.user_id;

  // Henter værdier og data fra databasen
  const totalRealizedGain = await db.calculateTotalRealizedGain(userId);
  
  const totalUnrealizedGain = await db.calculateTotalUnrealizedGain(userId);
  const stocksStats = await db.findAllStocksForUser(userId);
  const topUnrealizedGains = await db.findTopUnrealizedGains(userId);
  const topValuedStocks = await db.findTopValuedStocks(userId);


  // Omregner værdier til DKK
  const totalRealizedGainInDKK = totalRealizedGain
  const totalUnrealizedGainInDKK = totalUnrealizedGain

console.log(totalRealizedGain, totalUnrealizedGain, stocksStats, topUnrealizedGains, topValuedStocks);
  const stocksStatsInDKK = {
    ...stocksStats,
    total_current_value: req.convertToDKK(stocksStats.total_current_value, 'USD'),
  };

const topUnrealizedGainsInDKK = topUnrealizedGains.map(stock => {
  const converted = {
    ...stock,
    //unrealized_gain: req.convertToDKK(stock.unrealized_gain, 'USD'),
    current_value: req.convertToDKK(stock.current_value, 'USD'),
    last_price: req.convertToDKK(stock.last_price, 'USD'),
  };

  return converted;
});

// Omregner topValuedStocks til DKK inkl. last_price
const topValuedStocksInDKK = topValuedStocks.map(stock => {
  const converted = {
    ...stock,
    current_value: req.convertToDKK(stock.current_value, 'USD'),
    last_price: req.convertToDKK(stock.last_price, 'USD'),
  };
  return converted;
});
      res.render('Dashboard', {
          user: req.session.user,
          totalUnrealizedGain: totalUnrealizedGainInDKK,
          stocksStats: stocksStatsInDKK,
          totalRealizedGain: totalRealizedGainInDKK,
          topUnrealizedGains: topUnrealizedGainsInDKK,
          topValuedStocks: topValuedStocksInDKK
      });

});

module.exports = router;