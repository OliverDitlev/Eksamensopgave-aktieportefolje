const { getStockData } = require('./api');

// Funktion, som opdaterer aktiedata for alle virksomheder i databasen
async function updateAllStockData(db) {
  try {
    const tickers = await db.getAllCompanies();

    for (const ticker of tickers) {
      console.log(`Opdaterer data for: ${ticker}`);
      await new Promise(resolve => setTimeout(resolve, 20000));
      await getStockData(ticker, db);
    }

    console.log('Opdatering færdig');
  } catch (err) {
    console.error('Fejl ved opdatering:', err);
  }
}


module.exports = { updateAllStockData };
