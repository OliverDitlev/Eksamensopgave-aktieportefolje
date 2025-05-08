'use strict';
const request = require('request');
const sql = require('mssql')

const API_KEY = 'P8HUIXTH2ZGN091S'; 

function getStockData(companyName , db = null) {

  const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${API_KEY}`;
//Henter data fra URL
  request.get({ url: searchUrl, json: true, headers: { 'User-Agent': 'request' }}, 
    async (err, res, searchData) => {
    if (err || !searchData.bestMatches || searchData.bestMatches.length === 0) {
      console.log('Company not found or error occurred');
      return;
    }

    const allowed = ['DKK', 'USD', 'GBP'];
    const bestMatch = searchData.bestMatches
    .filter( curr => curr['3. type'] === 'Equity' && allowed.includes(curr['8. currency']))
    .sort((a, b) => parseFloat(b['9. matchScore']) - parseFloat(a['9. matchScore']))
    [0]
    
    const ticker = bestMatch['1. symbol']
    const currency = bestMatch['8. currency'] || 'DKK'
    const dailyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${API_KEY}`;
    const monthlyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${ticker}&apikey=${API_KEY}`;

    // Fetcher daglig og månedlig data
    request.get({ url: dailyStockUrl, json: true, headers: { 'User-Agent': 'request' }},

    (err, res, dailyData) => {
      if (err || !dailyData['Time Series (Daily)']) {
        console.log('Daily stock data not available');
        return;
      }

      const dailyTimeSeries = dailyData['Time Series (Daily)'];
      const dailyTimestamps = Object.keys(dailyTimeSeries);

      if (dailyTimestamps.length < 7) {
        console.log('Not enough daily data available');
        return;
      }

      // Henter data fra de sidste seks dage + i dag
      const dailyOpenPrices = dailyTimestamps.slice(0, 7).map(timestamp => parseFloat(dailyTimeSeries[timestamp]['1. open']));

      // Henter månedlig data
      request.get({ url: monthlyStockUrl, json: true, headers: { 'User-Agent': 'request' }}, 
        async (err, res, monthlyData) => {

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

        const result = {
          ticker,
          currency,
          daily: dailyOpenPrices, 
          monthly: monthlyOpenPrices,
        }

        console.log(result);

        if (db) {
          try {
            await db.saveStockData(ticker, companyName, currency, dailyOpenPrices, monthlyOpenPrices);
          } catch (e) {
            console.error(e);
          }
        }

      });
    });
  });
}



module.exports = {getStockData, API_KEY};