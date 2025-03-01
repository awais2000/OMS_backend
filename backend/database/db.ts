import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { SocketAddress } from "net";

dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "oms",
});

export default pool; 

    