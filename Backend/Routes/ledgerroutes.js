const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

//henter brugerens kontoer/ledger
router.get('/accounts', reqLogin, reqActive, async(req,res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id

    const accounts = await db.findLedgerByUser(user_id)
    console.log(req.session.user, accounts)
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
    console.log(req.body)
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
    
router.post('/addTransaction', async(req, res)=>{
  const db = req.app.locals.db
  const {accountId, amount, action} = req.body

  await db.addTransaction(accountId, parseFloat(amount), action)
  res.redirect('/accounts')
})

router.post('/changebalance', async (req, res) => {
    const db = req.app.locals.db
    const { accountId, amount, action } = req.body;
  
    try {
      await db.changeBalance(accountId, parseFloat(amount), action);
      await db.addTransaction(accountId, parseFloat(amount), action)
      res.redirect('/accounts'); 
    } catch (err) {
      console.error('Error updating balance:', err);
      res.status(500).send('Failed to update balance');
    }
  });

module.exports = router
