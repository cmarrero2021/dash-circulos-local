// controllers/dashboardController.js
const pool = require('../config/db');
const dashboardService = require('../services/dashboardService');

const handleRequest = async (serviceFunction, req, res) => {
    try {
        const userId = req.user.id;
        const filters = {
            estado_id: req.query.estado_id,
            municipio_id: req.query.municipio_id,
            // Paginación para raw-data
            page: req.query.page,
            limit: req.query.limit,
        };
        const data = await serviceFunction(userId, filters);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador del dashboard:', error.message);
        res.status(500).send('Error del servidor');
    }
}

exports.getIndicators = async (req, res) => {
    try {
        const data = await dashboardService.getIndicators(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador de indicadores:', error.message);
        res.status(500).send('Error del servidor');
    }
};

exports.getStateIndicatorsView = async (req, res) => {
    try {
        const data = await dashboardService.getStateIndicatorsView(req.user.id, req.query);
        res.json(data);
    } catch (error) {
        console.error('Error en el controlador de indicadores por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Exportamos TODAS las funciones que el router necesita
exports.getCirclesByState = (req, res) => handleRequest(dashboardService.getCirclesByState, req, res);
exports.getCirclesByMunicipality = (req, res) => handleRequest(dashboardService.getCirclesByMunicipality, req, res);
exports.getCirclesByStateMunicipios = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipios, req, res);
exports.getCirclesByStateMunicipiosParroquias = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosParroquias, req, res);
exports.getCirclesByStateMunicipiosParroquiasComunas = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosParroquiasComunas, req, res);
exports.getCirclesByStateMunicipiosComunas = (req, res) => handleRequest(dashboardService.getCirclesByStateMunicipiosComunas, req, res);
exports.getTotalCircles = (req, res) => handleRequest(dashboardService.getTotalCircles, req, res);
exports.getDailyAverage = (req, res) => handleRequest(dashboardService.getDailyAverage, req, res);
exports.getRawData = (req, res) => handleRequest(dashboardService.getRawData, req, res);
exports.getDailyCertifications = (req, res) => handleRequest(dashboardService.getDailyCertifications, req, res);

// Endpoint para obtener datos del mapa de Venezuela (porcentajes por estado)
exports.getMapaEstados = async (req, res) => {
    try {
        const data = await dashboardService.getMapaEstados(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener datos del mapa:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener participantes por estado (capa de dispersión)
exports.getParticipantesPorEstado = async (req, res) => {
    try {
        const data = await dashboardService.getParticipantesPorEstado(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener participantes por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener priorizados por estado (capa de dispersión triángulos)
exports.getPriorizadosPorEstado = async (req, res) => {
    try {
        const data = await dashboardService.getPriorizadosPorEstado(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener priorizados por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener indicadores de registros básicos por estado
exports.getRegistrosIndicadoresPorEstado = async (req, res) => {
    try {
        const data = await dashboardService.getRegistrosIndicadoresPorEstado(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener indicadores de registros por estado:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener indicadores de registros básicos nacionales
exports.getRegistrosIndicadoresNacionales = async (req, res) => {
    try {
        const data = await dashboardService.getRegistrosIndicadoresNacionales(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener indicadores de registros nacionales:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener datos paginados de priorizados
exports.getPriorizados = async (req, res) => {
    try {
        const data = await dashboardService.getPriorizados(req.user.id, req.query);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener priorizados:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// Endpoint para obtener opciones de filtro de priorizados
exports.getPriorizadosFilterOptions = async (req, res) => {
    try {
        const data = await dashboardService.getPriorizadosFilterOptions(req.user.id, req.query);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener opciones de filtro:', error.message);
        res.status(500).send('Error del servidor');
    }
};
// ─── Pirámide Poblacional ──────────────────────────────────────────────────────

exports.getPyramideEdad = async (req, res) => {
    try {
        const step = req.query.step || 5;
        const data = await dashboardService.getPyramideEdad(req.user.id, step);
        res.json(data);
    } catch (error) {
        console.error('Error al obtener pirámide de edad:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// ─── Línea de Tiempo de Registros ─────────────────────────────────────────────

exports.getRecordsTimeline = async (req, res) => {
    try {
        const { period, grouping, startDate, endDate } = req.query;
        const data = await dashboardService.getRecordsTimeline(req.user.id, {
            period,
            grouping,
            startDate,
            endDate,
        });
        res.json(data);
    } catch (error) {
        console.error('Error al obtener línea de tiempo de registros:', error.message);
        res.status(500).send('Error del servidor');
    }
};

// ─── CRUD de Consultas Guardadas (REST) ───────────────────────────────────────

exports.listSavedQueries = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;

        // Obtener rol del usuario
        const roleResult = await client.query(
            `SELECT u.rol_id FROM public.usuarios u WHERE u.id = $1`,
            [userId]
        );
        const roleId = roleResult.rows[0]?.rol_id || 0;

        // Filtro opcional por fuente de datos: las consultas guardadas de
        // PRIORIZADOS y REGISTROS usan datasets distintos y no deben mezclarse.
        // Las consultas antiguas sin `source` en pivot_config se asumen 'priorizados'.
        const source = req.query.source || null;
        const params = [userId, roleId];
        let sourceFilter = '';
        if (source) {
            params.push(source);
            sourceFilter = ` AND COALESCE(sq.pivot_config->>'source', 'priorizados') = $${params.length}`;
        }

        const result = await client.query(
            `SELECT sq.*,
                    u.nombre AS created_by_name,
                    CASE
                        WHEN sq.created_by = $1 THEN 'owner'
                        WHEN sq.visibility = 'public' THEN 'public'
                        ELSE 'shared'
                    END AS access_type
             FROM public.saved_queries sq
             LEFT JOIN public.usuarios u ON u.id = sq.created_by
             WHERE sq.deleted_at IS NULL
               AND (
                   sq.visibility = 'public'
                   OR sq.created_by = $1
                   OR EXISTS (
                       SELECT 1 FROM public.saved_query_access sqa
                       WHERE sqa.query_id = sq.id AND sqa.user_id = $1
                   )
                   OR EXISTS (
                       SELECT 1 FROM public.saved_query_access sqa
                       WHERE sqa.query_id = sq.id AND sqa.role_id = $2
                   )
               )
               ${sourceFilter}
             ORDER BY sq.updated_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error al listar consultas guardadas:', err);
        res.status(500).json({ error: 'Error al listar consultas guardadas', detail: err.message });
    } finally {
        client.release();
    }
};

exports.getSavedQuery = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const roleResult = await client.query(
            `SELECT u.rol_id FROM public.usuarios u WHERE u.id = $1`,
            [userId]
        );
        const roleId = roleResult.rows[0]?.rol_id || 0;

        const result = await client.query(
            `SELECT sq.*,
                    u.nombre AS created_by_name
             FROM public.saved_queries sq
             LEFT JOIN public.usuarios u ON u.id = sq.created_by
             WHERE sq.id = $1 AND sq.deleted_at IS NULL
               AND (
                   sq.visibility = 'public'
                   OR sq.created_by = $2
                   OR EXISTS (SELECT 1 FROM public.saved_query_access sqa WHERE sqa.query_id = sq.id AND sqa.user_id = $2)
                   OR EXISTS (SELECT 1 FROM public.saved_query_access sqa WHERE sqa.query_id = sq.id AND sqa.role_id = $3)
               )`,
            [id, userId, roleId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada o sin acceso.' });
        }

        // Obtener lista de accesos compartidos
        const accesses = await client.query(
            `SELECT sqa.*, 
                    u.nombre AS user_name,
                    r.nombre AS role_name
             FROM public.saved_query_access sqa
             LEFT JOIN public.usuarios u ON u.id = sqa.user_id
             LEFT JOIN public.roles r ON r.id = sqa.role_id
             WHERE sqa.query_id = $1`,
            [id]
        );

        res.json({
            ...result.rows[0],
            shared_with: accesses.rows,
        });
    } catch (err) {
        console.error('Error al obtener consulta guardada:', err);
        res.status(500).json({ error: 'Error al obtener consulta guardada', detail: err.message });
    } finally {
        client.release();
    }
};

exports.createSavedQuery = async (req, res) => {
    const { name, description, graphql_query, graphql_variables, pivot_config, chart_config, visibility } = req.body;
    const client = await pool.connect();
    try {
        if (!name || !pivot_config) {
            return res.status(400).json({ error: 'Nombre y configuración pivote son requeridos.' });
        }

        const pinTable = !!(chart_config && chart_config.pinTable);
        const pinChart = !!(chart_config && chart_config.pinChart);

        const result = await client.query(
            `INSERT INTO public.saved_queries (name, description, graphql_query, graphql_variables, pivot_config, chart_config, visibility, pin_table, pin_chart, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                name,
                description || null,
                graphql_query || '',
                graphql_variables || '{}',
                JSON.stringify(pivot_config),
                JSON.stringify(chart_config || {}),
                visibility || 'private',
                pinTable,
                pinChart,
                req.user.id
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error al crear consulta guardada:', err);
        res.status(500).json({ error: 'Error al crear consulta guardada', detail: err.message });
    } finally {
        client.release();
    }
};

exports.updateSavedQuery = async (req, res) => {
    const { id } = req.params;
    const { name, description, graphql_query, graphql_variables, pivot_config, chart_config, visibility } = req.body;
    const client = await pool.connect();
    try {
        // Verificar propiedad
        const existing = await client.query(
            'SELECT created_by FROM public.saved_queries WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada.' });
        }
        if (existing.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Solo el creador puede modificar esta consulta.' });
        }

        const pinTable = chart_config && Object.prototype.hasOwnProperty.call(chart_config, 'pinTable')
            ? !!chart_config.pinTable : null;
        const pinChart = chart_config && Object.prototype.hasOwnProperty.call(chart_config, 'pinChart')
            ? !!chart_config.pinChart : null;

        const result = await client.query(
            `UPDATE public.saved_queries SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                graphql_query = COALESCE($3, graphql_query),
                graphql_variables = COALESCE($4, graphql_variables),
                pivot_config = COALESCE($5, pivot_config),
                chart_config = COALESCE($6, chart_config),
                visibility = COALESCE($7, visibility),
                pin_table = COALESCE($8, pin_table),
                pin_chart = COALESCE($9, pin_chart),
                updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [
                name || null,
                description !== undefined ? description : null,
                graphql_query || null,
                graphql_variables ? JSON.stringify(graphql_variables) : null,
                pivot_config ? JSON.stringify(pivot_config) : null,
                chart_config ? JSON.stringify(chart_config) : null,
                visibility || null,
                pinTable,
                pinChart,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al actualizar consulta guardada:', err);
        res.status(500).json({ error: 'Error al actualizar consulta guardada', detail: err.message });
    } finally {
        client.release();
    }
};

exports.deleteSavedQuery = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const existing = await client.query(
            'SELECT created_by FROM public.saved_queries WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada.' });
        }
        if (existing.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Solo el creador puede eliminar esta consulta.' });
        }

        await client.query(
            'UPDATE public.saved_queries SET deleted_at = NOW() WHERE id = $1',
            [id]
        );

        res.json({ message: 'Consulta eliminada correctamente.' });
    } catch (err) {
        console.error('Error al eliminar consulta guardada:', err);
        res.status(500).json({ error: 'Error al eliminar consulta guardada', detail: err.message });
    } finally {
        client.release();
    }
};

// ─── Toggle de Pin (Fijar Tabla / Fijar Gráfica) ──────────────────────────────
// Body: { target: 'table' | 'chart', value: true | false }
// Solo el creador de la consulta puede fijarla. Update es incremental: no toca
// el resto de columnas (COALESCE preserva el valor existente para el otro pin).
exports.toggleSavedQueryPin = async (req, res) => {
    const { id } = req.params;
    const { target, value } = req.body;
    const client = await pool.connect();
    try {
        if (!['table', 'chart'].includes(target)) {
            return res.status(400).json({ error: "target debe ser 'table' o 'chart'." });
        }

        // Verificar propiedad (sólo el creador puede fijar)
        const existing = await client.query(
            'SELECT created_by FROM public.saved_queries WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada.' });
        }
        if (existing.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Solo el creador puede fijar esta consulta.' });
        }

        const col = target === 'table' ? 'pin_table' : 'pin_chart';
        const result = await client.query(
            `UPDATE public.saved_queries SET ${col} = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, pin_table, pin_chart`,
            [!!value, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al actualizar pin:', err);
        res.status(500).json({ error: 'Error al actualizar pin', detail: err.message });
    } finally {
        client.release();
    }
};

exports.grantQueryAccess = async (req, res) => {
    const { id } = req.params;
    const { user_id, role_id } = req.body;
    const client = await pool.connect();
    try {
        // Verificar propiedad
        const existing = await client.query(
            'SELECT created_by FROM public.saved_queries WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada.' });
        }
        if (existing.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Solo el creador puede compartir esta consulta.' });
        }

        if (!user_id && !role_id) {
            return res.status(400).json({ error: 'Debe especificar user_id o role_id.' });
        }

        const result = await client.query(
            `INSERT INTO public.saved_query_access (query_id, user_id, role_id, granted_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [id, user_id || null, role_id || null, req.user.id]
        );

        if (!result.rows.length) {
            return res.json({ message: 'El acceso ya había sido otorgado.' });
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error al otorgar acceso:', err);
        res.status(500).json({ error: 'Error al otorgar acceso', detail: err.message });
    } finally {
        client.release();
    }
};

exports.revokeQueryAccess = async (req, res) => {
    const { id } = req.params;
    const { user_id, role_id } = req.body;
    const client = await pool.connect();
    try {
        const existing = await client.query(
            'SELECT created_by FROM public.saved_queries WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Consulta no encontrada.' });
        }
        if (existing.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ error: 'Solo el creador puede revocar acceso.' });
        }

        let deleteQuery;
        let params;
        if (user_id) {
            deleteQuery = 'DELETE FROM public.saved_query_access WHERE query_id = $1 AND user_id = $2';
            params = [id, user_id];
        } else if (role_id) {
            deleteQuery = 'DELETE FROM public.saved_query_access WHERE query_id = $1 AND role_id = $2';
            params = [id, role_id];
        } else {
            return res.status(400).json({ error: 'Debe especificar user_id o role_id.' });
        }

        await client.query(deleteQuery, params);
        res.json({ message: 'Acceso revocado correctamente.' });
    } catch (err) {
        console.error('Error al revocar acceso:', err);
        res.status(500).json({ error: 'Error al revocar acceso', detail: err.message });
    } finally {
        client.release();
    }
};

