const { expect } = require('chai');
const { getExchangeRates } = require('../Backend/exrateAPI');

// Bruger describe til at gruppere testene
describe('getExchangeRates', () => {
  const originalFetch = global.fetch
  //sørger for at genskabe fetchen efter hver test
  afterEach(() => {
    global.fetch = originalFetch; 
  });
  // Laver en "Mock" fetch som senere skal sammenlignes med den rigtige fetch
  it('returnerer valuta rates', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        conversion_rates: {
          DKK: 1,
          GBP: 0.11,
          USD: 0.15,
        },
      }),
    });

    const result = await getExchangeRates();
    //tester om resultatet er et objekt
    expect(result).to.be.an('object');
    //tester om resultatet indeholder de rigtige keys
    expect(result).to.have.keys('DKK', 'GBP', 'USD');
    //tester om den returner den rigtige værdi for DKK
    expect(result.DKK).to.equal(1);
     //tester om den returner den rigtige værdi for GBP
    expect(result.GBP).to.equal(0.11);
     //tester om den returner den rigtige værdi for USD
    expect(result.USD).to.equal(0.15);
  });
  //ny mock fetch som returnerer en fejl
  it('Returnerer en fejl fra API', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });

    const result = await getExchangeRates();
    //når fetch fejler, så returneres false
    expect(result).to.equal(false);
  });

 
});
