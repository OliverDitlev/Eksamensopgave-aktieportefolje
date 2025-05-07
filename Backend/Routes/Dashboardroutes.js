const express = require('express')


const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

router.get('/dashboard', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.session.user.user_id;
  console.log("User session ID:", req.session.user?.user_id);
  const totalRealizedGain = await db.calculateTotalRealizedGain(userId);
  const totalUnrealizedGain = await db.calculateTotalUnrealizedGain(userId);

      console.log(totalUnrealizedGain, totalRealizedGain);
      console.log('Total Realized Gain:', totalRealizedGain);
      res.render('Dashboard', {
          user: req.session.user,totalUnrealizedGain,
          totalRealizedGain: totalRealizedGain !== undefined && totalRealizedGain !== null ? totalRealizedGain : 0,
      });

});

  module.exports = router;