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

  async executeQuery(query) {
    const request = this.poolConnection.request();
    const result = await request.query(query);
    return result.rowsAffected[0];
  }

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

async deactivateUser(user_id){
  const request = this.poolConnection.request()
  request.input('user_id', sql.UniqueIdentifier, user_id)
  const query = 'UPDATE userAdministration SET active = 0 WHERE user_id = @user_id'
  
  const result = await request.query(query);
  return result.rowsAffected[0]
  
}

async activateUser(user_id){
  const request = this.poolConnection.request()
  request.input('user_id', sql.UniqueIdentifier, user_id)
  const query = 'UPDATE userAdministration SET active = 1 WHERE user_id = @user_id'
  
  const result = await request.query(query);
  return result.rowsAffected[0]
  
}  

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

async insertLedger(user_id, name, bank, currency, balance){
  const query = `
  INSERT INTO userledger(user_id, name, bank, currency, balance)
  OUTPUT INSERTED.* 
  VALUES (@user_id, @name, @bank, @currency, @balance) 
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

async deleteLedger(account_id){
  const request = this.poolConnection
  .request()
  .input('account_id', sql.UniqueIdentifier, account_id)
  await request.query('DELETE FROM [dbo].[portfolios] WHERE account_id = @account_id')
  await request.query('DELETE FROM [dbo].[ledgertransactions] WHERE account_id = @account_id')
  const result = await request.query('DELETE FROM [dbo].[userledger] WHERE account_id = @account_id')

  return result.rowsAffected[0]
}

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
      [transaction_time] DATETIME DEFAULT GETDATE()
    )
    END
  `
  this.executeQuery(query)
  .then(() => {
    console.log("Transactions created ");
  })
  
  
}

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

async changeBalance(account_id, amount, action) {
  const balance = await this.getBalanceAccount(account_id) 

  if(action === 'Withdraw' && balance < amount){
    throw new Error('Insuffienct money')

  }

  let query;
  if(action === 'Deposit'){
    query = `
    UPDATE userledger
    SET balance = balance + @amount
    WHERE account_id = @account_id
    `
  }else{
      query = `
      UPDATE userledger
      SET balance = balance - @amount
      WHERE account_id = @account_id
      `      
    }
  
  const request =this.poolConnection.request()
  request.input('account_id', sql.UniqueIdentifier, account_id)
  request.input('amount', sql.Decimal(15, 0), amount)

  const result = await request.query(query);

  return result.rowsAffected[0]
}

async addTransaction(accountId, amount, action){
  const pool = await sql.connect();

    await pool.request()
    .input('accountId', sql.UniqueIdentifier, accountId)
    .input('amount', sql.Decimal(12,1), amount)
    .input('action', sql.VarChar(10), action)
    .query(`
      INSERT INTO ledgertransactions (account_id, amount, action)
      VALUES(@accountId, @amount, @action)
      `)
}

async findTransactionByUser(user_id) {
  const query = `
    SELECT 
      ledgertransaction.transaction_id,
      ledgertransaction.amount,
      ledgertransaction.action,
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

async createPortfolio() {
  const query = `
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'portfolios'
    )
    BEGIN
      CREATE TABLE [dbo].[portfolios] (
        [portfolio_id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [account_id] UNIQUEIDENTIFIER NOT NULL REFERENCES userledger(account_id),
        [name] VARCHAR(50) NOT NULL,
        [created_at] DATETIME DEFAULT GETDATE()
      )
    END
  `;

  this.executeQuery(query)
    .then(() => {
      console.log("Portfolio created");
    })
}

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

async getLedgerById(account_id) {
  const query = `SELECT * FROM userledger WHERE account_id = @account_id`;
  const request = this.poolConnection.request();
  request.input('account_id', sql.UniqueIdentifier, account_id);
  const result = await request.query(query);
  return result.recordset[0];
}

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
        volume INT NOT NULL,
        purchase_price DECIMAL(12, 2),
        created_at DATETIME DEFAULT GETDATE()
      );
    END
  `;
  this.executeQuery(query)
    .then(() => {
      console.log("createPortfolios_stocks table created");
    });
}

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
  `;
  this.executeQuery(query)
    .then(() => {
      console.log("Stock table created");
    });
}

async stocks_prices() {
  const query = `
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'stocks_prices'
    )
    BEGIN
      CREATE TABLE stocks_prices (
        id INT PRIMARY KEY IDENTITY,
        ticker VARCHAR(20) NOT NULL REFERENCES stocks(ticker),
        price DECIMAL(12, 2) NOT NULL,
        currency CHAR(3),
        timestamp DATETIME DEFAULT GETDATE()
      );
    END
  `;
  this.executeQuery(query)
    .then(() => {
      console.log("createPortfolios_stocks table created");
    });
}

async saveStockData(ticker, name, currency, latestOpen) {
  const pool = this.poolConnection;

  await pool.request()
    .input('ticker',   sql.VarChar, ticker)
    .input('name',     sql.VarChar, name)
    .input('currency', sql.Char(3), currency)
    .query(`
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
    `);
  await pool.request()
    .input('ticker',   sql.VarChar, ticker)
    .input('price',    sql.Decimal(12,2), latestOpen)
    .input('currency', sql.Char(3), currency)
    .query(`
  INSERT INTO stock_prices (ticker, price, currency)
  VALUES (@ticker, @price, @currency);
`);
}
  }





  
const createDatabaseConnection = async (passwordConfig) => {
  database = new Database(passwordConfig);
  await database.connect();
  await database.createTable();
  await database.createLedger();
  await database.createTransactions();
  await database.createPortfolios();
  await database.createPortfolios_stocks()
  await database.stocks()
  await database.stocks_prices()
  return database;
};


module.exports = {
    Database,
    createDatabaseConnection,
  };
 