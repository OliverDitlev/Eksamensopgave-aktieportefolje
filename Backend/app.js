const express = require('express');
const path = require('path');
const sql = require('mssql');
const{body, validationResult} = require('express-validator');
const session = require('express-session')
const methodOverride = require('method-override');
const { passwordConfig } = require('../Database/config');
const { createDatabaseConnection } = require('../Database/database');
const app = express();
const port = 3000;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'tester',
  resave: false,
  saveUninitialized: true
}))



//opretter en global forbindel til database
let db;

createDatabaseConnection(passwordConfig).then((instance => {
  db = instance
}))

function authLogin(req, res, next){
  if(req.session.user){
    next()
  } else {
    res.redirect('/accounts')
  }
}



app.get('/', authLogin, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/accounts', (req, res) => {
  if (req.session.user) {
    return res.redirect('/manageaccount');
  }
  res.render('accounts');
});

app.get('/portofolios', authLogin, (req, res) => {
  res.render('portofolios', { user: req.session.user });
});

app.get('/createaccount', (req, res) => {
  if (req.session.user) {
    return res.redirect('/accounts');
  }
  res.render('createaccount', {
    errors: [],
    oldInput: {}
  });
});

app.get('/manageaccount', authLogin, (req, res) => {
  res.render('manageaccount', {
     user: req.session.user,
     errors:[],
     oldInput:{}
     });
});


app.post('/createaccount', [
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

], (req, res) => {

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

app.post('/login', [
  body('email')
  .trim()
  .notEmpty(). withMessage('Email required'),
  body('password')
  .trim()
  .notEmpty().withMessage('Password required')
], async (req, res) =>{
  const errors = validationResult(req);

  if(!errors.isEmpty()){
      return res.render('accounts',{
        errors: errors.array(),
        oldInput: req.body
      })
    }

const{email, password} = req.body;
try{
  const user = await db.findUserEmailAndPassword(email, password)

  if(!user){
    return res.status(401).render('accounts',{
      errors: [{msg:'Wrong Email or password'}],
      oldInput: req.body
    });
  }

    req.session.user = 
      {
        user_id: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email, 
        password: user.password,
        created: user.created
      }
    
  
    res.redirect('/')
}catch(err){
  console.error('Error with login', err)
  res.status(500).send('server error')
  }
})

app.post('/changeInfo',[
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
], async(req, res)=>{
  const errors = validationResult(req);

  if(!req.session.user){
    return res.redirect('/accounts')
  }
  if (!errors.isEmpty()) {
    return res.render('manageaccount', {
      errors: errors.array(),
      oldInput: req.body,
      user: req.session.user

    });
  }
  const {firstname, lastname, email, password} = req.body

  try{
    await db.poolConnection.request()
    .input('firstname', sql.VarChar, firstname)
    .input('lastname', sql.VarChar, lastname)
    .input('email', sql.VarChar, email)
    .input('password', sql.VarChar, password)
    .input('user_id', sql.UniqueIdentifier, req.session.user.user_id)
    .query(`
    update userAdministration
    set firstname = @firstname,
       lastname = @lastname,
       email = @email,
       password = @password
    where user_id = @user_id
    `)

    req.session.user = {
       ...req.session.user,
       firstname,
       lastname,
       email,
       password 
  
      };
    req.session.tempData = null;

  }catch(err){
    console.error('Error with login', err)
    res.status(500).send('server error')
  }


res.redirect('/')
})


app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})

