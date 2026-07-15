import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MySQL error codes that are safe to ignore when re-running migrations.
const BENIGN_ERRORS = new Set([
  'ER_TABLE_EXISTS_ERROR', // 1050 table already exists
  'ER_DUP_KEYNAME', // 1061 index already exists
  'ER_FK_DUP_NAME', // 1826 duplicate foreign key constraint name
  'ER_DUP_FIELDNAME', // 1060 duplicate column
]);

/**
 * Naive SQL splitter: splits on semicolons that terminate statements.
 * The schema intentionally avoids stored routines / triggers so this is safe.
 */
function stripComments(chunk) {
  return chunk
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map(stripComments)
    .filter((s) => s.length > 0);
}

async function run() {
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  const statements = splitStatements(sql);

  // Connect without selecting a database first so we can create it.
  const admin = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: false,
  });

  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await admin.end();

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: false,
  });

  let applied = 0;
  for (const statement of statements) {
    try {
      await conn.query(statement);
      applied += 1;
    } catch (err) {
      if (BENIGN_ERRORS.has(err.code)) {
         
        console.log(`  skip (${err.code}): ${statement.slice(0, 60).replace(/\s+/g, ' ')}...`);
        continue;
      }
       
      console.error(`Failed statement:\n${statement}\n`);
      await conn.end();
      throw err;
    }
  }

  await conn.end();
   
  console.log(`Migration complete. Executed ${applied}/${statements.length} statements.`);
}

run().catch((err) => {
   
  console.error('Migration failed:', err.message);
  process.exit(1);
});
