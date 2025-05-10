// Denne fil er ansvarlig for at oprette serveren og forbinde til databasen. 
// Den håndterer også routes og middleware.

const express = require('express');
const path = require('path');
const session = require('express-session')
const methodOverride = require('method-override');

// Opretter en forbindelse til databasen og henter routes fra andre filer
const { passwordConfig } = require('../Database/config');
const { createDatabaseConnection } = require('../Database/database');
const dashboardRoutes = require('./Routes/Dashboardroutes');
const accountsroutes = require('./Routes/accountroutes');
const ledgerRoutes = require('./Routes/ledgerroutes');
const portfolioroutes = require('./Routes/portfolioroutes')
const { reqLogin, reqActive } = require('./middleware');

// Laver en express app og sætter porten til 3000
const app = express();
const port = 3000;
require('dotenv').config();
const { updateAllStockData } = require('./UpdateAPI');
const cron = require('node-cron')

// henterer den statiske mappe og views og bruger ejs som templating engine til at generere HTML sider dynamisk
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Middleware til at parse URL-encoded data og JSON-data fra formularer
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'tester',
  resave: false,
  saveUninitialized: true,
}))


// Opretter en global forbindelse til database
let db;
createDatabaseConnection(passwordConfig).then((async instance => {
  db = instance
  await db.connect();   
  db.pool = db.poolConnection; 
  app.locals.db = db;

  app.use('/', accountsroutes)
  app.use('/', ledgerRoutes)
  app.use('/', portfolioroutes)
  app.use('/', dashboardRoutes)

  // Opdatere aktiedata dagligt kl. 12:00
  cron.schedule('00 12 * * *', async () => {
    await updateAllStockData(db);
    console.log('Aktiedata opdateret');
}, { timezone: 'Europe/Copenhagen' }   
)
}))

// Bruger get til at vise login siden og redirecter til dashboard, hvis brugeren allerede er logget ind
app.get('/', reqLogin, reqActive, (req, res) => {
  res.redirect('/dashboard');
});

// Bruger get til at vise login siden og redirecter til manageaccount, hvis brugeren allerede er logget ind
app.get('/login',(req, res) => {
  if (req.session.user) {
    return res.redirect('/manageaccount');
  }
  res.render('login', {
    errors: [],
    oldInput: {}
  });
});

// Bruger get til at vise createaccount siden
app.get('/createaccount', (req, res) => {
  res.render('createaccount', {
    errors: [],
    oldInput: {}
  });
});

// Bruger get til at vise manageaccount siden
app.get('/manageaccount', reqLogin, reqActive, (req, res) => {
  res.render('manageaccount', {
     user: req.session.user,
     errors:[],
     oldInput:{}
     });
});

// Bruger get til at vise disabledaccount siden
app.get('/disabledaccount', reqLogin,(req,res)=>{
  res.render('disabledaccount',{
    user: req.session.user
  });
});

// Bruger get til at vise transactionhistory siden
app.get('/transactionhistory', reqLogin, reqActive, async (req, res) => {
  const db = req.app.locals.db;
  const user_id = req.session.user.user_id;

  // Henter transaktioner fra databasen
  const transactions = await db.findTransactionByUser(user_id);

  res.render('transactionhistory', {
    user: req.session.user, transactions
  });
});

app.listen(port, () =>{
    console.log(`Server listening on port:${port} `)
})