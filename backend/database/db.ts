import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "oms",
});


// const pool = mysql.createPool({
//   connectionLimit: 10,
//   host: process.env.DB_HOST || "147.79.64.150",
//   user: process.env.DB_USER || "u334339390_uSRomsSyStEM",
//   password: process.env.DB_PASSWORD || "PSsuSRomsSyStEM!3",
//   database: process.env.DB_NAME || "u334339390_oFFicEmnGTSyS",
// });

export default pool; 