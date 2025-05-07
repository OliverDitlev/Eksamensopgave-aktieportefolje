const { expect } = require('chai');
const { getExchangeRates } = require('../Backend/exrateAPI');

describe('getExchangeRates', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch; // Restore fetch after each test
  });

  it('returns exchange rates on successful API call', async () => {
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

    expect(result).to.be.an('object');
    expect(result).to.have.keys('DKK', 'GBP', 'USD');
    expect(result.DKK).to.equal(1);
    expect(result.GBP).to.equal(0.11);
    expect(result.USD).to.equal(0.15);
  });

  it('returns false on failed API call', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });

    const result = await getExchangeRates();
    expect(result).to.equal(false);
  });

  it('returns false on fetch exception', async () => {
    global.fetch = async () => {
      throw new Error('Network error');
    };

    const result = await getExchangeRates();
    expect(result).to.equal(false);
  });
});
