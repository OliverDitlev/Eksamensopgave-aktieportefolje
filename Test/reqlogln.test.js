//kopi af funktionen 
function reqLogln(req, res, next){
    if(!req.session.user){
      return res.redirect('/login')
    } 
      next()
  }
  const { expect } = require('chai');


describe('reqLogln middleware', () => {
  it('Flytter brugeren til /login hvis brugeren ikke er logget ind', () => {
    let redirectedTo = '';
    const req = { session: {} };
    // Simulerer en redirect-funktion 
    const res = {
      redirect: (path) => {
        redirectedTo = path;
      },
    };
    // Simulerer next-funktionen
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    //kalder funktionen
    reqLogln(req, res, next);
    //tjekker om redirect er kaldt og at next ikke er kaldt
    expect(redirectedTo).to.equal('/login');
    expect(nextCalled).to.be.false;
  });
  //simulerer at brugeren er logget ind og tjekker at next() bliver kaldt
  it('Kalder next() hvis user er logged in', () => {
    const req = { session: { user: { id: 1 } } };
    const res = {
      redirect: () => {
        throw new Error('redirect should not be called');
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    reqLogln(req, res, next);
    //tjekker at redirect ikke er kaldt og at next() er kaldt
    expect(nextCalled).to.be.true;
  });
});
