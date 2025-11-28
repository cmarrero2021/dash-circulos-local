// controllers/emailController.js
const pool = require('../config/db');
const {
    hasNationalDashboardAccess,
    getAllowedStatesForUser,
} = require('../services/geoPermissionsService');

/**
 * Obtener email de un registro por VAT y nacionalidad
 * GET /api/email/:vat/:nationality
 */
const getEmailByVat = async (req, res) => {
    try {
        const { vat, nationality } = req.params;
        const userId = req.user.id;

        console.log('[emailController] Buscando registro:', { vat, nationality, userId });

        // Validar VAT (solo números)
        if (!vat || !/^\d+$/.test(vat)) {
            return res.status(400).json({ error: 'VAT inválido. Debe contener solo números.' });
        }

        // Validar nacionalidad
        if (!nationality || !['venezuelan', 'foreign'].includes(nationality)) {
            return res.status(400).json({ error: 'Nacionalidad inválida.' });
        }

        // Buscar registro con VAT + nacionalidad
        const query = 'SELECT vat, email, state_id, user_nationality FROM rm_registros WHERE vat = $1 AND user_nationality = $2';
        console.log('[emailController] Ejecutando query:', query, 'con params:', [vat, nationality]);

        const result = await pool.query(query, [vat, nationality]);

        console.log('[emailController] Resultados encontrados:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('[emailController] No se encontró registro');
            return res.status(404).json({ error: 'Registro no encontrado con la cédula y nacionalidad proporcionadas.' });
        }

        const registro = result.rows[0];

        // Validar permisos geográficos
        const hasNationalAccess = await hasNationalDashboardAccess(userId);

        if (!hasNationalAccess) {
            const allowedStates = await getAllowedStatesForUser(userId);
            if (!allowedStates.includes(registro.state_id)) {
                return res.status(403).json({
                    error: 'No tiene permisos para editar este registro. El adulto mayor pertenece a un estado no autorizado.'
                });
            }
        }

        // Retornar datos del registro
        res.json({
            vat: registro.vat,
            nationality: registro.user_nationality,
            email: registro.email,
            state_id: registro.state_id
        });

    } catch (error) {
        console.error('[emailController] Error en getEmailByVat:', error);
        res.status(500).json({ error: 'Error al buscar el registro.' });
    }
};

/**
 * Actualizar email de un registro por VAT y nacionalidad
 * PUT /api/email/:vat/:nationality
 * Body: { newEmail }
 */
const updateEmailByVat = async (req, res) => {
    const client = await pool.connect();

    try {
        const { vat, nationality } = req.params;
        const { newEmail } = req.body;
        const userId = req.user.id;

        console.log('[emailController] Iniciando actualización de email:', { vat, nationality, newEmail });

        // Validar VAT
        if (!vat || !/^\d+$/.test(vat)) {
            return res.status(400).json({ error: 'VAT inválido. Debe contener solo números.' });
        }

        // Validar nacionalidad
        if (!nationality || !['venezuelan', 'foreign'].includes(nationality)) {
            return res.status(400).json({ error: 'Nacionalidad inválida.' });
        }

        // Validar nuevo email
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ error: 'Formato de email inválido.' });
        }

        // Buscar registro
        const result = await client.query(
            'SELECT vat, email, state_id, user_nationality FROM rm_registros WHERE vat = $1 AND user_nationality = $2',
            [vat, nationality]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado con la cédula y nacionalidad proporcionadas.' });
        }

        const registro = result.rows[0];

        // Validar permisos geográficos
        const hasNationalAccess = await hasNationalDashboardAccess(userId);

        if (!hasNationalAccess) {
            const allowedStates = await getAllowedStatesForUser(userId);
            if (!allowedStates.includes(registro.state_id)) {
                return res.status(403).json({
                    error: 'No tiene permisos para editar este registro. El adulto mayor pertenece a un estado no autorizado.'
                });
            }
        }

        // Iniciar transacción
        await client.query('BEGIN');

        console.log('[emailController] Transacción iniciada');

        // Actualizar email en rm_registros
        const updateRegistros = await client.query(
            'UPDATE rm_registros SET email = $1 WHERE vat = $2 AND user_nationality = $3',
            [newEmail, vat, nationality]
        );

        console.log('[emailController] rm_registros actualizado. Filas afectadas:', updateRegistros.rowCount);

        // Actualizar email en rm_credenciales
        const updateCredenciales = await client.query(
            'UPDATE rm_credenciales SET email = $1 WHERE vat = $2',
            [newEmail, vat]
        );

        console.log('[emailController] rm_credenciales actualizado. Filas afectadas:', updateCredenciales.rowCount);

        // Confirmar transacción
        await client.query('COMMIT');

        console.log('[emailController] Transacción completada exitosamente');

        res.json({
            success: true,
            message: 'Email actualizado correctamente en ambas tablas.',
            vat,
            nationality,
            newEmail,
            tablesUpdated: {
                rm_registros: updateRegistros.rowCount,
                rm_credenciales: updateCredenciales.rowCount
            }
        });

    } catch (error) {
        // Rollback en caso de error
        await client.query('ROLLBACK');
        console.error('[emailController] Error en updateEmailByVat. Transacción revertida:', error);
        res.status(500).json({ error: 'Error al actualizar el email. Los cambios han sido revertidos.' });
    } finally {
        // Liberar el cliente
        client.release();
    }
};

module.exports = {
    getEmailByVat,
    updateEmailByVat
};
