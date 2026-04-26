import Db from 'mysql2-async';

// Create Pool
const db = new Db({
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPWD,
    database: process.env.DBNAME,
    connectionLimit: 50,
    skiptzfix: true
});

export { db };