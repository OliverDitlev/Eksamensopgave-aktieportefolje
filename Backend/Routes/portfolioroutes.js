const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Henter brugerens porteføljer og konti
router.get('/portfolios', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
    const account_id = req.query.accountId;

    

    const accounts = await db.findLedgerByUser(user_id); 
    let portfolios = []

    portfolios = await db.findPortfoliosByAccountId(account_id);
    ledger = await db.getLedgerById(accountId);
    res.render('portfolios', {
        user: req.session.user,
        portfolios,
        accounts,
        ledger,
        errors: []
    });
});

// Opretter en ny portefølje
router.post('/portfolios', [
    body('portfolioName')
        .trim()
        .notEmpty()
        .withMessage('Name required'),
    body('accountId')
        .notEmpty()
        .withMessage('Choose account')
], async (req, res) => {
    
    const db = req.app.locals.db;
    const errors = validationResult(req);
    const user_id = req.session.user.user_id;

    const { portfolioName, accountId } = req.body;

    const portfolios = await db.findPortfoliosByUser(user_id);
    const accounts = await db.findLedgerByUser(user_id);

    if (!errors.isEmpty()) {
        const portfolios = await db.findPortfoliosByAccountId(accountId);
        return res.status(400).render('portfolios', {
            user: req.session.user,
            portfolios,
            accounts,
            errors: errors.array()
        });
    }
        await db.insertPortfolio( user_id, portfolioName, accountId);
        res.redirect(`/portfolios`);

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