// src/utils/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const nombreBaseDatos = process.env.NODE_ENV === 'test'
  ? process.env.DB_NAME_TEST
  : process.env.DB_NAME;

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  database: nombreBaseDatos ?? 'grandstay_db',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  decimalNumbers: true,
});

export async function query(sql, params = {}) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    throw error;
  }
}

export async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    throw error;
  }
}
