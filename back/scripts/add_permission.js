const pool = require('../config/db');

async function main() {
    try {
        const result = await pool.query(
            `INSERT INTO permisos (nombre, descripcion)
             VALUES ($1, $2)
             ON CONFLICT (nombre) DO NOTHING
             RETURNING *`,
            [
                'editar_email_sin_registro',
                'Permite actualizar el correo en rm_credenciales aunque el par vat+user_nationality no exista en rm_registros'
            ]
        );

        if (result.rows.length > 0) {
            console.log('Permiso creado exitosamente:', result.rows[0]);
        } else {
            console.log('El permiso "editar_email_sin_registro" ya existía en la base de datos.');
        }
    } catch (error) {
        console.error('Error al crear el permiso:', error.message);
    } finally {
        await pool.end();
    }
}

main();
