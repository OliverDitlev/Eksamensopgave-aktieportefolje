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


  
  module.exports = {reqActive, reqLogin}