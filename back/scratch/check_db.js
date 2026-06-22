const pool = require('../config/db');

async function run() {
  try {
    // 1. Get column data types
    const infoQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vpriorizados' 
        AND column_name IN ('fallecido', 'excepcional', 'patria');
    `;
    const infoRes = await pool.query(infoQuery);
    console.log('--- Column types in vpriorizados ---');
    console.log(infoRes.rows);

    // 2. Get distinct values of patria
    const patriaRes = await pool.query(`SELECT DISTINCT patria FROM vpriorizados LIMIT 10;`);
    console.log('--- Distinct values of patria ---');
    console.log(patriaRes.rows);

    // 3. Get distinct values of fallecido and excepcional
    const valuesRes = await pool.query(`
      SELECT 
        (SELECT json_agg(DISTINCT fallecido) FROM vpriorizados) AS fallecido_vals,
        (SELECT json_agg(DISTINCT excepcional) FROM vpriorizados) AS excepcional_vals;
    `);
    console.log('--- Distinct values in vpriorizados ---');
    console.log(valuesRes.rows[0]);

  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await pool.end();
  }
}

run();
