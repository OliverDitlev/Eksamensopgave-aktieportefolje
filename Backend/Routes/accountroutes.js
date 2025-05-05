const express = require('express')
const {body, validationResult} = require('express-validator')

const router = express.Router()

const { reqLogin, reqActive } = require('../middleware.js');

router.post('/createaccount', [
// valider Input fra brugere med brug af express-validator
body('firstname')
.notEmpty().withMessage('First name is required'),

body('lastname')
.notEmpty().withMessage('Last name is required'),

body('email')
.isEmail().withMessage('A valid email is required'),

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

], async (req, res) => {
    const db = req.app.locals.db;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Gør at vi bliver på siden ved fejl
      return res.render('createaccount',{
        // Returnerer fejlen til ejs som array så dette kan tilgås
        errors: errors.array(),
        // Gemmer det gamle input så brugeren ikke skal starte forfra
        oldInput: req.body
      })
    }

// Gemmer den nye bruger i databasen
const { firstname, lastname, email, password } = req.body;
const userId = db.insertUser({
  firstname,
  lastname,
  email,
  password,
});

// Redirecter til forsiden efter oprettelse
res.redirect('/');
});

router.post('/login', [
// Validerer inputtet til login
  body('email')
  .trim()
  .notEmpty(). withMessage('Email required'),
  body('password')
  .trim()
  .notEmpty().withMessage('Password required')

], async (req, res) =>{
  const errors = validationResult(req);
  const db = req.app.locals.db
  // Bruges til at opsamle fejl fra både validator og db
  const errorList = errors.array()

  // Viser loginsiden igen, hvis valideringen giver fejl
  if(!errors.isEmpty()){
      return res.render('login',{
        errors: errors.errorList,
        oldInput: req.body
      })
    }
    
const{email, password} = req.body;
try{
  // Forsøger at finde brugeren i databasen
  const user = await db.findUserEmailAndPassword(email, password)

  // Hvis brugeren ikke findes, vis fejl
  if(!user){
    errorList.push({ msg: 'Wrong Email or password' });
   
    return res.status(401).render('login',{
      
      errors: errorList,
      oldInput: req.body
    });
  }
    // Gemmer brugerens info under sessionen
    req.session.user = 
      {
        user_id: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email, 
        password: user.password,
        created: user.created,
        active: user.active
      }
    
      console.log(errorList)
    // Sender brugeren tilbage til forsiden, når der er logget ind
    res.redirect('/')
}catch(err){
  console.error('Error with login', err)
  res.status(500).send('server error')
  }
})

// Opdaterer brugerens informationer med nyt indtastet input på /manageaccounts
router.post('/changeInfo',[
body('firstname')
.notEmpty().withMessage('First name is required'),

body('lastname')
.notEmpty().withMessage('Last name is required'),

body('email')
.isEmail().withMessage('A valid email is required'),

body('password')
.optional({checkFalsy: true})
.trim()
.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
.matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),,

// repeatpassword skal matche med password
body('repeatpassword')
.optional({checkFalsy: true})
.trim()
.custom((value, { req }) => {
    
  if (value !== req.body.password) {
    throw new Error('Passwords do not match');
  }
  return true;
})
], async(req, res)=>{
  const db = req.app.locals.db
  const errors = validationResult(req);

  // Hvis brugeren ikke er logget ind, send dem til login-siden
  if(!req.session.user){
    return res.redirect('/login')
  }
  // Hvis der er valideringsfejl, vis formularen med fejl og tidligere input
  if (!errors.isEmpty()) {
    return res.render('manageaccount', {
      errors: errors.array(),
      oldInput: req.body,
      user: req.session.user

    });
  }

  const {firstname, lastname, email, password} = req.body

  try {  
    console.log('session:', req.session);
    console.log('user:', req.session.user);

    // Brugerens nye informationer bliver opdateret i databasen
    await db.changeInfo(req.session.user.user_id, firstname, lastname, email, password)

    // Sessionen opdateres med de nye informationer, så brugeren ikke skal logge ind igen
    req.session.user = {
       ...req.session.user,
       firstname,
       lastname,
       email,
       password 
      };

    // req.session.tempData = null; // Slet, hvis appen kører fint uden denne linje
    console.log('user:', req.session.user);

    res.redirect('/');

  }catch(err){
    console.error('Error with login', err)
    res.status(500).send('server error')
  }

})

// Aktiverer bruger
router.post('/activateaccount',async (req, res) =>{
  const db = req.app.locals.db;
  // Kalder funktion i databasen, som sætter brugeres 'active' status til værdien 1
  await db.activateUser(req.session.user.user_id)
  
  // Stopper sessionen
  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    res.redirect('/')
    })
  })

// Deaktiverer bruger
router.post('/disabledaccount', async(req, res)=>{
  const db = req.app.locals.db;
  // Kalder en funktion i databasen, der sætter brugerens 'active' status til værdien 0
  await db.deactivateUser(req.session.user.user_id)
  
  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    res.redirect('/login')
    })
  })

// Logger brugeren ud
router.get('/logout', (req, res) =>{
  const db = req.app.locals.db

  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    // Sender brugeren til login-siden
    res.redirect('/login')
    })
  })

  module.exports = router;