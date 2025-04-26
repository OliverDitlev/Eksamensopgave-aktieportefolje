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
.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter'),,

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
      // gøre at vi bliver på siden ved fejl
      return res.render('createaccount',{
        //returnere fejlen til ejs som array så dette kan tilgås
        errors: errors.array(),
        //gemmer det gamle input så brugeren ikke skal starte forfra
        oldInput: req.body
      })
    }

const { firstname, lastname, email, password } = req.body;

const userId = db.insertUser({
  firstname,
  lastname,
  email,
  password,
});

res.redirect('/');
});

router.post('/login', [
  body('email')
  .trim()
  .notEmpty(). withMessage('Email required'),
  body('password')
  .trim()
  .notEmpty().withMessage('Password required')

], async (req, res) =>{
  const errors = validationResult(req);
  const db = req.app.locals.db
  //bruges til opsamle fejl fra både vallidator og db
  const errorList = errors.array()

  if(!errors.isEmpty()){
      return res.render('login',{
        errors: errors.errorList,
        oldInput: req.body
      })
    }
    
const{email, password} = req.body;
try{
  const user = await db.findUserEmailAndPassword(email, password)

  if(!user){
    errorList.push({ msg: 'Wrong Email or password' });
   
    return res.status(401).render('login',{
      
      errors: errorList,
      oldInput: req.body
    });
  }
//gemmer brugeren info under sessionen
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
    res.redirect('/')
}catch(err){
  console.error('Error with login', err)
  res.status(500).send('server error')
  }
})

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

  if(!req.session.user){
    return res.redirect('/login')
  }
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

    await db.changeInfo(req.session.user.user_id, firstname, lastname, email, password)

    req.session.user = {
       ...req.session.user,
       firstname,
       lastname,
       email,
       password 
  
      };
    req.session.tempData = null; //nødvendig?**
    console.log('user:', req.session.user);

    res.redirect('/');

  }catch(err){
    console.error('Error with login', err)
    res.status(500).send('server error')
  }

})

router.post('/activateaccount',async (req, res) =>{
  const db = req.app.locals.db;
  await db.activateUser(req.session.user.user_id)
    
  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    res.redirect('/')
    })
  })

router.post('/disabledaccount', async(req, res)=>{
  const db = req.app.locals.db;
  await db.deactivateUser(req.session.user.user_id)
    
  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    res.redirect('/login')
    })
  })

router.get('/logout', (req, res) =>{
    
    const db = req.app.locals.db
  req.session.destroy(err =>{
    if(err){
      console.error('Error with logout', err);
      return res.status(500).send('could not logout');
    }
    res.redirect('/login')
    })
  })

  module.exports = router;