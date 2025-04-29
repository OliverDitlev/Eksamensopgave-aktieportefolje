'use strict';
const request = require('request');

const API_KEY = 'Q7DZ145NE084VB0O'; 

function getStockData(companyName, callback) { // <-- Tilføjet callback
  const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${API_KEY}`;

  // Henter data fra URL
  request.get({
    url: searchUrl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, res, searchData) => {
    if (err || !searchData.bestMatches || searchData.bestMatches.length === 0) {
      console.log('Company not found or error occurred');
      return;
    }

    const bestMatch = searchData.bestMatches[0];
    const symbol = bestMatch['1. symbol'];

    const dailyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
    const monthlyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${API_KEY}`;

    // Fetcher daglig og månedlig data
    request.get({
      url: dailyStockUrl,
      json: true,
      headers: { 'User-Agent': 'request' }
    }, (err, res, dailyData) => {
      if (err || !dailyData['Time Series (Daily)']) {
        console.log('Daily stock data not available');
        return;
      }

      const dailyTimeSeries = dailyData['Time Series (Daily)'];
      const dailyTimestamps = Object.keys(dailyTimeSeries);

      if (dailyTimestamps.length < 6) {
        console.log('Not enough daily data available');
        return;
      }

      // Henter data fra de sidste fem dage
      const dailyOpenPrices = dailyTimestamps.slice(0, 6).map(timestamp => Math.floor(parseFloat(dailyTimeSeries[timestamp]['1. open'])));

      // Henter månedlig data
      request.get({
        url: monthlyStockUrl,
        json: true,
        headers: { 'User-Agent': 'request' }
      }, (err, res, monthlyData) => {
        if (err || !monthlyData['Monthly Time Series']) {
          return;
        }

        const monthlyTimeSeries = monthlyData['Monthly Time Series'];
        const monthlyTimestamps = Object.keys(monthlyTimeSeries);

        if (monthlyTimestamps.length < 12) {
          console.log('Not enough monthly data available');
          return;
        }

        const monthlyOpenPrices = monthlyTimestamps.slice(0, 12).map(timestamp => Math.floor(parseFloat(monthlyTimeSeries[timestamp]['1. open'])));

        // laver array med data: [forkortelse, Navn, dagens pris, de sidste fem dage, de sidste 12 måneder]
        const result = [
          symbol,
          companyName,
          dailyOpenPrices[0],
          dailyOpenPrices[1], 
          dailyOpenPrices[2],
          dailyOpenPrices[3], 
          dailyOpenPrices[4], 
          dailyOpenPrices[5], 
          ...monthlyOpenPrices 
        ];

        callback(result[0]); // Kalder callback-funktion med resultatet
      });
    });
  });
}

module.exports = { getStockData };

// Eksempel på brug:
getStockData('apple', (result) => {
  console.log(result);
});