// controllers/emailController.js
const pool = require('../config/db');
const {
    hasNationalDashboardAccess,
    getAllowedStatesForUser,
    hasEmailWithoutRegistroPermission,
} = require('../services/geoPermissionsService');

/** URL pública donde el usuario puede crear sus credenciales */
const REGISTRO_URL = 'https://registroadultomayor.minaamp.gob.ve/';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/email/:vat/:nationality
// Obtiene el email de un registro por VAT y nacionalidad.
// ─────────────────────────────────────────────────────────────────────────────
const getEmailByVat = async (req, res) => {
    try {
        const { vat, nationality } = req.params;
        const userId = req.user.id;

        // Validar VAT (solo números)
        if (!vat || !/^\d+$/.test(vat)) {
            return res.status(400).json({ error: 'VAT inválido. Debe contener solo números.' });
        }

        // Validar nacionalidad
        if (!nationality || !['venezuelan', 'foreign'].includes(nationality)) {
            return res.status(400).json({ error: 'Nacionalidad inválida.' });
        }

        // Buscar en ambas tablas en paralelo
        const [registroResult, credencialResult] = await Promise.all([
            pool.query(
                'SELECT vat, email, state_id, user_nationality FROM rm_registros WHERE vat = $1 AND user_nationality = $2',
                [vat, nationality]
            ),
            pool.query(
                'SELECT vat, email, user_nationality FROM rm_credenciales WHERE vat = $1 AND user_nationality = $2',
                [vat, nationality]
            )
        ]);

        const enRegistros    = registroResult.rows.length > 0;
        const enCredenciales = credencialResult.rows.length > 0;

        // Caso D: no existe en ninguna tabla
        if (!enRegistros && !enCredenciales) {
            return res.status(404).json({
                error: 'Registro no encontrado con la cédula y nacionalidad proporcionadas.'
            });
        }

        // Casos A y B: existe en rm_registros (con o sin credenciales)
        if (enRegistros) {
            const registro = registroResult.rows[0];

            // Validar permisos geográficos usando state_id de rm_registros
            const hasNationalAccess = await hasNationalDashboardAccess(userId);
            if (!hasNationalAccess) {
                const allowedStates = await getAllowedStatesForUser(userId);
                if (!allowedStates.includes(registro.state_id)) {
                    return res.status(403).json({
                        error: 'No tiene permisos para consultar este registro. El adulto mayor pertenece a un estado no autorizado.'
                    });
                }
            }

            return res.json({
                vat:               registro.vat,
                nationality:       registro.user_nationality,
                emailRegistros:    registro.email,
                emailCredenciales: enCredenciales ? credencialResult.rows[0].email : null,
                state_id:          registro.state_id,
                tieneCredenciales: enCredenciales
            });
        }

        // Caso C: solo existe en rm_credenciales
        const canAccess = await hasEmailWithoutRegistroPermission(userId);
        if (!canAccess) {
            return res.status(403).json({
                error: 'No tiene permisos para consultar este registro. El usuario no posee datos de registro y usted no cuenta con el permiso necesario.'
            });
        }

        const credencial = credencialResult.rows[0];
        return res.json({
            vat:               credencial.vat,
            nationality:       credencial.user_nationality,
            emailRegistros:    null,
            emailCredenciales: credencial.email,
            state_id:          null,
            tieneCredenciales: true
        });

    } catch (error) {
        console.error('[emailController] Error en getEmailByVat:', error);
        res.status(500).json({ error: 'Error al buscar el registro.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/email/:vat/:nationality
// Actualiza el email de un registro por VAT y nacionalidad.
// Body: { newEmail }
// ─────────────────────────────────────────────────────────────────────────────
const updateEmailByVat = async (req, res) => {
    const client = await pool.connect();

    try {
        const { vat, nationality } = req.params;
        const { newEmail } = req.body;
        const userId = req.user.id;

        // ── Validaciones de entrada ──────────────────────────────────────────
        if (!vat || !/^\d+$/.test(vat)) {
            return res.status(400).json({ error: 'VAT inválido. Debe contener solo números.' });
        }

        if (!nationality || !['venezuelan', 'foreign'].includes(nationality)) {
            return res.status(400).json({ error: 'Nacionalidad inválida.' });
        }

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ error: 'Formato de email inválido.' });
        }

        // ── Búsqueda paralela en ambas tablas (fuera de transacción) ─────────
        const [registroResult, credencialResult] = await Promise.all([
            pool.query(
                'SELECT vat, email, state_id, user_nationality FROM rm_registros WHERE vat = $1 AND user_nationality = $2',
                [vat, nationality]
            ),
            pool.query(
                'SELECT vat, email, user_nationality FROM rm_credenciales WHERE vat = $1 AND user_nationality = $2',
                [vat, nationality]
            )
        ]);

        const enRegistros    = registroResult.rows.length > 0;
        const enCredenciales = credencialResult.rows.length > 0;

        // ── Caso D: no existe en ninguna tabla ───────────────────────────────
        if (!enRegistros && !enCredenciales) {
            return res.status(404).json({
                error: 'Registro no encontrado con la cédula y nacionalidad proporcionadas.'
            });
        }

        // ── Casos A y B: existe en rm_registros ──────────────────────────────
        if (enRegistros) {
            const registro = registroResult.rows[0];

            // Validar permisos geográficos usando state_id de rm_registros
            const hasNationalAccess = await hasNationalDashboardAccess(userId);
            if (!hasNationalAccess) {
                const allowedStates = await getAllowedStatesForUser(userId);
                if (!allowedStates.includes(registro.state_id)) {
                    return res.status(403).json({
                        error: 'No tiene permisos para editar este registro. El adulto mayor pertenece a un estado no autorizado.'
                    });
                }
            }

            // Caso B: registrado pero sin credenciales → no se actualiza nada,
            // se informa al operador para que el usuario cree sus credenciales.
            if (!enCredenciales) {
                return res.status(200).json({
                    action:      'no_credentials',
                    updated:     false,
                    message:     'Este usuario está registrado pero no tiene usuario y clave en el sistema. ' +
                                 'Para crear sus credenciales debe dirigirse a ' + REGISTRO_URL +
                                 ' y usar la opción "Regístrate".',
                    registroUrl: REGISTRO_URL,
                    vat,
                    nationality
                });
            }

            // Caso A: existe en ambas tablas → actualizar ambas en transacción
            await client.query('BEGIN');

            const updateRegistros = await client.query(
                'UPDATE rm_registros SET email = $1 WHERE vat = $2 AND user_nationality = $3',
                [newEmail, vat, nationality]
            );

            const updateCredenciales = await client.query(
                'UPDATE rm_credenciales SET email = $1 WHERE vat = $2 AND user_nationality = $3',
                [newEmail, vat, nationality]
            );

            // Guardia: el registro existe pero no se actualizó → revertir
            if (updateCredenciales.rowCount === 0) {
                await client.query('ROLLBACK');
                console.error('[emailController] rm_credenciales existe pero rowCount = 0 tras UPDATE. Rollback ejecutado.');
                return res.status(500).json({
                    error: 'El correo existe en credenciales pero no pudo actualizarse. Los cambios han sido revertidos.'
                });
            }

            await client.query('COMMIT');

            return res.json({
                action:   'updated_both',
                success:  true,
                message:  'Email actualizado correctamente en ambas tablas.',
                vat,
                nationality,
                newEmail,
                tablesUpdated: {
                    rm_registros:    updateRegistros.rowCount,
                    rm_credenciales: updateCredenciales.rowCount
                }
            });
        }

        // ── Caso C: solo existe en rm_credenciales ───────────────────────────
        // No hay state_id disponible; se requiere permiso ampliado.
        const canUpdate = await hasEmailWithoutRegistroPermission(userId);
        if (!canUpdate) {
            return res.status(403).json({
                error: 'No tiene permisos para modificar este correo. El usuario no posee datos de registro ' +
                       'y usted no cuenta con el permiso "editar_email_sin_registro".'
            });
        }

        await client.query('BEGIN');

        const updateCredencialesSolo = await client.query(
            'UPDATE rm_credenciales SET email = $1 WHERE vat = $2 AND user_nationality = $3',
            [newEmail, vat, nationality]
        );

        if (updateCredencialesSolo.rowCount === 0) {
            await client.query('ROLLBACK');
            console.error('[emailController] No se pudo actualizar rm_credenciales en Caso C. Rollback ejecutado.');
            return res.status(500).json({
                error: 'No se pudo actualizar el correo en credenciales. Los cambios han sido revertidos.'
            });
        }

        await client.query('COMMIT');

        return res.json({
            action:   'updated_credentials_only',
            success:  true,
            message:  'Email actualizado correctamente en credenciales. Este usuario no posee datos de registro.',
            vat,
            nationality,
            newEmail,
            tablesUpdated: {
                rm_registros:    0,
                rm_credenciales: updateCredencialesSolo.rowCount
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[emailController] Error en updateEmailByVat. Transacción revertida:', error);
        res.status(500).json({ error: 'Error al actualizar el email. Los cambios han sido revertidos.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getEmailByVat,
    updateEmailByVat
};
