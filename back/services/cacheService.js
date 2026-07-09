// services/cacheService.js
//
// Adaptador de caché unificado: Redis (producción) con fallback automático
// a node-cache (desarrollo / entornos sin Redis disponible).
//
// API pública (idéntica en ambos modos):
//   cache.get(key)               → valor deserializado o null
//   cache.set(key, value, ttl)   → void  (ttl en segundos)
//   cache.del(key)               → void
//   cache.delPattern(pattern)    → void  (ej: 'dashboard:*')
//   cache.isRedis()              → boolean

const NodeCache = require('node-cache');

// ─── Modo node-cache (fallback) ────────────────────────────────────────────────

const nodeCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const nodeCacheAdapter = {
    isRedis: () => false,

    get: (key) => {
        const val = nodeCache.get(key);
        return val === undefined ? null : val;
    },

    set: (key, value, ttl) => {
        if (ttl !== undefined) {
            nodeCache.set(key, value, ttl);
        } else {
            nodeCache.set(key, value);
        }
    },

    del: (key) => {
        nodeCache.del(key);
    },

    delPattern: (pattern) => {
        // Convertir glob simple (dashboard:*) a regex
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        const keys = nodeCache.keys().filter(k => regex.test(k));
        if (keys.length > 0) {
            nodeCache.del(keys);
        }
    },
};

// ─── Modo Redis ────────────────────────────────────────────────────────────────

function buildRedisAdapter(client) {
    return {
        isRedis: () => true,

        get: async (key) => {
            const raw = await client.get(key);
            if (raw === null) return null;
            try {
                return JSON.parse(raw);
            } catch {
                return raw;
            }
        },

        set: async (key, value, ttl) => {
            const serialized = JSON.stringify(value);
            if (ttl !== undefined && ttl > 0) {
                await client.set(key, serialized, 'EX', ttl);
            } else {
                await client.set(key, serialized);
            }
        },

        del: async (key) => {
            await client.del(key);
        },

        delPattern: async (pattern) => {
            // SCAN iterativo para no bloquear Redis con KEYS en producción
            let cursor = '0';
            do {
                const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await client.del(...keys);
                }
            } while (cursor !== '0');
        },
    };
}

// ─── Inicialización ───────────────────────────────────────────────────────────

let adapter = nodeCacheAdapter; // valor por defecto mientras se resuelve la conexión

async function initCache() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.warn('⚠️  [Cache] REDIS_URL no definida. Usando node-cache (modo degradado).');
        return;
    }

    try {
        const Redis = require('ioredis');

        const client = new Redis(redisUrl, {
            connectTimeout: 3000,           // timeout de conexión inicial
            maxRetriesPerRequest: 1,        // no reintentar requests indefinidamente
            enableOfflineQueue: false,      // no encolar si no hay conexión
            lazyConnect: true,              // conectar explícitamente con .connect()
        });

        await client.connect();
        await client.ping(); // confirmar que el servidor responde

        adapter = buildRedisAdapter(client);

        client.on('error', (err) => {
            console.error('❌ [Cache] Error en Redis:', err.message);
        });

        client.on('reconnecting', () => {
            console.warn('🔄 [Cache] Reconectando a Redis...');
        });

        // Extraer host para el log (sin exponer la contraseña)
        const urlObj = new URL(redisUrl);
        console.log(`✅ [Cache] Redis conectado a ${urlObj.hostname}:${urlObj.port || 6379} (DB ${urlObj.pathname.replace('/', '') || 0})`);

    } catch (err) {
        console.warn(`⚠️  [Cache] No se pudo conectar a Redis (${err.message}). Usando node-cache (modo degradado).`);
        adapter = nodeCacheAdapter;
    }
}

// ─── Proxy que delega al adaptador activo ────────────────────────────────────
// Permite usar `await cache.get(key)` de forma transparente en ambos modos.

const cache = {
    isRedis:    ()              => adapter.isRedis(),
    get:        (key)           => Promise.resolve(adapter.get(key)),
    set:        (key, val, ttl) => Promise.resolve(adapter.set(key, val, ttl)),
    del:        (key)           => Promise.resolve(adapter.del(key)),
    delPattern: (pattern)       => Promise.resolve(adapter.delPattern(pattern)),
};

module.exports = { cache, initCache };