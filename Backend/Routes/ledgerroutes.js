const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

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

//henter brugerens kontoer/ledger
router.get('/accounts', reqLogin, reqActive, async(req,res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id

    const accounts = await db.findLedgerByUser(user_id)
    res.render('accounts', {
        user: req.session.user, 
        accounts, 
        errors: []
     })
})

router.post('/accounts', [
    body('name')
    .trim().notEmpty().withMessage('Name required'),

    body('balance')
    .trim().isNumeric().withMessage('Enter valid number')
], async (req, res) => {
    const db = req.app.locals.db
    const errors = validationResult(req);
    const user_id = req.session.user.user_id;
    const accounts = await db.findLedgerByUser(user_id)

    if(!errors.isEmpty()){
        const ledger = await db.findLedgerByUser(user_id)
        return res.status(400).render('accounts',{
            user: req.session.user, accounts,
            errors: errors.array()
        })
    }
    const{name, bank, currency, balance} = req.body
    await db.insertLedger(user_id, name, bank, currency, balance)
    res.redirect('/accounts')
})

router.delete('/deleteaccount', async (req, res) =>{
    const db = req.app.locals.db;
    const {accountID} = req.body

    try {
        const deleted = await db.deleteLedger(accountID); 
  
        if (!deleted) {
          return res.status(404).send('Account not found');
        }
  
        res.sendStatus(204); 
      } catch (err) {
        console.error('Error deleting:', err);
        res.status(500).send('Server error');
      }
})
    /* Virker ikke.
router.post('/activateaccount', async(req, res) =>{
  const db = req.app.locals.db
  //const {} = req.body;
  console.log('test')
  await db.activateLedger(req.session.user.user_id);
  res.sendStatus(200);
})
*/
router.post('/deactivateaccount', async(req, res) =>{
  const db = req.app.locals.db
  const {accountID} = req.body;

  await db.deactivateLedger(accountID);
  res.sendStatus(200)
})


router.post('/changebalance', async (req, res) => {
    const db = req.app.locals.db
    const { accountId, amount, action } = req.body;
  
    try {
      await db.changeBalance(accountId, parseFloat(amount), action);
      res.redirect('/accounts'); 
    } catch (err) {
      console.error('Error updating balance:', err);
      res.status(500).send('Failed to update balance');
    }
  });

module.exports = router
