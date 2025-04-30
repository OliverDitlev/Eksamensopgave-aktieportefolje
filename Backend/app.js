const express = require('express');
const path = require('path');
const session = require('express-session')
const methodOverride = require('method-override');

const { getStockData } = require('./api');
const { passwordConfig } = require('../Database/config');
const { createDatabaseConnection } = require('../Database/database');
const accountsroutes = require('./Routes/accountroutes')
const ledgerRoutes = require('./Routes/ledgerroutes')


const app = express();
const port = 3000;  
require('dotenv').config();


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

  //await db.ensureLedgerTable()
  app.use('/', accountsroutes)
  app.use('/', ledgerRoutes)
}))

// funktion som videresender en bruger som ikke er logget ind til login-siden
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

app.get('/', reqLogin, reqActive, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

app.get('/login',(req, res) => {
  if (req.session.user) {
    return res.redirect('/manageaccount');
  }
  res.render('login', {
    errors: [],
    oldInput: {}
  });
});

app.get('/portofolios', reqLogin, reqActive, (req, res) => {
  res.render('portofolios', { user: req.session.user });
});

app.get('/createaccount', (req, res) => {
  res.render('createaccount', {
    errors: [],
    oldInput: {}
  });
});

app.get('/manageaccount', reqLogin, reqActive, (req, res) => {
  res.render('manageaccount', {
     user: req.session.user,
     errors:[],
     oldInput:{}
     });
});

app.get('/disabledaccount', reqLogin,(req,res)=>{
  res.render('disabledaccount',{
    user: req.session.user
  });
});

app.get('/specifikdata', reqLogin, reqActive, (req, res) => {
  res.render('specifikdata', {
    user: req.session.user
  });
});


app.get('/api/stock/:company', async (req, res) => {
  const company = req.params.company;
  try {
    const data = await getStockData(company);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});



app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})