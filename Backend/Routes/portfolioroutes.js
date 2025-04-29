const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const { reqLogin, reqActive, reqAccount } = require('../middleware.js');



router.get('/portfolios/:accountId', async (req,res) =>{
    const db = req.app.locals.db;
    const account_id = req.params.accountId

    const portfolios = await db.findPortfoliosByAccountId(account_id);
    const account = await db.getLedgerById(account_id)

    res.render('portfolios', {
    user: req.session.user,
    account_id,
    account,
    portfolios,
    errors: []
    
});
console.log('Portfolios data:', portfolios);
})

// Opretter en ny portefølje
router.post('/portfolios', [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name required')
], async (req, res) => {
    const db = req.app.locals.db;
    const errors = validationResult(req);

    const { name, accountId } = req.body;

    if (!errors.isEmpty()) {
        const portfolios = await db.findPortfoliosByAccountId(accountId);
        return res.status(400).render('portfolios', {
            user: req.session.user,
            portfolios,
            account_id: accountId,
            account: await db.getLedgerById(accountId),
            errors: errors.array()
        });
    }
        await db.insertPortfolio(accountId, name);
        res.redirect(`/portfolios/${accountId}`);

});

// Sletter en portefølje
router.delete('/deleteportfolio', async (req, res) => {
    const db = req.app.locals.db;
    const { portfolioID } = req.body;

    try {
        const deleted = await db.deletePortfolio(portfolioID);

        if (!deleted) {
            return res.status(404).send('Portfolio ikke fundet');
        }

        res.sendStatus(204);
    } catch (err) {
        console.error('Fejl ved sletning af portfolio:', err);
        res.status(500).send('Serverfejl');
    }
});

module.exports = router;