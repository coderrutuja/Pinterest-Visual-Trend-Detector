 const { Pool } = require('pg');

// Temporary in-memory stub instead of a real PostgreSQL connection
// so the app can run without requiring local Postgres to be configured.
const useStub = !process.env.DATABASE_URL;

let pool;

if (useStub) {
  pool = {
    // Minimal pool.query implementation used in trendAnalysisService
    async query(_text, _params) {
      // No-op: pretend the query succeeded
      return { rows: [] };
    }
  };
} else {
  const connectionString = process.env.DATABASE_URL;
  const sslEnabled = String(process.env.PGSSL || 'false').toLowerCase() === 'true';

  pool = new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });
}

async function initDb() {
  if (useStub) {
    console.warn('initDb: DATABASE_URL is not set, using in-memory stub pool.');
    return;
  }
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connection established.');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL', error);
    throw error;
  }
}

module.exports = { pool, initDb };
