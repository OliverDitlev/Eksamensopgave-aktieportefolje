const express = require('express');
const { body, validationResult } = require('express-validator');
const { reqLogin, reqActive } = require('../middleware');

// Får data om aktier fra en API
const { getStockData } = require('../api');
const { getExchangeRates } = require('../exrateAPI');
const request = require('request');


// Nøgle til API'en
const { API_KEY } = require('../api');
const { map } = require('mssql');
const { number } = require('echarts');

const router = express.Router();

router.get('/portfolios', reqLogin, reqActive, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;

    // Henter brugerens porteføljer 
    const portfolios = await db.findPortfoliosByUser(user_id);
    // Henter brugerens konti/ledger
    const accounts = await db.findLedgerByUser(user_id);
    // Henter statistiker som aktierne i porteføljen, som visualiseres 
    const stocksStats = await db.findAllStocksForUser(user_id)
    // Henter statistikker for porteføljen, som visualiseres
    const stats = await db.findStatsForPortfolio(user_id)
    // Henter data til pie chart, som visualiseres
    const pieData = await db.findPieDataForPortfolio(user_id)

    // Henter valutakurser fra API'en
    const exchangeRates = await getExchangeRates()
   //finder rate for USD til DKK
    const usdToDkkRate = exchangeRates['USD'];
    //finder den totale købsværdi(altid i USD) og konverterer til DKK
    const total_purchase_value_usd = parseFloat(stocksStats.total_current_value || 0);
    const total_purchase_value_dkk = (total_purchase_value_usd / usdToDkkRate).toFixed(0);



    //sender alt tidligere data til portfolios.ejs
    res.render('portfolios', {
      user: req.session.user,
      portfolios,
      accounts,
      stocksStats,
      stats,
      total_purchase_value_dkk,
      pieData,
      errors: []
    });
  } catch (err) {
    console.error('Error fetching portfolios:', err);
  }
});

// Henter brugerens porteføljer, konti og tilhørende aktier
router.get('/portfolios/:portfolio_id', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
    const portfolio_id = req.params.portfolio_id    

    req.session.currentPortfolioId = portfolio_id
    // Henter konti/ledger fra databasen
    const accounts = await db.findLedgerByUser(user_id); 
    // Henter portefølje fra databasen
    const portfolio = await db.findPortfoliosById(portfolio_id)
    // Henter porteføljens aktier fra databasen
    const monthlyHistory = await db.getPortfolioHistory(portfolio_id)


    const stocks = await db.findStocksByPortfolio(portfolio_id)
    //finder korrekt ledger
    const ledger = accounts.find(account => account.account_id === portfolio.account_id);

    // Henter valutakurser fra API'en
    const exchangeRates = await getExchangeRates()
    const usdToDkkRate = exchangeRates['USD']
    const gbpToDkkRate = exchangeRates['GBP']

    let availBalance = Number(ledger.available_balance);
    //laver array med info fra stock
    let prices = {
     lastprice: stocks.map(stock => Number(stock.last_price)),
     purchasePrice: stocks.map(price => Number(price.purchase_price)),
     value: stocks.map(val => Number(val.value))
    }
    //omregner brugeres tal til relevante valuta
    if (ledger.currency === 'DKK') {
      availBalance = availBalance * exchangeRates['USD'];
      //prices.purchasePrice = prices.purchasePrice.map(price => price / exchangeRates['USD']);
      prices.lastprice = prices.lastprice.map(price => price / exchangeRates['USD']);
      prices.value = prices.value.map(val => val / exchangeRates['USD']);

    } else if (ledger.currency === 'GBP') {
      availBalance = availBalance * exchangeRates['GBP'] 

      //prices.purchasePrice = prices.purchasePrice.map(price => price / exchangeRates['USD']);
      prices.lastprice = prices.lastprice.map(price => price / exchangeRates['GBP']);
      prices.value = prices.value.map(val => val / exchangeRates['GBP']);

    }

    //omregner brugeres aktier til relevant valuta
    let totalValueAfterEX = stocks.reduce((acc, stock) => {
      let valueDKK = 0;
    
      if (ledger.currency === 'USD') {
        valueDKK = Number(stock.value)
      } else if (ledger.currency === 'GBP') {
        valueDKK = Number(stock.value) / exchangeRates['GBP'];
      } else {
        valueDKK = Number(stock.value) / exchangeRates['USD']
      }
    
      return acc + valueDKK;
    }, 0);

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
    console.log(prices)
    // Sender alle informationerne til portfoliodetails.ejs
    res.render('portfoliodetails', {
        user: req.session.user,
        portfolio,
        accounts,
        stocks,
        totalValueAfterEX,
        availBalance,
        prices,
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

// Sletter en portefølje. 
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

// Renderer portfoliodetails med et tomt resultat, bruges til søgning
router.get('/searchstock', reqLogin, reqActive, (req, res) => {
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
  const user_id = req.session.user.user_id;


  const { 
    portfolio_id, 
    ticker, 
    volume,
    price, 
    company, 
  } = req.body

  try{

    const exchangeRates = await getExchangeRates()
    const accounts = await db.findLedgerByUser(user_id);
    const portfolio = await db.findPortfoliosById(portfolio_id);
    //finder relevant ledger
    const ledger = accounts.find(account => account.account_id === portfolio.account_id);

    //gør price til variabl
    let convertedPrice = parseFloat(price);


    if (ledger.currency === 'DKK') {
      convertedPrice = convertedPrice / exchangeRates['USD'];

    } else if (ledger.currency === 'GBP') {
      convertedPrice = convertedPrice / exchangeRates['GBP'] 

    }
    // Henter aktiedata fra API'en
    getStockData(company ?? ticker, db)

    // Tilføjer aktiedataen til porteføljen i databasen
    await db.insertStockToPortfolio(
        portfolio_id,
        ticker,
        parseInt(volume, 10),
        parseFloat(convertedPrice)
    );
    // Tilføjer aktien til porteføljen i databasen
    await db.insertTradeHistory(portfolio_id, ticker, 'BUY', parseInt(volume, 10), parseFloat(price))
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
    // Henter porteføljens handelsdata og porteføljeoplysninger
    const history = await db.findTradeHistoryByPortfolio(portfolioId);
    const portfolio = await db.findLedgerByPorfolioId(portfolioId);

    const exchangeRates = await getExchangeRates();
    const usdToDkkRate = exchangeRates['USD'];
    const usdToGbpRate = exchangeRates['GBP'];

    // omregner history til den relevante valuta
    const historyAfterEx = history.map((trade, index) => {
      let price = Number(trade.price);
      
      if (portfolio.currency === 'DKK') {
        price = price / usdToDkkRate;
      } else if (portfolio.currency === 'GBP') {
        price = price / usdToGbpRate;
      }
      //returner opdateret trade
      return {
        ...trade,
        price,
      };
    });

    res.render('history', {
      user: req.session.user,
      history: historyAfterEx,
      portfolio,
    });

  } catch (err) {
    console.error('Error fetching portfolio history:', err);
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
    // Hent aktien fra porteføljen
    const stock = await db.findStockInPortfolioForSelling(portfolio_id, ticker);

    await db.insertTradeHistory(portfolio_id, ticker, 'SELL', parseInt(volume, 10), parseFloat(price))

      // Tjek om der er nok aktier til at sælge
      if (!stock || parseFloat(stock.volume) < parseFloat(volume)) {
          return res.status(400).send('Ikke nok aktier til at sælge');
      }

      // Fjern aktier fra porteføljen
      await db.removeStockFromPortfolio(portfolio_id, ticker, parseFloat(volume), parseFloat(price));

      // Tilføj pengene til den tilknyttede konto
      const totalAmount = parseFloat(volume) * parseFloat(price);
      const account_id = stock.account_id;
      const stockCurrency = stock.stock_currency;

      // Konverter beløbet til DKK, hvis nødvendigt
      let amountInDKK = totalAmount;
      if (stockCurrency !== 'DKK') {
        const exchangeRates = await getExchangeRates();
        const rate = exchangeRates[stockCurrency];
        if (!rate) {
          return res.status(500).send(`Valutakurs for ${stockCurrency} ikke fundet`);
        }
        amountInDKK = totalAmount / rate;
      }

      await db.addFundsToAccount(account_id, amountInDKK);

      // Redirect til porteføljeoversigten
      res.redirect(`/portfolios/${portfolio_id}`);
  } catch (err) {
      console.error('Fejl ved salg af aktier:', err);
      res.status(500).send('Fejl ved salg af aktier');
  }
});
  
router.get('/api/portfolioHistory', async (req, res) =>{
  // Henter historik fra portefølje og jsoner til frontend
  const db = req.app.locals.db;
  const history = await db.getPortfolioHistory(req.query.portfolioId);
  res.json(history);
})

// Funktion til søgning af aktie
router.get('/api/symbols', async (req, res) => {
    const query = req.query.query || '';
    // Søger efter 2 bogstaver 
    if (query.length < 2) return res.json([]);
   // Kalder API'en 
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    // Søger udfra nedenstående
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

router.get('/users/:portfolioId/stocks/:ticker', reqLogin, reqActive, async (req, res) => {
    const db = req.app.locals.db;
    const portfolio_id = req.params.portfolioId;
    const ticker = req.params.ticker;
    const user_id = req.session.user.user_id;

    //find aktie fra navn i portefølje
    const stock = await db.findStockInPortfolio(portfolio_id, ticker);
    const chartData = await db.getStockPriceHistoryByTicker(stock.ticker);
    const averagePrices = await db.calculateAverageAcquisitionPrice(portfolio_id, ticker);

    res.render('stockdetails', {
      user: req.session.user,
      stock,
      averagePrices,
      chartData
    });
  });

module.exports = router;