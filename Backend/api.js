const request = require('request');

const API_KEY = 'W88KZ6XMGA0OVVD1'; 

function getStockData(companyName) {
  return new Promise((resolve, reject) => {
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${API_KEY}`;

    request.get({ url: searchUrl, json: true }, (err, res, searchData) => {
      if (err || !searchData.bestMatches || searchData.bestMatches.length === 0) {
        return reject('Company not found or error occurred');
      }

      const symbol = searchData.bestMatches[0]['1. symbol'];
      const dailyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
      const monthlyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${API_KEY}`;

      request.get({ url: dailyStockUrl, json: true }, (err, res, dailyData) => {
        if (err || !dailyData['Time Series (Daily)']) return reject('No daily data');

        const dailyTimeSeries = dailyData['Time Series (Daily)'];
        const dailyTimestamps = Object.keys(dailyTimeSeries);
        if (dailyTimestamps.length < 6) return reject('Not enough daily data');

        const dailyOpenPrices = dailyTimestamps.slice(0, 6).map(timestamp =>
          Math.floor(parseFloat(dailyTimeSeries[timestamp]['1. open']))
        );

        request.get({ url: monthlyStockUrl, json: true }, (err, res, monthlyData) => {
          if (err || !monthlyData['Monthly Time Series']) return reject('No monthly data');

          const monthlyTimestamps = Object.keys(monthlyData['Monthly Time Series']);
          if (monthlyTimestamps.length < 12) return reject('Not enough monthly data');

          const monthlyOpenPrices = monthlyTimestamps.slice(0, 12).map(timestamp =>
            Math.floor(parseFloat(monthlyData['Monthly Time Series'][timestamp]['1. open']))
          );

          const result = [
            symbol,
            companyName,
            dailyOpenPrices[0],
            dailyOpenPrices[1],
            dailyOpenPrices[2],
            dailyOpenPrices[3],
            dailyOpenPrices[4],
            dailyOpenPrices[5],
            ...monthlyOpenPrices,
          ];

          resolve(result);
        });
      });
    });
  });
}

getStockData('Apple')
  .then(data => {
    console.log('Stock Data:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

module.exports = { getStockData };
