const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

router.get('/dashboard', reqLogin, reqActive, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.session.user.user_id;
  
    try {
      const totalRealizedGain = await db.calculateTotalRealizedGain(userId) ?? 0;
  
      res.render('Dashboard', {
        user: req.session.user,
        totalRealizedGain, // pass the number, even if it's 0
      });
  
    } catch (err) {
      console.error('Error fetching total realized gain:', err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  module.exports = router;