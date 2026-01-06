// services/notificationListener.js

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Client } = require('pg');
const cache = require('./cacheService');
const { refreshDashboardCache } = require('./dashboardWorker');
const websocketService = require('./websocketService'); // Importamos el servicio de broadcast

// Configuración de la conexión a la base de datos de ORIGEN ('registro')
const dbConfig = {
  user: process.env.REGISTRO_DB_USER,
  host: process.env.REGISTRO_DB_HOST,
  database: process.env.REGISTRO_DB_DATABASE,
  password: process.env.REGISTRO_DB_PASSWORD,
  port: process.env.REGISTRO_DB_PORT,
};
// Listener DB configuration loaded (sensitive data omitted)

let client; // Mantenemos el cliente en una variable para poder reconectar

const startListening = () => {
  client = new Client(dbConfig);

  client.connect(err => {
    if (err) {
      console.error('❌ Error de conexión con el listener de la BD, reintentando en 5 segundos...', err);
      setTimeout(startListening, 5000);
      return;
    }
    // Listener connected to the source DB
    client.query('LISTEN actualizacion_dashboard');
  });

  client.on('notification', (msg) => {
    try {
      const payload = JSON.parse(msg.payload);


      // Envolvemos el payload en el formato que el frontend espera
      const message = {
        event: 'db_change',
        payload: payload
      };

      // Enviamos el objeto estructurado a todos los clientes
      websocketService.broadcast(message);

    } catch (error) {
      console.error('Error al parsear el payload de la notificación:', error);
    }
  });

  client.on('end', () => {
    console.warn('🔚 Conexión del listener de la BD finalizada. Reintentando conexión...');
    setTimeout(startListening, 5000); // Intenta reconectar si la conexión se pierde
  });

  client.on('error', (err) => {
    console.error('❌ Error en el cliente listener de la BD:', err);
    // La conexión se cierra automáticamente en un error grave, el evento 'end' se disparará
  });
};

module.exports = { startListening };