const cron = require('node-cron');
const pool = require('../config/db');

/**
 * Actualiza la vista materializada vregistros_estados de manera concurrente
 */
async function refreshMaterializedView() {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Iniciando actualización de vista materializada: public.vregistros_estados`);

    try {
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY public.vregistros_estados');
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ✓ Vista materializada actualizada exitosamente en ${duration}ms`);
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] ✗ Error al actualizar vista materializada (${duration}ms):`, error.message);

        // Registrar detalles adicionales del error
        if (error.code) {
            console.error(`  Código de error PostgreSQL: ${error.code}`);
        }
        if (error.detail) {
            console.error(`  Detalle: ${error.detail}`);
        }
        if (error.hint) {
            console.error(`  Sugerencia: ${error.hint}`);
        }
    }
}

/**
 * Inicia el scheduler para actualizar la vista materializada cada hora
 */
function startMaterializedViewScheduler() {
    // Ejecutar cada hora (min 0 de cada hora)
    // Formato cron: segundo minuto hora día mes día_semana
    // '0 * * * *' = cada hora en el minuto 0
    const schedule = '0 * * * *';

    console.log(`[${new Date().toISOString()}] Iniciando scheduler de vista materializada`);
    console.log(`  - Vista: public.vregistros_estados`);
    console.log(`  - Frecuencia: Cada hora (${schedule})`);
    console.log(`  - Modo: CONCURRENT`);

    // Programar la tarea
    const task = cron.schedule(schedule, async () => {
        await refreshMaterializedView();
    }, {
        scheduled: true,
        timezone: "America/Caracas" // Ajusta según tu zona horaria
    });

    // Ejecutar inmediatamente la primera vez (opcional)
    console.log(`[${new Date().toISOString()}] Ejecutando actualización inicial...`);
    refreshMaterializedView().catch(err => {
        console.error('Error en la actualización inicial:', err.message);
    });

    return task;
}

module.exports = {
    startMaterializedViewScheduler,
    refreshMaterializedView
};
