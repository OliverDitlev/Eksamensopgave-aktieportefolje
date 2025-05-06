const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

router.get('/dashboard', reqLogin, reqActive, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.session.user.user_id;

    try {
        const totalRealizedGain = await db.calculateTotalRealizedGain(userId); // Call the function
        res.render('Dashboard', {
            user: req.session.user,
            totalRealizedGain, // Pass the result to the template
        });
    } catch (err) {
        console.error('Error fetching total realized gain:', err);
        res.status(500).send('Internal Server Error');
    }
});