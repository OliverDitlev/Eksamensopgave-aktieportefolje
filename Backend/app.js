const express = require('express');
const path = require('path');
const sqconstl = require('mssql');
const session = require('express-session')
const methodOverride = require('method-override');
const { passwordConfig } = require('../Database/config');
const { createDatabaseConnection } = require('../Database/database');
const { console } = require('inspector');
const app = express();
const port = 3000;
const accountsroutes = require('./Routes/accountroutes')

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
  app.locals.db = db;

  app.use('/', accountsroutes)
}))

// funktion som videresender en bruger som ikke er logget ind til login-siden
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
  res.render('accounts', {
    errors: [],
    oldInput: {}
  });
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



app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})