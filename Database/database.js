// Filen indeholder alle queries til databasen og sørger for at oprette forbindelse til databasen.

const { request } = require('express');
const sql = require('mssql');
let database = null;

class Database {
  config = {};
  poolConnection = null;
  connected = false;

  constructor(config) {
    this.config = config;
  }

  // Opretter forbindelse til databasen
  async connect() {
    try {
      this.poolConnection = await sql.connect(this.config);
      this.connected = true;
      console.log('Database connected successfully.');
      return this.poolConnection;
    } catch (error) {
      console.error('Error connecting to the database:', error);
      this.connected = false;
    }
  }

  // Lukker forbindelsen til databasen
  async disconnect() {
    try {
      if (this.connected) {
        await this.poolConnection.close();
        this.connected = false;
        console.log('Database disconnected successfully.');
      }
    } catch (error) {
      console.error('Error disconnecting from the database:', error);
    }
  }

  // Bruges til at køre SQL queries til databasen 
  async executeQuery(query) {
    const request = this.poolConnection.request();
    const result = await request.query(query);
    return result.rowsAffected[0];
  }

  // Opretter tablet userAdministration for at gemme brugere
  async createTable() {
    const query = `
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'userAdministration'
    )
    BEGIN
      CREATE TABLE [dbo].[userAdministration] (
        [user_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [firstname] VARCHAR(50) NOT NULL,
        [lastname] VARCHAR(50) NOT NULL,
        [email] VARCHAR(50) NOT NULL UNIQUE,
        [password] VARCHAR(100) NOT NULL,
        [created] DATETIME DEFAULT GETDATE(),
        [active] BIT NOT NULL DEFAULT 1
      )
    END
  `;

    this.executeQuery(query)
      .then(() => {
        console.log("Table created ");
      })
  }

  // Insætter en ny bruger i databasen
  async insertUser({ firstname, lastname, email, password }) {
    const query = `
      INSERT INTO userAdministration (firstname, lastname, email, password)
      OUTPUT INSERTED.user_id
      VALUES (@firstname, @lastname, @email, @password)
    `;

    const request = this.poolConnection.request();
    request.input('firstname', sql.VarChar, firstname);
    request.input('lastname', sql.VarChar, lastname);
    request.input('email', sql.VarChar, email);
    request.input('password', sql.VarChar, password);
  
    const result = await request.query(query);
    return result.recordset[0].user_id;
  }

  // Tjekker om brugeren findes i databasen
  async findUserEmailAndPassword(email, password){
    const query = `
    Select user_id, firstname, lastname, email, password, created, active
    From userAdministration 
    Where email = @email and password = @password
   `
   const request = this.poolConnection.request();
   request.input('email', sql.VarChar, email);
   request.input('password', sql.VarChar, password);

   const result = await request.query(query);
   return result.recordset[0]
  }

  // Opdaterer brugerens oplysninger i databasen
  async changeInfo(user_id, firstname, lastname, email, password) {
    const request = this.poolConnection.request()
      request.input('firstname', sql.VarChar, firstname)
      request.input('lastname', sql.VarChar, lastname)
      request.input('email', sql.VarChar, email)
      request.input('user_id', sql.UniqueIdentifier, user_id);

      let query = `
            UPDATE userAdministration
            SET firstname = @firstname,
                lastname = @lastname,
                email = @email`;
        
          if (password && password.trim() == '') {
            request.input('password', sql.VarChar, password); 
            query += `,
                password = @password`;
          }
        
          query += ` WHERE user_id = @user_id`

         const result = await request.query(query);
         return result.rowsAffected[0]
    
  }

  // Deaktiverer brugeren i databasen
  async deactivateUser(user_id){
  const request = this.poolConnection.request()
  request.input('user_id', sql.UniqueIdentifier, user_id)
  const query = 'UPDATE userAdministration SET active = 0 WHERE user_id = @user_id'
  
  const result = await request.query(query);
  return result.rowsAffected[0]
  }

  // Aktiverer brugeren i databasen
  async activateUser(user_id){
  const request = this.poolConnection.request()
  request.input('user_id', sql.UniqueIdentifier, user_id)
  const query = 'UPDATE userAdministration SET active = 1 WHERE user_id = @user_id'
  
  const result = await request.query(query);
  return result.rowsAffected[0]
  }  

  // Opretter tabet userledger til at gemme brugernes konti
  async createLedger() {
    const query = `
     IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'userledger'
    )
      BEGIN 
        CREATE TABLE [dbo].[userledger](
        [account_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES userAdministration(user_id),
        [name] VARCHAR(50)NOT NULL,
        [bank] VARCHAR(50) NOT NULL,
        [currency] CHAR(3) NOT NULL CHECK(currency IN('DKK','USD','GBP')),
        [balance] DECIMAL(12,1) NOT NULL,
        [available_balance] DECIMAL(12,1) NOT NULL,
        [ledger_created] DATETIME DEFAULT GETDATE(),
        [ledger_Active] BIT NOT NULL DEFAULT 1
        )
      END
    `;
    this.executeQuery(query)
    .then(() => {
      console.log("Ledger created ");
    })
  }

  // Henter alle konti tilhørende en bruger
  async findLedgerByUser(user_id) {
    const query = `
    SELECT *
    FROM userledger
    WHERE user_id = @user_id
    `;
    const request = await this.poolConnection
    .request()
    .input('user_id', sql.UniqueIdentifier, user_id)
    .query(query)
    return request.recordset
  }

  // Opretter en ny konto til brugeren
  async insertLedger(user_id, name, bank, currency, balance){
    const query = `
    INSERT INTO userledger(user_id, name, bank, currency, balance, available_balance)
    OUTPUT INSERTED.* 
    VALUES (@user_id, @name, @bank, @currency, @balance, @balance) 
    `;
    const request = await this.poolConnection
    .request()
    .input('user_id', sql.UniqueIdentifier, user_id)
    .input('name', sql.VarChar, name)
    .input('bank', sql.VarChar, bank)
    .input('currency', sql.Char(3), currency)
    .input('balance', sql.Decimal, balance)
    .query(query)
    return request.recordset[0]
  }

  // Sletter en konto og alle tilhørende transaktioner, trades, aktier og porteføljer for en bruger
  async deleteLedger(account_id){
    const request = this.poolConnection
    .request()
    .input('account_id', sql.UniqueIdentifier, account_id)
    await request.query('DELETE FROM [dbo].[ledgertransactions] WHERE account_id = @account_id')
    await request.query('DELETE FROM [dbo].[tradehistory] WHERE portfolio_id IN(SELECT portfolio_id from dbo.portfolios where account_id = @account_id)')
    await request.query('DELETE FROM [dbo].[portfolios_stocks] WHERE portfolio_id IN(SELECT portfolio_id from dbo.portfolios where account_id = @account_id)')
    await request.query('DELETE FROM [dbo].[portfolios] WHERE account_id = @account_id')
    const result = await request.query('DELETE FROM [dbo].[userledger] WHERE account_id = @account_id')

    return result.rowsAffected[0]
  }

  // Opretter tablet ledgertransactions til at gemme transaktioner (deposit/withdraw fra kontoen)
  async createTransactions(){
    const query = `
        IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'ledgertransactions'
      )
      BEGIN
        CREATE TABLE [dbo].[ledgertransactions] (
        [transaction_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [account_id] UNIQUEIDENTIFIER NOT NULL REFERENCES userledger(account_id),
        [action] VARCHAR(15) NOT NULL CHECK(action IN('Deposit', 'Withdraw')),
        [amount] DECIMAL(12,1),
        [balance_after] DECIMAL(12, 1),
        [transaction_time] DATETIME DEFAULT GETDATE()
      )
      END
    `
    this.executeQuery(query)
    .then(() => {
      console.log("Transactions table created ");
    })
  }

  // Henter saldoen for en konto
  async getBalanceAccount(account_id){
    const query = `
    SELECT balance
    FROM userledger
    WHERE account_id= @account_id
    `
    const request =this.poolConnection.request()
    request.input('account_id', sql.UniqueIdentifier, account_id)


    const result = await request.query(query);

    return result.recordset[0].balance
  }

  // Opdaterer saldoen for en konto afhængig af, om det er en indbetaling eller hævning
  async changeBalance(account_id, amount, action) {
    const balance = await this.getBalanceAccount(account_id) 

    if(action === 'Withdraw' && balance < amount){
      throw new Error('Insuffienct money')

    }

    let query;
    if(action === 'Deposit'){
      query = `
      UPDATE userledger
      SET balance = balance + @amount,
      available_balance = available_balance + @amount
      WHERE account_id = @account_id
      `
    }else{
      query = `
      UPDATE userledger
      SET balance = balance - @amount,
      available_balance = available_balance - @amount
      WHERE account_id = @account_id
      `      
    }
    
    const request =this.poolConnection.request()
    request.input('account_id', sql.UniqueIdentifier, account_id)
    request.input('amount', sql.Decimal(15, 0), amount)

    const result = await request.query(query);

    return result.rowsAffected[0]
  }

  // Gemmer en transaktion i ledgertransactions tablet
  async addTransaction(accountId, amount, action){
    const pool = await sql.connect();

    // Henter den opdaterede balance efter transaktionen
    const queryBalance = `
      SELECT available_balance
      FROM userledger
      WHERE account_id = @accountId
    `;
    const balanceResult = await pool.request()
    .input('accountId', sql.UniqueIdentifier, accountId)
    .query(queryBalance);

    const availableBalance = balanceResult.recordset[0].available_balance;

    await pool.request()
    .input('accountId', sql.UniqueIdentifier, accountId)
    .input('amount', sql.Decimal(12,1), amount)
    .input('action', sql.VarChar(10), action)
    .input('availableBalance', sql.Decimal(12,1), availableBalance)
    .query(`
      INSERT INTO ledgertransactions (account_id, amount, action, balance_after)
      VALUES(@accountId, @amount, @action, @availableBalance)
    `)
  }

  // Henter alle transaktioner for en bruger
  async findTransactionByUser(user_id) {
    const query = `
      SELECT 
        ledgertransaction.transaction_id,
        ledgertransaction.amount,
        ledgertransaction.action,
        ledgertransaction.balance_after,
        ledgertransaction.transaction_time,
        ledger.name AS account_name,
        ledger.currency
      FROM ledgertransactions ledgertransaction
      INNER JOIN userledger ledger ON ledgertransaction.account_id = ledger.account_id
      WHERE ledger.user_id = @user_id
      ORDER BY ledgertransaction.transaction_time DESC
    `
    const request = await this.poolConnection
    .request()
    .input('user_id', sql.UniqueIdentifier, user_id)
    .query(query);

  return request.recordset;
  }

  // Henter alle porteføljer for en bruger
  async findPortfoliosByAccountId(account_id) {
    const query = `
      SELECT *
      FROM portfolios
      WHERE account_id = @account_id
    `;
    const request = this.poolConnection.request();
    request.input('account_id', sql.UniqueIdentifier, account_id);
    const result = await request.query(query);
    return result.recordset;
  }

  // Henter en portefølje ud fra dens ID
  async findPortfoliosById(portfolio_id) {
    const query = `
      SELECT *
      FROM portfolios
      WHERE portfolio_id = @portfolio_id
    `;
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    const result = await request.query(query);
    return result.recordset[0];
  }

  // Henter en konto ud fra dens ID
  async getLedgerById(account_id) {
    const query = `SELECT * FROM userledger WHERE account_id = @account_id`;
    const request = this.poolConnection.request();
    request.input('account_id', sql.UniqueIdentifier, account_id);
    const result = await request.query(query);
    return result.recordset[0];
  }

  // Opretter tablet portfolios til at gemme porteføljer
  async createPortfolios() {
    const query = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'portfolios'
      )
      BEGIN
        CREATE TABLE portfolios (
          portfolio_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          user_id UNIQUEIDENTIFIER NOT NULL REFERENCES userAdministration(user_id),
          account_id UNIQUEIDENTIFIER NOT NULL REFERENCES userledger(account_id),
          name VARCHAR(100) NOT NULL,
          created_at DATETIME DEFAULT GETDATE()
        );
      END
    `;
    this.executeQuery(query)
      .then(() => {
        console.log("Portfolios table created");
      });
  }

  // Opretter en ny portefølje for en bruger
  async insertPortfolio(user_id, name, account_id) {
    const query = `
        INSERT INTO portfolios (user_id, name, account_id, created_at)
        VALUES (@user_id, @name, @account_id, GETDATE())
    `;
    const request = this.poolConnection.request();
    request.input('user_id', sql.UniqueIdentifier, user_id);
    request.input('name', sql.VarChar, name);
    request.input('account_id', sql.UniqueIdentifier, account_id);
    
    await request.query(query);
  }

  // Henter alle porteføljer for en bruger
  async findPortfoliosByUser(user_id) {
    try {
      const query = `
        SELECT *
        FROM portfolios
        WHERE user_id = @user_id
      `;
      const request = await this.poolConnection.request();
      request.input('user_id', sql.UniqueIdentifier, user_id);
      const result = await request.query(query);
      return result.recordset; 
    } catch (err) {
      console.error('Error in findPortfoliosByUser:', err); 
      throw err; 
    }
  }

  // Opretter tablet portfolios_stocks til at gemme aktier i porteføljer
  async createPortfolios_stocks() {
    const query = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'portfolios_stocks'
      )
      BEGIN
        CREATE TABLE portfolios_stocks (
          stock_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          portfolio_id UNIQUEIDENTIFIER NOT NULL REFERENCES portfolios(portfolio_id),
          ticker VARCHAR(20) NOT NULL REFERENCES stocks(ticker),
          action VARCHAR(10) NOT NULL,
          volume INT NOT NULL,
          purchase_price DECIMAL(12, 2),
          created_at DATETIME DEFAULT GETDATE()
        );
      END
    `;
    this.executeQuery(query)
      .then(() => {
        console.log("portfolios_stocks table created");
      });
  }

  // Tilføjer nøglen til portfolios_stocks tabellen, som viser om aktien er købt eller solgt
  async addActionColumnToPortfoliosStocks() {
    const query = `
      IF NOT EXISTS (
        SELECT * 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'portfolios_stocks' AND COLUMN_NAME = 'action'
      )
      BEGIN
        ALTER TABLE portfolios_stocks
        ADD action VARCHAR(10) NOT NULL DEFAULT 'BUY';
      END
    `;
    await this.executeQuery(query);
    console.log("Action column added to portfolios_stocks table (if it didn't already exist).");
  }

  // Opretter tablet stocks til at gemme informationer for aktier
  async stocks() {
    const query = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'stocks'
      )
      BEGIN
        CREATE TABLE stocks (
          ticker VARCHAR(20) PRIMARY KEY,
          company_name VARCHAR(100),
          currency CHAR(3),
          last_updated DATETIME
        );
      END
    `
    this.executeQuery(query)
      .then(() => {
        console.log("Stock table created");
      });
  }

  // Opretter tablet tradehistory til at gemme data for handler
  async createTradeHistory() {
    const query = `
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'userledger'
    )
      BEGIN 
        CREATE TABLE [dbo].[tradehistory](
        [trade_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portfolio_id UNIQUEIDENTIFIER NOT NULL REFERENCES portfolios(portfolio_id),
        ticker VARCHAR(20) NOT NULL REFERENCES stocks(ticker),
        action VARCHAR(10) NOT NULL CHECK(action IN('BUY', 'SELL')),
        volume INT NOT NULL,
        price DECIMAL(12, 2) NOT NULL,
        trade_time DATETIME DEFAULT GETDATE()
      )
      END
    `;
    this.executeQuery(query)
    .then(() => {
      console.log("Tradehistory created ");
    })
  }

  // Henter alle handler for en portefølje (Bruges til nemt at liste handelshistorikken under History & more)
  async findTradeHistoryByPortfolio(portfolio_id) {
    const query = `
      SELECT 
      tradehistory.trade_id,
      tradehistory.portfolio_id,
      tradehistory.ticker AS ticker,
      tradehistory.action,
      tradehistory.volume,
      tradehistory.price,
      tradehistory.trade_time,
      stocks.company_name,
      stocks.currency,
      stocks.last_updated
      FROM tradehistory
      JOIN stocks ON tradehistory.ticker = stocks.ticker
      WHERE tradehistory.portfolio_id = @portfolio_id
      ORDER BY trade_time DESC
    `;
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    const result = await request.query(query);
    return result.recordset;
  }

  // Insætter en ny handel i tradehistory tablet
  async insertTradeHistory(portfolio_id, ticker, action, volume, price) {
    const query = `
      INSERT INTO tradehistory (portfolio_id, ticker, action, volume, price)
      VALUES (@portfolio_id, @ticker, @action, @volume, @price)
    `;
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    request.input('ticker', sql.VarChar(20), ticker);
    request.input('action', sql.VarChar(10), action);
    request.input('volume', sql.Int, volume);
    request.input('price', sql.Decimal(12, 2), price);

    await request.query(query);
  }

  // Henter alle aktier for en bruger
  // Alle ROUND queries bruges til at udregne henholdsvis total_growth_percent, 24h change, 7d change og 30 day change i procent (vises bl.a under portfolio)
  async findAllStocksForUser(user_id) {
    const query = `
      SELECT 
        SUM(portfolios_stocks.volume * portfolios_stocks.purchase_price) AS total_purchase_value,
        SUM(portfolios_stocks.volume * stock_price_history.price_tday) AS total_current_value,

        ROUND(
          ((SUM(portfolios_stocks.volume * stock_price_history.price_tday) - 
            SUM(portfolios_stocks.volume * portfolios_stocks.purchase_price)) / 
            NULLIF(SUM(portfolios_stocks.volume * portfolios_stocks.purchase_price), 0)) * 100, 
          2
        ) AS total_growth_percent,

        ROUND(
          ((SUM(portfolios_stocks.volume * stock_price_history.price_tday) - 
            SUM(portfolios_stocks.volume * stock_price_history.price_ysday)) / 
            NULLIF(SUM(portfolios_stocks.volume * stock_price_history.price_ysday), 0)) * 100, 
          2
        ) AS change_24h,

        ROUND(
          ((SUM(portfolios_stocks.volume * stock_price_history.price_tday) - 
            SUM(portfolios_stocks.volume * stock_price_history.price_7d)) / 
            NULLIF(SUM(portfolios_stocks.volume * stock_price_history.price_7d), 0)) * 100, 
          2
        ) AS change_7d,

        ROUND(
          ((SUM(portfolios_stocks.volume * stock_price_history.price_tday) - 
            SUM(portfolios_stocks.volume * stock_price_history.price_1m)) / 
            NULLIF(SUM(portfolios_stocks.volume * stock_price_history.price_1m), 0)) * 100, 
          2
        ) AS change_30d

      FROM portfolios_stocks
      JOIN portfolios ON portfolios_stocks.portfolio_id = portfolios.portfolio_id
      JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
      WHERE portfolios.user_id = @user_id
        AND portfolios_stocks.action = 'BUY';
  `
  const request = this.poolConnection.request();
  request.input('user_id', sql.UniqueIdentifier, user_id);


  const result = await request.query(query);
  if (!result.recordset) return [];
  return result.recordset[0];
  }

  // Gemmer ny historisk aktiedata i databasen
  async saveStockData(ticker, companyName, currency, daily, monthly) {
    const pool = this.poolConnection;
    // Tjekker om aktien findes. Hvis ikke, indsæt i stocks 
    await pool.request()
      .input('ticker', sql.VarChar, ticker)
      .input('name', sql.VarChar, companyName)
      .input('currency', sql.Char(3), currency)
      .query ( `
        MERGE stocks AS tgt
        USING (SELECT @ticker AS ticker) AS src
        ON tgt.ticker = src.ticker
        WHEN MATCHED THEN
          UPDATE SET company_name = ISNULL(@name, tgt.company_name),
                    currency     = ISNULL(@currency, tgt.currency),
                    last_updated = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (ticker, company_name, currency, last_updated)
          VALUES (@ticker, @name, @currency, GETDATE());
      `)

      const request = pool.request()
      request.input('ticker', sql.VarChar, ticker)
      request.input('currency', sql.Char(3), currency)
      request.input('last_updated', sql.DateTime, new Date())

      request.input('daily0', sql.Decimal(18, 4), daily[0])
      request.input('daily1', sql.Decimal(18, 4), daily[1])
      request.input('daily6', sql.Decimal(18, 4), daily[6]);

      for(let i = 0; i < 12; i++){
        request.input(`month${i+1}`, sql.Decimal(18, 4), monthly[i])
      }

      // Henter den sidste opdateringstidspunkt for aktien
      const query =`
      MERGE stock_price_history AS tgt
      USING (SELECT @ticker AS ticker) AS src
      ON tgt.ticker = src.ticker
      WHEN MATCHED THEN
        UPDATE SET
          price_tday = @daily0,
          price_ysday = @daily1,
          price_7d = @daily6,
          price_1m = @month1,
          price_2m = @month2,
          price_3m = @month3,
          price_4m = @month4,
          price_5m = @month5,
          price_6m = @month6,
          price_7m = @month7,
          price_8m = @month8,
          price_9m = @month9,
          price_10m = @month10,
          price_11m = @month11,
          price_12m = @month12,
          last_updated = @last_updated
      WHEN NOT MATCHED THEN
        INSERT (ticker, price_tday, price_ysday, price_7d,
                price_1m, price_2m, price_3m,
                price_4m, price_5m, price_6m,
                price_7m, price_8m, price_9m,
                price_10m, price_11m, price_12m,
                currency, last_updated)
        VALUES (@ticker, @daily0, @daily1, @daily6,
                @month1, @month2, @month3,
                @month4, @month5, @month6,
                @month7, @month8, @month9,
                @month10, @month11, @month12,
                @currency, @last_updated);
      `
    await request.query(query)
  }

  // Indsætter købt aktie i porteføljen og trækker beløbet fra brugerens konto
  async insertStockToPortfolio(portfolio_id, ticker, volume, price) {
    const cost = price * volume

    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    request.input('ticker', sql.VarChar(20), ticker);
    request.input('volume', sql.Int, volume);
    request.input('price', sql.Decimal(12, 2), price);
    request.input('cost', sql.Decimal(12,2), cost)
    const query = `
      INSERT INTO portfolios_stocks (portfolio_id, ticker, action, volume, purchase_price)
      VALUES (@portfolio_id, @ticker, 'BUY', @volume, @price)

      UPDATE userledger
      SET available_balance = available_balance - @cost
      WHERE account_id = (
      SELECT account_id
      FROM portfolios
      WHERE portfolio_id = @portfolio_id)
    `;

    await request.query(query);
    }

  // Henter alle aktier i en portefølje
  async findStocksByPortfolio(portfolio_id){
    const query = `
    SELECT 
        portfolios_stocks.ticker,
        portfolios_stocks.volume,
        portfolios_stocks.purchase_price,
        stock_price_history.price_tday AS last_price,
        stock_price_history.currency,
        stocks.company_name,
        (portfolios_stocks.volume * stock_price_history.price_tday) AS value,
        (stock_price_history.price_tday - portfolios_stocks.purchase_price) * portfolios_stocks.volume AS unrealized_gain,
        ROUND(((stock_price_history.price_tday - stock_price_history.price_ysday) / stock_price_history.price_ysday) * 100, 2) AS change_24h,
        ROUND(((stock_price_history.price_tday - stock_price_history.price_7d) / stock_price_history.price_7d) * 100, 2) AS change_7d

      FROM portfolios_stocks
      JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
      JOIN stocks ON portfolios_stocks.ticker = stocks.ticker
      WHERE portfolios_stocks.portfolio_id = @portfolio_id
      AND portfolios_stocks.action = 'BUY';
    `
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);

    const result = await request.query(query);
    if (!result.recordset) return [];
    return result.recordset;
  }

  // Henter en aktie, som skal sælges
  async findStockInPortfolioForSelling(portfolio_id, ticker) {
    const query = `
      SELECT 
        ps.*,
        p.account_id,
        s.currency AS stock_currency
      FROM portfolios_stocks ps
      JOIN portfolios p ON ps.portfolio_id = p.portfolio_id
      JOIN stocks s ON ps.ticker = s.ticker
      WHERE ps.portfolio_id = @portfolio_id AND ps.ticker = @ticker AND ps.action = 'BUY';
    `;
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    request.input('ticker', sql.VarChar(20), ticker);

    const result = await request.query(query);
    return result.recordset[0];
  }

  // Reducerer volumen af aktien med action = BUY ved salget og opretter en ny record for aktien med action = SELL
  async removeStockFromPortfolio(portfolio_id, ticker, volume, sell_price) {
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    request.input('ticker', sql.VarChar(20), ticker);
    request.input('volume', sql.Decimal(12, 2), volume);
    request.input('sell_price', sql.Decimal(12, 2), sell_price);

    // Reducere volumen af aktien med action = BUY med antallet, der sælges
    const updateBuyQuery = `
        UPDATE portfolios_stocks
        SET volume = volume - @volume
        WHERE portfolio_id = @portfolio_id AND ticker = @ticker AND action = 'BUY' AND volume >= @volume;
    `;
    await request.query(updateBuyQuery);
    
    // Sletter aktien hvis volumen er 0
    const deleteIfNoVolumeQuery = `
    DELETE FROM portfolios_stocks
    WHERE portfolio_id = @portfolio_id AND ticker = @ticker AND action = 'BUY' AND volume = 0;
    `;
    await request.query(deleteIfNoVolumeQuery);

    // Opret ny record for aktien med action = SELL
    const insertSellQuery = `
        INSERT INTO portfolios_stocks (portfolio_id, ticker, action, volume, purchase_price)
        VALUES (@portfolio_id, @ticker, 'SELL', @volume, @sell_price);
    `;
    await request.query(insertSellQuery);
      
    return true;
  }

  // Tilføj penge til en konto ved salg af aktier
  async addFundsToAccount(account_id, amount) {
    const query = `
        UPDATE userledger
        SET available_balance = available_balance + @amount
        WHERE account_id = @account_id
    `;
    const request = this.poolConnection.request();
    request.input('account_id', sql.UniqueIdentifier, account_id);
    request.input('amount', sql.Decimal(12, 2), amount);

    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
  }

  // Opretter tablet stock_price_history til at gemme aktiekurser fra forskellige tidspunkter
  async createStockPriceHistory(){
    const query = `
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'stock_price_history'
      )
        BEGIN
      CREATE TABLE stock_price_history (
      ticker VARCHAR(20) PRIMARY KEY REFERENCES stocks(ticker),
      price_tday DECIMAL(18,4) NOT NULL,
      price_ysday DECIMAL(18,4) NOT NULL,
      price_7d DECIMAL(18,4) NOT NULL,
      price_1m DECIMAL(18,4) NOT NULL,
      price_2m DECIMAL(18,4) NOT NULL,
      price_3m DECIMAL(18,4) NOT NULL,
      price_4m DECIMAL(18,4) NOT NULL,
      price_5m DECIMAL(18,4) NOT NULL,
      price_6m DECIMAL(18,4) NOT NULL,
      price_7m DECIMAL(18,4) NOT NULL,
      price_8m DECIMAL(18,4) NOT NULL,
      price_9m DECIMAL(18,4) NOT NULL,
      price_10m DECIMAL(18,4) NOT NULL,
      price_11m DECIMAL(18,4) NOT NULL,
      price_12m DECIMAL(18,4) NOT NULL,
      currency CHAR(3) NOT NULL,
      last_updated DATETIME
      )
    END  
  `
  this.executeQuery(query)
  .then(() => {
    console.log("stock_price_history table created"); 
  });
  }


  // Henter historiske aktiekurser for en portefølje
  async getPortfolioHistory(portfolioId) {
      const periods = [];
      for (let i = 1; i <= 12; i++) {
        periods.push({
          label: `${i} months ago`,
          column:`price_${i}m`,
          order: i
      });
    }
    const selectBlocks = [];
    for (let i = 0; i < periods.length; i++) {
      const { label, column, order } = periods[i];
      selectBlocks.push(`
        SELECT
          '${label}' AS history,
          SUM(stock_price_history.${column} * portfolios_stocks.volume) AS value,
          ${order} as [order]
        FROM portfolios_stocks
        JOIN stock_price_history
          ON portfolios_stocks.ticker = stock_price_history.ticker
        WHERE portfolios_stocks.portfolio_id = @portfolioId
      `);
    }

    const sqlQuery = selectBlocks.join('\nUNION ALL\n') + `\nORDER BY [order]`;

    const request = this.poolConnection.request();
    request.input('portfolioId', sql.UniqueIdentifier, portfolioId);
    const result = await request.query(sqlQuery);

    return result.recordset.map(({ history, value }) => ({ history, value }));
  }

  // Henter historisk aktiedata for en portefølje
  async findPortfolioHistory(portfolioId) {
    const query = `
      SELECT 
          ps.action AS action,
          ps.ticker AS stock,
          ps.purchase_price AS price,
          ps.volume AS quantity,
          ps.created_at AS date
      FROM portfolios_stocks ps
      JOIN stocks s ON ps.ticker = s.ticker
      WHERE ps.portfolio_id = @portfolioId
      ORDER BY ps.created_at DESC
    `;
    
    const request = this.poolConnection.request();
    request.input('portfolioId', sql.UniqueIdentifier, portfolioId);
    const result = await request.query(query);
    return result.recordset;
  }

  // Beregner den gennemsnitlige købspris for en aktie i en portefølje
  async calculateAverageAcquisitionPrice(portfolioId, ticker) {
    const query = `
    SELECT 
          ps.ticker AS stock,
          s.company_name AS company,
          SUM(CASE WHEN ps.action = 'BUY' AND ps.volume > 0 THEN ps.purchase_price * ps.volume ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN ps.action = 'BUY' AND ps.volume > 0 THEN ps.volume ELSE 0 END), 0) AS average_price, 
          SUM(CASE WHEN ps.action = 'BUY' AND ps.volume > 0 THEN ps.volume ELSE 0 END) AS total_volume 
      FROM portfolios_stocks ps
      JOIN stocks s ON ps.ticker = s.ticker
      WHERE ps.portfolio_id = @portfolioId AND ps.ticker = @ticker
      GROUP BY ps.ticker, s.company_name
      ORDER BY s.company_name
    `;


    const request = this.poolConnection.request();
    request.input('portfolioId', sql.UniqueIdentifier, portfolioId);
    request.input('ticker', sql.VarChar, ticker);
    const result = await request.query(query);

    return result.recordset[0];
  } 

  // Beregner den samlede realiserede gevinst for en bruger
  async calculateTotalRealizedGain(userId) {
    const query = `
      SELECT 
        SUM(
          ps_sells.volume * (
            ps_sells.purchase_price - ISNULL(buy_avg.avg_price, 0)
          )
        ) AS total_realized_gain
      FROM portfolios p
      JOIN portfolios_stocks ps_sells ON ps_sells.portfolio_id = p.portfolio_id
      LEFT JOIN (
        SELECT 
          portfolio_id, 
          ticker, 
          SUM(purchase_price * volume) / NULLIF(SUM(volume), 0) AS avg_price
        FROM portfolios_stocks
        WHERE action = 'BUY'
        GROUP BY portfolio_id, ticker
      ) buy_avg ON buy_avg.portfolio_id = ps_sells.portfolio_id 
                AND buy_avg.ticker = ps_sells.ticker
      WHERE p.user_id = @userId AND ps_sells.action = 'SELL'
    `;

    const request = this.poolConnection.request();
    request.input('userId', sql.UniqueIdentifier, userId);
    const result = await request.query(query);

    const gain = result.recordset[0]?.total_realized_gain;
    return gain !== null && gain !== undefined ? gain : 0;
  }

  // Henter de 5 aktier med størst urealiseret gevinst for en bruger
  async findTopUnrealizedGains(user_id) {
    const query = `
      SELECT 
        portfolios_stocks.ticker,
        stocks.company_name,
        portfolios.name AS portfolio_name,
        portfolios_stocks.volume,
        portfolios_stocks.purchase_price,
        stock_price_history.price_tday AS last_price,
        (stock_price_history.price_tday - portfolios_stocks.purchase_price) * portfolios_stocks.volume AS unrealized_gain,
        (stock_price_history.price_tday * portfolios_stocks.volume) AS current_value
      FROM portfolios_stocks
      JOIN portfolios ON portfolios_stocks.portfolio_id = portfolios.portfolio_id
      JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
      JOIN stocks ON portfolios_stocks.ticker = stocks.ticker
      WHERE portfolios.user_id = @user_id
      AND portfolios_stocks.action = 'BUY'
      ORDER BY unrealized_gain DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;
    `;
    const request = this.poolConnection.request();
    request.input('user_id', sql.UniqueIdentifier, user_id);

    const result = await request.query(query);
    return result.recordset;
  }

  // Henter de 5 aktier med størst værdi for en bruger
  async findTopValuedStocks(user_id) {
    const query = `
      SELECT 
        portfolios_stocks.ticker,
        stocks.company_name,
        portfolios.name AS portfolio_name,
        portfolios_stocks.volume,
        stock_price_history.price_tday AS last_price,
        (stock_price_history.price_tday * portfolios_stocks.volume) AS current_value
      FROM portfolios_stocks
      JOIN portfolios ON portfolios_stocks.portfolio_id = portfolios.portfolio_id
      JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
      JOIN stocks ON portfolios_stocks.ticker = stocks.ticker
      WHERE portfolios.user_id = @user_id
      AND portfolios_stocks.action = 'BUY'
      ORDER BY last_price DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;
    `;
    const request = this.poolConnection.request();
    request.input('user_id', sql.UniqueIdentifier, user_id);

    const result = await request.query(query);
    return result.recordset;
  }

  // Beregner den samlede urealiserede gevinst for en bruger
  async calculateTotalUnrealizedGain(userId) {
    const query = `
      SELECT 
        SUM(
          ps.volume * (stock_price_history.price_tday - ps.purchase_price)
        ) AS total_unrealized_gain
      FROM portfolios p
      JOIN portfolios_stocks ps ON ps.portfolio_id = p.portfolio_id
      JOIN stock_price_history ON ps.ticker = stock_price_history.ticker
      WHERE p.user_id = @userId AND ps.action = 'BUY'
    `;

    const request = this.poolConnection.request();
    request.input('userId', sql.UniqueIdentifier, userId);
    const result = await request.query(query);

    const gain = result.recordset[0]?.total_unrealized_gain;
    return gain !== null && gain !== undefined ? gain : 0;
  }

  // Henter alle forskellige aktier i databasen
  async getAllCompanies() {
    const result = await this.pool.request()
      .query('SELECT DISTINCT ticker FROM stock_price_history'); 
    return result.recordset.map(row => row.ticker);
  }

  // Henter statistikker for en portefølje
  async findStatsForPortfolio(user_id) {
    const portfolios = await this.findPortfoliosByUser(user_id);
    const resultList = [];

    for (const portfolio of portfolios) {
      const query = `
        SELECT 
          SUM(portfolios_stocks.volume * portfolios_stocks.purchase_price) AS total_purchase_value,
          SUM(portfolios_stocks.volume * stock_price_history.price_tday) AS total_current_value,

          ROUND(
            ((SUM(portfolios_stocks.volume * stock_price_history.price_tday) - 
              SUM(portfolios_stocks.volume * stock_price_history.price_ysday)) / 
              NULLIF(SUM(portfolios_stocks.volume * stock_price_history.price_ysday), 0)) * 100, 
            2
          ) AS change_24h

        FROM portfolios_stocks
        JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
        WHERE portfolios_stocks.portfolio_id = @portfolio_id
          AND portfolios_stocks.action = 'BUY';
      `;

      const request = this.poolConnection.request();
      request.input('portfolio_id', sql.UniqueIdentifier, portfolio.portfolio_id);
      const result = await request.query(query);

      resultList.push({
        portfolio_id: portfolio.portfolio_id,
        name: portfolio.name,
        account_id: portfolio.account_id,
        created_at: portfolio.created_at,
        ...result.recordset[0]
      });
    }

    return resultList;
  }

  // Henter aktie i en portefølje
  async findStockInPortfolio(portfolio_id, ticker) {
    const query = `
    SELECT stock.*, portfoliostock.volume, portfoliostock.purchase_price
    FROM stocks stock
    JOIN portfolios_stocks portfoliostock ON portfoliostock.ticker = stock.ticker
    WHERE portfoliostock.portfolio_id = @portfolio_id AND stock.ticker = @ticker AND portfoliostock.action = 'BUY'
    `;

  const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    request.input('ticker', sql.VarChar, ticker);

    const result = await request.query(query);
    return result.recordset[0];
  }

  // Henter aktiekurser for en aktie
  async getStockPriceHistoryByTicker(ticker) {
    const query = `
      SELECT price_tday, price_1m, price_2m, price_3m,
            price_4m, price_5m, price_6m, price_7m, price_8m, price_9m,
            price_10m, price_11m, price_12m
      FROM stock_price_history
      WHERE ticker = @ticker
    `;

    const request = this.poolConnection.request();
    request.input('ticker', sql.VarChar, ticker);

    const result = await request.query(query);
    return result.recordset[0];
  }

  // Henter data til pie chart for en portefølje
  async findPieDataForPortfolio(user_id){
    const query = `
      SELECT 
        p.portfolio_id,
        p.name AS portfolio_name,
        SUM(ps.volume * sph.price_tday) AS total_current_value
      FROM portfolios_stocks ps
      JOIN portfolios p ON ps.portfolio_id = p.portfolio_id
      JOIN stock_price_history sph ON ps.ticker = sph.ticker
      WHERE p.user_id = @user_id AND ps.action = 'BUY'
      GROUP BY p.portfolio_id, p.name;
    `;
    const request = this.poolConnection.request();
    request.input('user_id', sql.UniqueIdentifier, user_id);
    const result = await request.query(query);
    return result.recordset
  }

  // Finder kontoen for en portefølje
  async findLedgerByPorfolioId(portfolio_id) {
    const query = `
      SELECT 
        ul.*
      FROM userledger ul
      JOIN portfolios p ON ul.account_id = p.account_id
      WHERE p.portfolio_id = @portfolio_id
    `;
    const request = this.poolConnection.request();
    request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
    const result = await request.query(query);
    return result.recordset[0];
  }

}

// Opretter tables i databasen
const createDatabaseConnection = async (passwordConfig) => {
  database = new Database(passwordConfig);
  await database.connect();
  await database.createTable();
  await database.createLedger();
  await database.createTransactions();
  await database.createPortfolios();
  await database.createPortfolios_stocks();
  await database.stocks();
  await database.createStockPriceHistory();
  await database.createTradeHistory()

  return database;
};


module.exports = {
    Database,
    createDatabaseConnection,
  };
 