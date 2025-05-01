const express = require('express');
const { body, validationResult } = require('express-validator');
const { getStockData } = require('../api');

const router = express.Router();

// Henter brugerens porteføljer og konti
router.get('/portfolios/:portofolio_id', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
    const portfolio_id = req.params.portofolio_id    

    req.session.currentPortfolioId = portfolio_id

    const accounts = await db.findLedgerByUser(user_id); 
    const portfolio = await db.findPortfoliosById(portfolio_id)

    /*console.log({
        user: req.session.user,
        portfolio,
        accounts,
        ledger
    });
*/
    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        
        errors: [],
        result: null
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

router.get('/searchstock', (req, res) => {
    res.render('portfoliodetails', { result: null });
});

router.post('/searchstock', async (req, res) => {
    const db = req.app.locals.db;
    const { company } = req.body;
    const user_id = req.session.user.user_id;
    const portfolio_id = req.session.currentPortfolioId;   

    const accounts = await db.findLedgerByUser(user_id); 
    const portfolio = await db.findPortfoliosById(portfolio_id)

    const result = await getStockData(company, db);

    console.log({
        user: req.session.user,
        portfolio,
        accounts,
        result,
        errors: []
    });

    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        result,
        errors: []
    });
});


module.exports = router;