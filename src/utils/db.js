// src/utils/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getDbConfig } from '../config/env.js';

dotenv.config();

const dbConfig = getDbConfig();

export const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  ssl: dbConfig.ssl,
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
