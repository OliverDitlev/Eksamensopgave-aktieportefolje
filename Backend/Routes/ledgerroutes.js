const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

// Henter brugerens konti/ledger
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

// Opretter en ny konto til brugeren
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

// Sletter en konto fra brugeren
router.delete('/deleteaccount', async (req, res) =>{
    const db = req.app.locals.db;
    const {accountID} = req.body

    try {
        // Forsøger at slette kontoen fra databasen udfra accountID
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

// tilføjer en transaktion til en konto
router.post('/addTransaction', async(req, res)=>{
  const db = req.app.locals.db
  const {accountId, amount, action} = req.body
  // Kalder funktion til at tilføje en transaktion til databasen
  await db.addTransaction(accountId, parseFloat(amount), action)
  res.redirect('/accounts')
})

// Ændrer balancen på en konto
router.post('/changebalance', async (req, res) => {
    const db = req.app.locals.db
    const { accountId, amount, action } = req.body;
  
    try {
    // Kalder funktion til at ændre balancen og samtidig en til at tilføje en transaktion til databasen
      await db.changeBalance(accountId, parseFloat(amount), action);
      await db.addTransaction(accountId, parseFloat(amount), action)
      res.redirect('/accounts'); 
    } catch (err) {
      console.error('Error updating balance:', err);
      res.status(500).send('Failed to update balance');
    }
  });
/*
  router.get('/transactions', async (req, res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id;
  
    // Hent alle transaktioner fra databasen
    const transactions = await db.getAllTransactionsByUser(user_id);
  
    // Send dem videre til siden
    res.render('transactions', {
      user: req.session.user,
      transactions
    });
  });
  */

module.exports = router
