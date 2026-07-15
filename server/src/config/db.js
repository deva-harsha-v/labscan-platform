import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      queueLimit: 0,
      namedPlaceholders: true,
      // MySQL returns JSON columns as strings depending on driver/version;
      // mysql2 parses JSON automatically, but be explicit about dates.
      dateStrings: false,
      timezone: 'Z',
    });
  }
  return pool;
}

/**
 * Run a query and return rows.
 */
export async function query(sql, params = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/**
 * Run a set of statements inside a transaction.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
