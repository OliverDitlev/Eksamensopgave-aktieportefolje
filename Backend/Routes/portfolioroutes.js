const express = require('express');
const { body, validationResult } = require('express-validator');
const { reqLogin, reqActive } = require('../middleware');

// Får data om aktier fra en API
const { getStockData } = require('../api');
const request = require('request')

// Nøgle til API'en
const API_KEY = 'JUMYOA8PCTBZZI56'

const router = express.Router();

// Henter brugerens porteføljer, konti og tilhørende aktier
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

    // Beregner samlet værdi
    const totalValue = stocks.reduce((sum, temp) => sum + Number(temp.value),0)
    // Laver data til pie chart
    const pieData = stocks.map(temp =>({name: temp.ticker, value: temp.value}))
    
    console.log({
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValue,
        availBalance,
        pieData,
        errors: [],
        result: null
    });

    // Sender alle informationerne til portfoliodetails.ejs
    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValue,
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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
router.get('/portfolios/:portofolio_id/history', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const portfolioId = req.params.portofolio_id;

  try {
      const history = await db.findPortfolioHistory(portfolioId); // Replace with your actual database query
      res.render('history', {
          user: req.session.user,
          history,
      });
  } catch (err) {
      console.error('Error fetching portfolio history:', err);
      res.status(500).send('Internal Server Error');
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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
      // Hent aktien fra porteføljen
      const stock = await db.findStockInPortfolio(portfolio_id, ticker);

      // Tjek om der er nok aktier til at sælge
      if (!stock || stock.volume < volume) {
          return res.status(400).send('Ikke nok aktier til at sælge');
      }

      // Fjern aktier fra porteføljen
      await db.removeStockFromPortfolio(portfolio_id, ticker, volume);

      // Tilføj pengene til den tilknyttede konto
      const totalValue = volume * price;
      await db.addFundsToAccount(portfolio_id, totalValue);

      // Redirect til porteføljeoversigten
      res.redirect(`/portfolios/${portfolio_id}`);
  } catch (err) {
      console.error(err);
      res.status(500).send('Fejl ved salg af aktier');
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  }
});

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