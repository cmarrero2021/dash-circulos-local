const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: '192.168.0.32',
    database: 'dashboard_registros',
    password: 'postgres',
    port: 5432,
});

async function queryVentidades() {
    try {
        // First, let's see all unique municipios for Distrito Capital
        const municipios = await pool.query(`
      SELECT DISTINCT municipio_id, municipio
      FROM ventidades 
      WHERE estado = 'DISTRITO CAPITAL'
      ORDER BY municipio;
    `);

        console.log('DISTRITO CAPITAL - Municipios:');
        console.log('='.repeat(60));
        municipios.rows.forEach(row => {
            console.log(`ID: ${row.municipio_id} | ${row.municipio}`);
        });

        // Now let's see parroquias for municipio Libertador (ID 104)
        const parroquias = await pool.query(`
      SELECT DISTINCT parroquia_id, parroquia
      FROM ventidades 
      WHERE municipio_id = 104
      ORDER BY parroquia;
    `);

        console.log('\n\nMUNICIPIO LIBERTADOR (ID: 104) - Parroquias:');
        console.log('='.repeat(60));
        parroquias.rows.forEach(row => {
            console.log(`ID: ${row.parroquia_id} | ${row.parroquia}`);
        });
        console.log(`\nTotal parroquias: ${parroquias.rows.length}`);

        // Now let's check what rm_comunas returns for the same query
        console.log('\n\nComparing with rm_comunas table:');
        console.log('='.repeat(60));
        const rmComunas = await pool.query(`
      SELECT DISTINCT parroquia_id, parroquia
      FROM rm_comunas 
      WHERE municipio_id = 104
      ORDER BY parroquia;
    `);

        console.log('rm_comunas - Parroquias for municipio_id 104:');
        rmComunas.rows.forEach(row => {
            console.log(`ID: ${row.parroquia_id} | ${row.parroquia}`);
        });
        console.log(`\nTotal parroquias from rm_comunas: ${rmComunas.rows.length}`);

        // Check if there are parroquias in rm_comunas that don't belong to municipio 104
        const wrongParroquias = await pool.query(`
      SELECT DISTINCT rc.parroquia_id, rc.parroquia, v.municipio_id, v.municipio
      FROM rm_comunas rc
      LEFT JOIN ventidades v ON rc.parroquia_id = v.parroquia_id
      WHERE rc.municipio_id = 104 
        AND v.municipio_id != 104
      LIMIT 10;
    `);

        if (wrongParroquias.rows.length > 0) {
            console.log('\n\n⚠️ PROBLEMA: Parroquias en rm_comunas con municipio_id=104 que pertenecen a otros municipios:');
            console.log('='.repeat(80));
            wrongParroquias.rows.forEach(row => {
                console.log(`Parroquia ID: ${row.parroquia_id} | ${row.parroquia} | Real Municipio: ${row.municipio} (ID: ${row.municipio_id})`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

queryVentidades();
