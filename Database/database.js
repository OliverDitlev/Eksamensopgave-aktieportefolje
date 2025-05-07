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

async deleteLedger(account_id){
  const request = this.poolConnection
  .request()
  .input('account_id', sql.UniqueIdentifier, account_id)
  await request.query('DELETE FROM [dbo].[ledgertransactions] WHERE account_id = @account_id')
  await request.query('DELETE FROM [dbo].[portfolios_stocks] WHERE portfolio_id IN(SELECT portfolio_id from dbo.portfolios where account_id = @account_id)')
  await request.query('DELETE FROM [dbo].[portfolios] WHERE account_id = @account_id')
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

async findAllStocks(user_id) {
  const query = `


`};


async saveStockData(ticker, companyName, currency, daily, monthly) {
  const pool = this.poolConnection;
//tjekker om aktien findes. hvis ikke indsæt i stocks 
  await pool.request()
    .input('ticker',   sql.VarChar, ticker)
    .input('name',    sql.VarChar, companyName)
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
    request.input('ticker',   sql.VarChar, ticker)
    request.input('currency',    sql.Char(3), currency)
    request.input('last_updated', sql.DateTime, new Date())

    request.input('daily0', sql.Decimal(18, 4), daily[0])
    request.input('daily1', sql.Decimal(18, 4), daily[1])
    request.input('daily6', sql.Decimal(18, 4), daily[6]);

    for(let i = 0; i < 12; i++){
      request.input(`month${i+1}`, sql.Decimal(18, 4), monthly[i])
    }

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
        currency = @currency,
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

      ROUND(((stock_price_history.price_tday - stock_price_history.price_ysday) / stock_price_history.price_ysday) * 100, 2) AS change_24h,
      ROUND(((stock_price_history.price_tday - stock_price_history.price_7d) / stock_price_history.price_7d) * 100, 2) AS change_7d

    FROM portfolios_stocks
    JOIN stock_price_history ON portfolios_stocks.ticker = stock_price_history.ticker
    JOIN stocks ON portfolios_stocks.ticker = stocks.ticker
    WHERE portfolios_stocks.portfolio_id = @portfolio_id
    AND portfolios_stocks.action = 'BUY'; -- Kun aktier med action = 'BUY'
  `
  const request = this.poolConnection.request();
  request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);

  const result = await request.query(query);
  if (!result.recordset) return [];
  return result.recordset;
}

async findStockInPortfolio(portfolio_id, ticker) {
  const query = `
      SELECT *
      FROM portfolios_stocks
      WHERE portfolio_id = @portfolio_id AND ticker = @ticker AND action = 'BUY';
  `;
  const request = this.poolConnection.request();
  request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
  request.input('ticker', sql.VarChar(20), ticker);

  const result = await request.query(query);
  return result.recordset[0]; // Returnér den første post, hvis den findes
}

// Hent en aktie fra en portefølje
async removeStockFromPortfolio(portfolio_id, ticker, volume, sell_price) {
  const request = this.poolConnection.request();
  request.input('portfolio_id', sql.UniqueIdentifier, portfolio_id);
  request.input('ticker', sql.VarChar(20), ticker);
  request.input('volume', sql.Decimal(12, 2), volume);
  request.input('sell_price', sql.Decimal(12, 2), sell_price);

  // Reducer volumen af aktien med action = BUY
  const updateBuyQuery = `
      UPDATE portfolios_stocks
      SET volume = volume - @volume
      WHERE portfolio_id = @portfolio_id AND ticker = @ticker AND action = 'BUY' AND volume >= @volume;
  `;
  await request.query(updateBuyQuery);

  // Tjek om der allerede findes en post med action = SELL for denne aktie
  const checkSellQuery = `
      SELECT stock_id, volume
      FROM portfolios_stocks
      WHERE portfolio_id = @portfolio_id AND ticker = @ticker AND action = 'SELL';
  `;
  const sellResult = await request.query(checkSellQuery);

  if (sellResult.recordset.length > 0) {
      // Hvis der allerede findes en post med action = SELL, opdater volumen
      const updateSellQuery = `
          UPDATE portfolios_stocks
          SET volume = volume + @volume
          WHERE stock_id = @stock_id;
      `;
      const sellStockId = sellResult.recordset[0].stock_id;
      const sellRequest = this.poolConnection.request();
      sellRequest.input('stock_id', sql.UniqueIdentifier, sellStockId);
      sellRequest.input('volume', sql.Decimal(12, 2), volume);
      await sellRequest.query(updateSellQuery);
  } else {
      // Hvis der ikke findes en post med action = SELL, opret en ny
      const insertSellQuery = `
          INSERT INTO portfolios_stocks (portfolio_id, ticker, action, volume, purchase_price)
          VALUES (@portfolio_id, @ticker, 'SELL', @volume, @sell_price);
      `;
      await request.query(insertSellQuery);
    }

    return true;
}

// Tilføj penge til en konto
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
  return result.rowsAffected[0];
}

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
async calculateAverageAcquisitionPrice(portfolioId) {
  const query = `
    SELECT 
        ps.ticker AS stock,
        s.company_name AS company,
        SUM(ps.purchase_price * ps.volume) / SUM(ps.volume) AS average_price, -- Weighted average formula
        SUM(ps.volume) AS total_volume -- Total number of stocks purchased
    FROM portfolios_stocks ps
    JOIN stocks s ON ps.ticker = s.ticker
    WHERE ps.portfolio_id = @portfolioId
    GROUP BY ps.ticker, s.company_name
    ORDER BY s.company_name
  `;

  const request = this.poolConnection.request();
  request.input('portfolioId', sql.UniqueIdentifier, portfolioId);
  const result = await request.query(query);

  return result.recordset;
}

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
    SELECT portfolio_id, ticker, 
           SUM(purchase_price * volume) / SUM(volume) AS avg_price
    FROM portfolios_stocks
    WHERE action = 'buy'
    GROUP BY portfolio_id, ticker
  ) buy_avg ON buy_avg.portfolio_id = ps_sells.portfolio_id 
            AND buy_avg.ticker = ps_sells.ticker
  WHERE p.user_id = @userId AND ps_sells.action = 'sell'
`;

  const request = this.poolConnection.request();
  request.input('userId', sql.UniqueIdentifier, userId);
  const result = await request.query(query);

  const gain = result.recordset[0]?.total_realized_gain;
  return gain !== null && gain !== undefined ? gain : 0;
}



}


  
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

  return database;
};


module.exports = {
    Database,
    createDatabaseConnection,
  };
 