// Funktion, som henter valutakurser fra API'et
async function getExchangeRates() {
  const API_KEY = '4d66b3a94abb837c72eb8b0b';
  const baseCurrency = 'DKK';
  const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.conversion_rates;

    const result ={
      DKK: rates['DKK'],
      GBP: rates['GBP'],  
      USD: rates['USD']
    }
    
    return result;
  } catch (error) {
    console.error('could not get exchange rates', error);
    return false;
  }
}
 
module.exports = { getExchangeRates }
 