const express = require('express')
const {validationResult} = require('express-validator');
const { 
  reqActive, 
  reqLogin, 
  createAccountValidators, 
  loginValidators, 
  changeInfoValidators 
} = require('../middleware');

const router = express.Router()


//Route til at oprrette en ny bruger
router.post('/createaccount', createAccountValidators, async (req, res) => {

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
// Kalder funktionen i databasen, der opretter brugeren
await db.insertUser({
  firstname,
  lastname,
  email,
  password,
});

res.redirect('/');
});

router.post('/login', loginValidators, async (req, res) =>{
  const errors = validationResult(req);
  const db = req.app.locals.db
  // Bruges til at opsamle fejl fra både validator og db
  const errorList = errors.array()

  // Viser loginsiden igen, hvis valideringen giver fejl
  if(!errors.isEmpty()){
      return res.render('login',{
        errors: errorList,
        oldInput: req.body
      })
    }
    
const{email, password} = req.body;
try{
  // Forsøger at finde brugeren i databasen hvor email og password matcher
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
        created: user.created,
        active: user.active
      }
    // Sender brugeren tilbage til forsiden, når der er logget ind
    res.redirect('/')
}catch(err){
  console.error('Error with login', err)
  res.status(500).send('server error')
  }
})

// Opdaterer brugerens informationer med nyt indtastet input på /manageaccounts
router.put('/changeInfo', reqLogin, reqActive, changeInfoValidators, async(req, res)=>{
  const db = req.app.locals.db
  const errors = validationResult(req);

  // Hvis der er valideringsfejl, vis formularen med fejl og tidligere input
  if (!errors.isEmpty()) {
    return res.render('manageaccount', {
      errors: errors.array(),
      oldInput: req.body,
      user: req.session.user

    });
  }
  // Gemmer de nye informationer fra brugeren
  const {firstname, lastname, email, password} = req.body

  try {  

    // Brugerens nye informationer bliver opdateret i databasen
    await db.changeInfo(req.session.user.user_id, firstname, lastname, email, password)

    // Sessionen opdateres med de nye informationer, så brugeren ikke skal logge ind igen
    req.session.user = {
       ...req.session.user,
       firstname,
       lastname,
       email,
      };

    res.redirect('/');

  }catch(err){
    console.error('Error with login', err)
    res.status(500).send('server error')
  }

})

// Aktiverer bruger
router.patch('/activateaccount',async (req, res) =>{
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
router.patch('/disabledaccount', async(req, res)=>{
  const db = req.app.locals.db;
  // Kalder en funktion i databasen, der sætter brugerens 'active' status til værdien 0
  await db.deactivateUser(req.session.user.user_id)
  // Stopper sessionen og sender brugeren til login-siden
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