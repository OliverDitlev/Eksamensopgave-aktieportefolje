const express = require('express');
const path = require('path');
const{body, validationResult} = require('express-validator');
const { passwordConfig } = require('../Database/config');
const { createDatabaseConnection } = require('../Database/database');
const app = express();
const port = 3000;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

//opretter en global forbindel til database
let db;

createDatabaseConnection(passwordConfig).then((instance => {
  db = database;
}))

app.get('/',(req, res) => {
    res.render('dashboard');
});

app.get('/accounts', (req,res) => {
    res.render('accounts');
});

app.get('/login', (req,res) => {
  res.render('login', {
  errorCollected: [],
  });
});

app.get('/createaccount', (req,res) => {
    res.render('createaccount');
});

app.get('/portofolios', (req,res) => {
    res.render('portofolios');
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

      return res.render('createaccount',{
        errors: errors.array(),
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

console.log(`Ny bruger:`,req.body);
res.redirect('/');
});

//metode for at brugeren logger ind


const user = [
  {email:'', password:''}
]

app.post('/login',[
  body('email').isEmail().withMessage('Please enter an Email'),
  body('password').notEmpty().withMessage('Please enter password')
], async (req, res) => {
  const errors = validationResult(req)

  if(!errors.isEmpty()){
    return res.render('login', {
      errorlist: errors.array()
    })
  }
  let {email, password} = req.body;

  let user = await db.getUserByEmail(email);

  if(user && user.password == password){
    res.redirect('/')
  } else {
    return res.render('login', {
      errorlist:[{msg: 'Passord or Email is incorret'}]
    })
  }
}

)

app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})