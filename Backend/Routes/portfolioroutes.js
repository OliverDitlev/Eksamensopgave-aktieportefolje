const express = require('express');
const { body, validationResult } = require('express-validator');
const { reqLogin, reqActive } = require('../middleware');

// Får data om aktier fra en API
const { getStockData } = require('../api');
const { getExchangeRates } = require('../exrateAPI');
const request = require('request');
//const { number } = require('echarts');

// Nøgle til API'en
const API_KEY = '5QA9YSDJVYM03SXE'

const router = express.Router();
/*
router.get('/portfolios', reqLogin, reqActive, async (req, res) => {
    const db = req.app.locals.db;
*/

// Henter brugerens porteføljer, konti og tilhørende aktier
router.get('/portfolios/:portfolio_id', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
    const portfolio_id = req.params.portfolio_id    

    req.session.currentPortfolioId = portfolio_id

    const accounts = await db.findLedgerByUser(user_id); 
    const portfolio = await db.findPortfoliosById(portfolio_id)
    const monthlyHistory = await db.getPortfolioHistory(portfolio_id)

    // Henter aktierne i porteføljen
    const stocks = await db.findStocksByPortfolio(portfolio_id)
    const ledger = accounts.find(account => account.account_id === portfolio.account_id);
    const availBalance = ledger.available_balance

    const exchangeRates = await getExchangeRates()
    const usdToDkkRate = exchangeRates['USD']
    const gbpToDkkRate = exchangeRates['GBP']

const totalValueAfterEX = stocks.reduce((acc, stock) => {
      let stockValueDKK = 0

    if (stock.currency === 'USD') {
        stockValueDKK = Number(stock.value) / usdToDkkRate
      } else if (stock.currency === 'GBP') {
        stockValueDKK = Number(stock.value) / gbpToDkkRate
      } else {
        stockValueDKK = Number(stock.value)
      }

      return acc + stockValueDKK
    }, 0)

    // Laver data til pie chart og omregner værdierne til DKK
    const pieData = stocks.map(stock => {
      let valueDKK = Number(stock.value)
      if (stock.currency === 'USD') {
        valueDKK/= usdToDkkRate
      } else if (stock.currency === 'GBP') {  
        valueDKK/= gbpToDkkRate
      }
      return {
        name: stock.ticker,
        value: valueDKK,
      }
    });
    console.log('portfolio', portfolio, 'accounts', accounts, 'stocks', stocks)
    // Sender alle informationerne til portfoliodetails.ejs
    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValueAfterEX,
        availBalance,
        pieData,
        monthlyHistory,
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
   

    const portfolioName = req.body.portfolioName;
    const accountId  = req.body.accountId;
    console.log('accountId', accountId, portfolioName)


    const accounts = await db.findLedgerByUser(user_id);

    // Hvis validering fejler, vises fejl
    if (!errors.isEmpty()) {
        const portfolios = await db.findPortfoliosByAccountId(accountId);
        return res.status(400).render('portfolios', {
            user: req.session.user,
            portfolios,
            accounts,
            errors: errors.array()
        });
    }
    // Tilføjer porteføljen til databasen og sender brugeren til porteføljeoverigten
    await db.insertPortfolio( user_id, portfolioName, accountId);
    res.redirect('/portfolios');
});

// Sletter en portefølje. ikke færdig
router.delete('/deleteportfolio', async (req, res) => {
    const db = req.app.locals.db;
    const { portfolioID } = req.body;

    try {
        const deleted = await db.deletePortfolio(portfolioID);

        // Hvis porteføljen ikke findes vises fejl
        if (!deleted) {
            return res.status(404).send('Portfolio ikke fundet');
        }

        res.sendStatus(204);
    // Ved fejl vises 'Serverfejl'
    } catch (err) {
        console.error('Fejl ved sletning af portfolio:', err);
        res.status(500).send('Serverfejl');
    }
});

// Renderer portfoliodetails med et tomt resultat
router.get('/searchstock', (req, res) => {
    res.render('portfoliodetails', { result: null });
});

// Henter aktiedata fra en given virksomhed
router.get('/api/stockinfo', async (req, res) => {
    const db = req.app.locals.db;
    const { company } = req.query;
    // Bruger funktionen getStockData fra api.js til at hente data fra Alpha Vantage
    const result = await getStockData(company, db);
    res.json(result);
  });

  

// Registrer et køb af aktier i en portefølje
router.post('/registerTrade', async (req, res) => {
  const db = req.app.locals.db;
  const { 
    portfolio_id, 
    ticker, 
    volume,
    price, 
    company, 
    currency = 'USD' 
  } = req.body
  try{
    getStockData(company?? ticker, db)

    // Tilføjer aktiedataen til porteføljen i databasen
    await db.insertStockToPortfolio(
        portfolio_id,
        ticker,
        parseInt(volume, 10),
        parseFloat(price)
    );
    // Sender brugeren hen til siden for den relevante portefølje
    res.redirect(`/portfolios/${portfolio_id}`);
  }catch(err){
    console.error(err)
    res.status(500).send('error no trade')
  }
});

router.get('/portfolios/:portfolio_id/history', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const portfolioId = req.params.portfolio_id;

  try {
      console.log('Fetching history for portfolio ID:', portfolioId);
      const history = await db.findPortfolioHistory(portfolioId);
      console.log('History data:', history); 
      const averagePrices = await db.calculateAverageAcquisitionPrice(portfolioId);

      res.render('history', {
          user: req.session.user,
          history,
          averagePrices, // Pass the average prices to the template
      });
  } catch (err) {
      console.error('Error fetching portfolio history:', err)
      res.status(500).send('Internal Server Error');
  }
});

// Registrer et salg af aktier i en portefølje
router.post('/sellTrade', async (req, res) => {
  const db = req.app.locals.db;
  const { 
      portfolio_id, 
      ticker, 
      volume, 
      price 
  } = req.body;

  try {
    console.log('Portfolio ID:', portfolio_id);
    console.log('Ticker:', ticker);

    // Hent aktien fra porteføljen
    const stock = await db.findStockInPortfolio(portfolio_id, ticker);
    console.log('Stock found:', stock);

      // Tjek om der er nok aktier til at sælge
      if (!stock || parseFloat(stock.volume) < parseFloat(volume)) {
          return res.status(400).send('Ikke nok aktier til at sælge');
      }

      // Fjern aktier fra porteføljen
      await db.removeStockFromPortfolio(portfolio_id, ticker, parseFloat(volume), parseFloat(price));

      // Tilføj pengene til den tilknyttede konto
      const totalAmount = parseFloat(volume) * parseFloat(price);
      const account_id = stock.account_id;
      await db.addFundsToAccount(account_id, totalAmount);

      // Redirect til porteføljeoversigten
      res.redirect(`/portfolios/${portfolio_id}`);
  } catch (err) {
      console.error('Fejl ved salg af aktier:', err);
      res.status(500).send('Fejl ved salg af aktier');
  }
});
  


router.get('/api/portfolioHistory', async (req, res) =>{
  const db = req.app.locals.db;
  const history = await db.getPortfolioHistory(req.query.portfolioId);
  res.json(history);
})

// Funktion til søgning af aktie
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