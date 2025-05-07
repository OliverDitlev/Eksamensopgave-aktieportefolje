const express = require('express');
const path = require('path');
const session = require('express-session')
const methodOverride = require('method-override');



//const { getStockData } = require('./routes/api');
const { passwordConfig } = require('../Database/config');
const { database, createDatabaseConnection } = require('../Database/database');
const dashboardRoutes = require('./Routes/Dashboardroutes');
const accountsroutes = require('./Routes/accountroutes');
const ledgerRoutes = require('./Routes/ledgerroutes');
const portfolioroutes = require('./Routes/portfolioroutes')
const { reqLogin, reqActive, reqAccount } = require('./middleware');

const app = express();
const port = 3000;
require('dotenv').config();
const { updateAllStockData } = require('./UpdateAPI');
const cron = require('node-cron')

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
}))


//opretter en global forbindelse til database
let db;
createDatabaseConnection(passwordConfig).then((instance => {
  db = instance
  app.locals.db = db;

  app.use('/', accountsroutes)
  app.use('/', ledgerRoutes)
  app.use('/', portfolioroutes)
  app.use('/', dashboardRoutes)

  cron.schedule('0 12 * * *', () => {
    updateAllStockData(db);
    console.log('Opdateringsjob kørt kl. 12:00')
})
}))


app.get('/', reqLogin, reqActive, (req, res) => {
  res.redirect('/dashboard');
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

app.get('/transactionhistory', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const user_id = req.session.user.user_id;

  const transactions = await db.findTransactionByUser(user_id);

  res.render('transactionhistory', {
    user: req.session.user, transactions
  });
});
app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})