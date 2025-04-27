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
        [balance] DECIMAL(12,2) NOT NULL,
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
  const result = await this.poolConnection
  .request()
  .input('account_id', sql.UniqueIdentifier, account_id)
  .query('DELETE FROM [dbo].[userledger] WHERE account_id = @account_id')

  return result.rowsAffected[0]
}

async deactivateLedger(account_id){
  const result = await this.poolConnection
  .request()
  .input('account_id', sql.UniqueIdentifier, account_id)
  .query(`
    UPDATE userledger
    SET ledger_active = 0
    WHERE account_id = @account_id
    `)
    return result.rowsAffected[0]
}

async activateLedger(account_id){
  const result = await this.poolConnection
  .request()
  .input('account_id', sql.UniqueIdentifier, account_id)
  .query(`
    UPDATE userledger
    SET ledger_active = 1
    WHERE account_id = @account_id
    `)
    return result.rowsAffected[0]
}


async changeBalance(account_id, amount, action) {
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

async findPortfoliosByUser(user_id) {
  try {
    const query = `
      SELECT *
      FROM portfolios
      WHERE user_id = @user_id
      ORDER BY created_at DESC
    `;
    const request = await this.poolConnection.request();
    request.input('user_id', sql.UniqueIdentifier, user_id);
    const result = await request.query(query);
    console.log('Database query result:', result); // Log resultatet fra databasen
    return result.recordset; // Sørg for at returnere korrekt
  } catch (err) {
    console.error('Error in findPortfoliosByUser:', err); // Log fejl
    throw err; // Kast fejlen videre
  }
}

async insertPortfolio(user_id, name) {
  const query = `
      INSERT INTO portfolios (user_id, name, created_at)
      VALUES (@user_id, @name, GETDATE())
  `;
  const request = this.poolConnection.request();
  request.input('user_id', sql.UniqueIdentifier, user_id);
  request.input('name', sql.VarChar, name);
  
  await request.query(query);
}

async deletePortfolio(portfolioID) {
  const query = `
      DELETE FROM portfolios
      WHERE portfolio_id = @portfolioID
  `;
  const request = this.poolConnection.request();
  request.input('portfolioID', sql.UniqueIdentifier, portfolioID);
  
  const result = await request.query(query);
  return result.rowsAffected[0] > 0; // true hvis noget blev slettet
}


}


const createDatabaseConnection = async (passwordConfig) => {
  database = new Database(passwordConfig);
  await database.connect();
  await database.createTable();
  await database.createLedger();
  return database;
};

module.exports = {
    Database,
    createDatabaseConnection,
  };

  
const { passwordConfig } = require('./config');
const { request } = require('express');
 