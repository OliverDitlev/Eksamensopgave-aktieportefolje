const { expect } = require('chai');

//kopi af funktionen
function reqActlve(req, res, next){
  if(!req.session.user.active){
    return res.redirect('/disabledaccount')
  } 
    next()
}

describe('reqActlve middleware', () => {
  it('Flytter brugeren til /disabledaccount hvis brugeren ikke er inaktiv', () => {
    let redirectedTo = '';
    const req = { session: { user: { active: false } } };
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
    reqActlve(req, res, next);
    //tjekker om redirect er kaldt og at next ikke er kaldt
    expect(redirectedTo).to.equal('/disabledaccount');
    expect(nextCalled).to.be.false;
  });

  //simulerer at brugeren er aktiv og tjekker at next() bliver kaldt
  it('Kalder next() hvis brugeren er aktiv', () => {
    const req = { session: { user: { active: true } } };
    const res = {
      redirect: () => {
        throw new Error('redirect should not be called');
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    reqActlve(req, res, next);
    //tjekker at redirect ikke er kaldt og at next() er kaldt
    expect(nextCalled).to.be.true;
  });
});
