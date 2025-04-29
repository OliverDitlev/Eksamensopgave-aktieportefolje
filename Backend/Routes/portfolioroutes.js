const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const { reqLogin, reqActive, reqAccount } = require('../middleware.js');

router.get('/portfolios/:accountId', async (req,res) =>{
    const db = req.app.locals.db;
    const account_id = req.params.accountId

    const portfolios = await db.findPortfoliosByAccountId(account_id);
    const account = await db.getLedgerById(account_id)

    res.render('portfolios', {
    user: req.session.user,
    account_id,
    account,
    portfolios,
    errors: []
});
})

// Opretter en ny portefølje
router.post('/portfolios', [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Navn på portefølje kræves')
], async (req, res) => {
    const db = req.app.locals.db;
    const errors = validationResult(req);
    const user_id = req.session.user.user_id;
    const portfolios = await db.findPortfoliosByUser(user_id);

    if (!errors.isEmpty()) {
        return res.status(400).render('portfolios', {
            user: req.session.user,
            portfolios,
            errors: errors.array()
        });
    }

    const { name } = req.body;
    await db.insertPortfolio(user_id, name);
    res.redirect('/portfolios');
});

// Sletter en portefølje
router.delete('/deleteportfolio', async (req, res) => {
    const db = req.app.locals.db;
    const { portfolioID } = req.body;

    try {
        const deleted = await db.deletePortfolio(portfolioID);

        if (!deleted) {
            return res.status(404).send('Portfolio ikke fundet');
        }

        res.sendStatus(204);
    } catch (err) {
        console.error('Fejl ved sletning af portfolio:', err);
        res.status(500).send('Serverfejl');
    }
});

module.exports = router;