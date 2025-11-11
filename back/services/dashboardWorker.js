const pool = require('../config/db');
const cache = require('./cacheService');
const websocketService = require('./websocketService');

let isRefreshing = false; // Un semáforo para evitar refrescos concurrentes

/**
 * La función principal que realiza el trabajo pesado.
 * Obtiene todos los datos, los agrega y actualiza el caché.
 */
async function refreshDashboardCache() {
  if (isRefreshing) {
    console.log('[Worker] Ya hay un refresco en progreso. Omitiendo.');
    return;
  }

  console.log('[Worker] Iniciando refresco del caché del dashboard...');
  isRefreshing = true;

  try {
    // 1. Obtener TODOS los datos crudos (la única consulta lenta)
    // NOTA: Para 100,000 registros, esto puede consumir memoria.
    // Una optimización avanzada sería usar cursores y procesar en streams.
    const rawDataResult = await pool.query('SELECT estado, municipio, id FROM rm_circulos_remoto');
    const rawData = rawDataResult.rows;

    // 2. Realizar todas las agregaciones en memoria (esto es ultra rápido)
    const circulosPorEstado = rawData.reduce((acc, row) => {
      acc[row.estado] = (acc[row.estado] || 0) + 1;
      return acc;
    }, {});

    const circulosPorMunicipio = rawData.reduce((acc, row) => {
        const key = `${row.estado}|${row.municipio}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    
    const totalCirculos = rawData.length;

    // 3. Sobrescribir los datos en el caché
    cache.set('dashboard:by-state', circulosPorEstado);
    cache.set('dashboard:by-municipality', circulosPorMunicipio);
    cache.set('dashboard:total', totalCirculos);

    console.log('[Worker] Caché actualizado exitosamente.');

    // 4. Notificar al frontend que los datos están listos
    websocketService.broadcast({ event: 'data_updated' });

  } catch (error) {
    console.error('[Worker] Error durante el refresco del caché:', error);
  } finally {
    isRefreshing = false; // Liberar el semáforo
  }
}

module.exports = {
  refreshDashboardCache,
};