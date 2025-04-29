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

  function reqAccount(req,res, next){
    if(!req.params.accountId){
      return res.redirect('/accounts')
    } 
      next()
  }
  
  module.exports = {reqActive, reqLogin, reqAccount}