const express = require('express')


const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

router.get('/dashboard', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.user.user_id;
  
  const totalRealizedGain = await db.calculateTotalRealizedGain(userId);
  const totalUnrealizedGain = await db.calculateTotalUnrealizedGain(userId);
  const stocksStats = await db.findAllStocksForUser(userId);
  const topUnrealizedGains = await db.findTopUnrealizedGains(userId);
  const topValuedStocks = await db.findTopValuedStocks(userId);

      res.render('Dashboard', {
          user: req.session.user,
          totalUnrealizedGain,
          stocksStats,
          totalRealizedGain: totalRealizedGain !== undefined && totalRealizedGain !== null ? totalRealizedGain : 0,
          topUnrealizedGains,
          topValuedStocks
      });

});

  module.exports = router;