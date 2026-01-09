const cron = require('node-cron');
const pool = require('../config/db');

// Lista de vistas materializadas a actualizar
const MATERIALIZED_VIEWS = [
    'public.vregistros_estados',
    'public.vindicadores_registros_basicos_estados'
];

/**
 * Actualiza una vista materializada específica de manera concurrente
 * @param {string} viewName - Nombre completo de la vista materializada
 */
async function refreshSingleView(viewName) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Actualizando: ${viewName}`);

    try {
        await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ✓ ${viewName} actualizada en ${duration}ms`);
        return { success: true, viewName, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${new Date().toISOString()}] ✗ Error en ${viewName} (${duration}ms):`, error.message);

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

        return { success: false, viewName, duration, error: error.message };
    }
}

/**
 * Actualiza todas las vistas materializadas de manera concurrente
 */
async function refreshMaterializedViews() {
    const globalStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] Iniciando actualización de ${MATERIALIZED_VIEWS.length} vistas materializadas`);

    // Ejecutar todas las actualizaciones en paralelo
    const results = await Promise.allSettled(
        MATERIALIZED_VIEWS.map(viewName => refreshSingleView(viewName))
    );

    // Recopilar resultados
    const globalDuration = Date.now() - globalStartTime;
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
        } else {
            failCount++;
        }
    });

    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] Resumen de actualización:`);
    console.log(`  - Total de vistas: ${MATERIALIZED_VIEWS.length}`);
    console.log(`  - Exitosas: ${successCount}`);
    console.log(`  - Fallidas: ${failCount}`);
    console.log(`  - Tiempo total: ${globalDuration}ms`);
    console.log(`[${new Date().toISOString()}] ========================================`);

    return results;
}

/**
 * Función legacy para mantener compatibilidad
 * Ahora actualiza todas las vistas
 */
async function refreshMaterializedView() {
    await refreshMaterializedViews();
}

/**
 * Inicia el scheduler para actualizar las vistas materializadas cada hora
 */
function startMaterializedViewScheduler() {
    // Ejecutar cada hora (min 0 de cada hora)
    // Formato cron: minuto hora día mes día_semana
    // '0 * * * *' = cada hora en el minuto 0
    const schedule = '0 * * * *';

    console.log(`[${new Date().toISOString()}] Iniciando scheduler de vistas materializadas`);
    console.log(`  - Vistas a actualizar:`);
    MATERIALIZED_VIEWS.forEach(view => console.log(`    • ${view}`));
    console.log(`  - Frecuencia: Cada hora (${schedule})`);
    console.log(`  - Modo: CONCURRENT (paralelo)`);
    console.log(`  - Zona horaria: America/Caracas`);

    // Programar la tarea
    const task = cron.schedule(schedule, async () => {
        await refreshMaterializedViews();
    }, {
        scheduled: true,
        timezone: "America/Caracas"
    });

    // Ejecutar inmediatamente la primera vez (opcional)
    console.log(`[${new Date().toISOString()}] Ejecutando actualización inicial...`);
    refreshMaterializedViews().catch(err => {
        console.error('Error en la actualización inicial:', err.message);
    });

    return task;
}

module.exports = {
    startMaterializedViewScheduler,
    refreshMaterializedView,
    refreshMaterializedViews,
    refreshSingleView
};
