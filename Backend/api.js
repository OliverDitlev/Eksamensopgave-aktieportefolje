const API_KEY = '8OZC3CIVXTE19JFG';

async function getStockData(companyName) {
    try {
        const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${API_KEY}`;
        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const searchData = await searchResponse.json();

        if (!searchData.bestMatches || searchData.bestMatches.length === 0) {
            throw new Error('Company not found');
        }

        const symbol = searchData.bestMatches[0]['1. symbol'];
        const dailyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
        const monthlyStockUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${API_KEY}`;

        const dailyResponse = await fetch(dailyStockUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dailyData = await dailyResponse.json();

        if (!dailyData['Time Series (Daily)']) {
            throw new Error('No daily data');
        }

        const dailyTimeSeries = dailyData['Time Series (Daily)'];
        const dailyTimestamps = Object.keys(dailyTimeSeries);
        if (dailyTimestamps.length < 6) {
            throw new Error('Not enough daily data');
        }

        const dailyOpenPrices = dailyTimestamps.slice(0, 6).map(timestamp =>
            Math.floor(parseFloat(dailyTimeSeries[timestamp]['1. open']))
        );
const monthlyResponse = await fetch(monthlyStockUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const monthlyData = await monthlyResponse.json();

        if (!monthlyData['Monthly Time Series']) {
            throw new Error('No monthly data');
        }

        const monthlyTimestamps = Object.keys(monthlyData['Monthly Time Series']);
        if (monthlyTimestamps.length < 12) {
            throw new Error('Not enough monthly data');
        }

        const monthlyOpenPrices = monthlyTimestamps.slice(0, 12).map(timestamp =>
            Math.floor(parseFloat(monthlyData['Monthly Time Series'][timestamp]['1. open']))
        );

        return [
            symbol,
            companyName,
            ...dailyOpenPrices,
            ...monthlyOpenPrices,
        ];
    } catch (error) {
        throw new Error(`Error fetching stock data: ${error.message}`);
    }
}



module.exports = { getStockData };