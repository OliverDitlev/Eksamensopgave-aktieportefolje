//kopi af funktionen 
function reqLogln(req, res, next){
    if(!req.session.user){
      return res.redirect('/login')
    } 
      next()
  }
  const { expect } = require('chai');


describe('reqLogln middleware', () => {
  it('should redirect to /login if no user is in session', () => {
    let redirectedTo = '';
    const req = { session: {} };
    const res = {
      redirect: (path) => {
        redirectedTo = path;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    reqLogln(req, res, next);

    expect(redirectedTo).to.equal('/login');
    expect(nextCalled).to.be.false;
  });

  it('should call next() if user is in session', () => {
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

    expect(nextCalled).to.be.true;
  });
});
