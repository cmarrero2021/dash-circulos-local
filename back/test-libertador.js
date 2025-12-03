const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: '192.168.0.32',
    database: 'dashboard_registros',
    password: 'postgres',
    port: 5432,
});

async function testQuery() {
    try {
        // Check how many municipios are named LIBERTADOR
        const libertadores = await pool.query(`
      SELECT DISTINCT estado_id, estado, municipio_id, municipio
      FROM ventidades
      WHERE UPPER(municipio) = 'LIBERTADOR'
      ORDER BY estado, municipio_id;
    `);

        console.log('Municipios llamados LIBERTADOR:');
        console.log('='.repeat(80));
        libertadores.rows.forEach(row => {
            console.log(`Estado: ${row.estado.padEnd(25)} | Estado ID: ${row.estado_id} | Municipio ID: ${row.municipio_id}`);
        });
        console.log(`\nTotal: ${libertadores.rows.length} municipios llamados LIBERTADOR\n`);

        // Now test the query with GROUP BY that we're using in the backend
        console.log('Testing backend query for municipio_id = 104 (Libertador del Distrito Capital):');
        console.log('='.repeat(80));
        const result = await pool.query(`
      SELECT parroquia_id, parroquia
      FROM rm_comunas
      WHERE municipio_id = 104
      GROUP BY parroquia_id, parroquia
      ORDER BY parroquia;
    `);

        console.log(`Total parroquias: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`  ${row.parroquia_id}: ${row.parroquia}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

testQuery();
