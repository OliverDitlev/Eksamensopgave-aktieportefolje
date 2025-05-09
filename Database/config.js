
// Filen er til for at gemme konfigurationer til databasen.
const dotenv = require('dotenv')

if(process.env.NODE_ENV === 'development') {
    dotenv.config({ path: `.env.${process.env.NODE_ENV}`, debug: true });
  }


const server = "servername87.database.windows.net";
const database = "invsteringsapp";
const port = 1433;
const user = "oliver";
const password = "12Elefanter";


const passwordConfig = {
    server,
    port,
    database,
    user,
    password,
    options: {
      encrypt: true
    }
  };
  
  module.exports = {
    passwordConfig
  };