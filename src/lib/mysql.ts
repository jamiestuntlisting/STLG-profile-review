import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

function getPool(): mysql.Pool {
  if (global.mysqlPool) return global.mysqlPool;

  global.mysqlPool = mysql.createPool({
    host: process.env.STUNTLISTING_DB_HOST,
    user: process.env.STUNTLISTING_DB_USER,
    password: process.env.STUNTLISTING_DB_PASSWORD,
    database: process.env.STUNTLISTING_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  return global.mysqlPool;
}

export default getPool;
