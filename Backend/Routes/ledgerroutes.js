const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive, accountValidators, } = require('../middleware.js');

// Henter brugerens konti/ledger
router.get('/accounts', reqLogin, reqActive, async(req,res) => {
    const db = req.app.locals.db;
    const user_id = req.session.user.user_id

    const accounts = await db.findLedgerByUser(user_id)
      // Henter konti fra databasen forventet out: 
      // [{accountID, name, bank, currency, balance, available_balance, ledger_created, ledger_Active}, 
    res.render('accounts', {
        user: req.session.user, 
        accounts, 
        errors: []
     })
})

// Opretter en ny konto til brugeren
router.post('/accounts', reqLogin, reqActive, accountValidators, async (req, res) => {

    const db = req.app.locals.db
    const errors = validationResult(req);
    const user_id = req.session.user.user_id;

    const accounts = await db.findLedgerByUser(user_id)
    // Henter konti fra databasen forventet output: 
    // [{accountID, name, bank, currency, balance, available_balance, ledger_created, ledger_Active}, 
    if(!errors.isEmpty()){
        return res.status(400).render('accounts',{
            user: req.session.user, accounts,
            errors: errors.array()
        })
    }
    const{name, bank, currency, balance} = req.body
    // Kalder funktionen til at oprette en konto i databasen
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
      // håndterer hvis kontoen ikke findes
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
    // Kalder funktion til at ændre balancen og bagefter en til at tilføje en transaktion til databasen
      await db.changeBalance(accountId, parseFloat(amount), action);
      await db.addTransaction(accountId, parseFloat(amount), action)
      res.redirect('/accounts'); 
    } catch (err) {
      console.error('Error updating balance:', err);
      res.status(500).send('Failed to update balance');
    }
  });

module.exports = router
