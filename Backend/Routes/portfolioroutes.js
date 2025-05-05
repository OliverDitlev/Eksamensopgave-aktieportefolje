const express = require('express');
const { body, validationResult } = require('express-validator');
const { getStockData } = require('../api');
const request = require('request')

const API_KEY = 'Q7DZ145NE084VB0O'

const router = express.Router();

// Henter brugerens porteføljer og konti
router.get('/portfolios/:portofolio_id', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
    const portfolio_id = req.params.portofolio_id    

    req.session.currentPortfolioId = portfolio_id

    const accounts = await db.findLedgerByUser(user_id); 
    const portfolio = await db.findPortfoliosById(portfolio_id)

    const stocks = await db.findStocksByPortfolio(portfolio_id)
    const ledger = accounts.find(avabal => avabal.account_id === portfolio.account_id);
    const availBalance = ledger.available_balance

    const totalValue = stocks.reduce((sum, temp) => sum + Number(temp.value),0)
    const pieData = stocks.map(temp =>({name: temp.ticker, value: temp.value}))
    
    console.log({
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValue,
        //chartData,
        availBalance,
        pieData,
        errors: [],
        result: null
    });

    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValue,
        //chartData,
        availBalance,
        pieData,
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

// Sletter en portefølje. ikke færdig
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
//slettes?
router.get('/api/stockinfo', async (req, res) => {
    const db = req.app.locals.db;
    const { company } = req.query;
  
    const result = await getStockData(company, db);
    res.json(result);
  });

  router.post('/registerTrade', async (req, res) => {
    const db = req.app.locals.db;
    const { portfolio_id, ticker, volume, price, company, currency } = req.body;
  

    await db.saveStockData(
        ticker,
        company || null,
        currency || 'USD',
        parseFloat(price)
    );

    await db.insertStockToPortfolio(
        portfolio_id,
        ticker,
        parseInt(volume, 10),
        parseFloat(price)
    );
  
    res.redirect(`/portfolios/${portfolio_id}`);
  });


// funktion til søgning af aktie
router.get('/api/symbols', async (req, res) => {
    const query = req.query.query || '';
    if (query.length < 2) return res.json([]);
  
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
  
    request.get({ url, json: true }, (_err, _r, data) => {
      const out = (data.bestMatches || [])
        .filter(m => ['USD', 'DKK', 'GBP'].includes(m['8. currency']))
        .slice(0, 6)
        .map(m => ({
          ticker:   m['1. symbol'],
          name:     m['2. name'],
          currency: m['8. currency']
        }));
      res.json(out);
    });
  });

module.exports = router;