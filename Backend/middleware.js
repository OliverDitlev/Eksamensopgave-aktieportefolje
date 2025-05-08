const { getExchangeRates } = require('./exrateAPI');

const { body } = require('express-validator');

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

async function convertCurrency(req, res, next) {
  try {
    // Henter valutakurser
    const rates = await getExchangeRates();
    if (!rates) {
      throw new Error('Kunne ikke hente valutakurser. Anskaf nye API-nøgle.');
    }

    // Funktion til at omregne til DKK
    req.convertToDKK = (value, currency) => {
      if (!rates[currency]) {
        throw new Error(`Valutaen ${currency} kunne ikke hentes.`);
      }
      return value * rates['DKK'] / rates[currency];
    };

    next();
  } catch (error) {
    console.error('Fejl ved hentning af valutakurser:', error);
    res.status(500).send('Kunne ikke hente valutakurser.');
  }
}

const accountValidators = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('balance').trim().isNumeric().withMessage('Enter valid number'),
];

const transactionValidators = [
  body('accountId').notEmpty().withMessage('Account ID required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('action').isIn(['deposit', 'withdrawal']).withMessage('Invalid action'),
];


const createAccountValidators = [
  body('firstname').notEmpty().withMessage('First name is required'),
  body('lastname').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password')
    .trim()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),
  body('repeatpassword')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const loginValidators = [
  body('email').trim().notEmpty().withMessage('Email required'),
  body('password').trim().notEmpty().withMessage('Password required')
];

const changeInfoValidators = [
  body('firstname').notEmpty().withMessage('First name is required'),
  body('lastname').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),
  body('repeatpassword')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];


  
module.exports = {
  reqActive, 
  reqLogin, 
  convertCurrency, 
  accountValidators, 
  transactionValidators,
  createAccountValidators, 
  loginValidators, 
  changeInfoValidators
};  