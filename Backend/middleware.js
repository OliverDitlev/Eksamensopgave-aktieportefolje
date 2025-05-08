const { getExchangeRates } = require('./exrateAPI');

function reqLogin(req, res, next){
  if(!req.session.user){
    return res.redirect('/login')
  } 
    next()
}
  
function reqActive(req, res, next){
  if(!req.session.user.active){
    return res.redirect('/disabledaccount')
  } 
    next()
}

async function convertCurrency(req, res, next) {
  try {
    // Henter valutakurser
    const rates = await getExchangeRates();
    if (!rates) {
      throw new Error('Kunne ikke hente valutakurser.');
    }

    // Funktion til at omregne til DKK
    req.convertToDKK = (value, currency) => {
      if (!rates[currency]) {
        throw new Error(`Valutaen ${currency} kunne ikke hentes.`);
      }
      return value * rates['DKK'] / rates[currency]; // Omregn til DKK
    };

    next();
  } catch (error) {
    console.error('Fejl ved hentning af valutakurser:', error);
    res.status(500).send('Kunne ikke hente valutakurser.');
  }
}
  
module.exports = {reqActive, reqLogin, convertCurrency}