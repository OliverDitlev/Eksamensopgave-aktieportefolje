const express = require('express');
const path = require('path');
const session = require('express-session')
const methodOverride = require('method-override');

const { getStockData } = require('./api');
const { passwordConfig } = require('../Database/config');
const { database, createDatabaseConnection } = require('../Database/database');
const accountsroutes = require('./Routes/accountroutes')
const ledgerRoutes = require('./Routes/ledgerroutes')
const portfolioroutes = require('./Routes/portfolioroutes')

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
  saveUninitialized: true,
  cookie:{
    maxAge: 24 * 60 * 60 * 1000, //1 dag
    sameSite: 'lax',
    secure: false
  }
}))


//opretter en global forbindelse til database
let db;
createDatabaseConnection(passwordConfig).then((instance => {
  db = instance
  app.locals.db = db;

  //await db.ensureLedgerTable()
  app.use('/', accountsroutes)
  app.use('/', ledgerRoutes)
  app.use('/', portfolioroutes)
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

app.get('/portfolios', reqLogin, reqActive, async (req, res) => {
  try {
    const user_id = req.user_id; 
    const portfolios = await db.findPortfoliosByUser(user_id); 
    res.render('portfolios', { portfolios }); 
  } catch (err) {
    console.error('Error fetching portfolios:', err);
    res.status(500).send('Internal Server Error');
  }
  res.render('portfolios', { user: req.session.user });
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
/*
async function testDbConnection() {
  try {
    await database.connect(); // Sørg for, at du har oprettet forbindelse
    const testResult = await database.executeQuery('SELECT 1');
    console.log('Database test result:', testResult);
  } catch (err) {
    console.error('Error with database connection or query:', err);
  }
}
testDbConnection();
*/

app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})