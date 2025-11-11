// services/cacheService.js
const NodeCache = require('node-cache');

// stdTTL: Tiempo de vida estándar de una clave en segundos. 0 = sin expiración.
// checkperiod: Cada cuánto se revisan las claves expiradas.
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

console.log('✅ Servicio de Caché inicializado.');

module.exports = cache;