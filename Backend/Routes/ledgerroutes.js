const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

//henter brugerens kontoer/ledger
router.get('/accounts', async(req,res) => {
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

module.exports = router
