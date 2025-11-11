// services/notificationListener.js

require('dotenv').config();
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
console.log('🔍 Configuración del Listener de la BD:', {
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    password: dbConfig.password ? '****** (definida)' : 'undefined' // No mostramos la clave en el log
});

let client; // Mantenemos el cliente en una variable para poder reconectar

const startListening = () => {
  client = new Client(dbConfig);

  client.connect(err => {
    if (err) {
      console.error('❌ Error de conexión con el listener de la BD, reintentando en 5 segundos...', err);
      setTimeout(startListening, 5000);
      return;
    }
    console.log('✅ Listener conectado a la base de datos "registro"');
    client.query('LISTEN actualizacion_dashboard');
  });

  client.on('notification', (msg) => {
    console.log('🔔 Notificación recibida. Disparando refresco en segundo plano.');
    websocketService.broadcast({ event: 'data_is_updating' });
    refreshDashboardCache();    
    // try {
    //   const payload = JSON.parse(msg.payload);
    //   console.log('   Payload:', payload);
      
    //   // Enviamos el payload a todos los clientes conectados a través de nuestro servicio WebSocket
    //   websocketService.broadcast(payload);

    // } catch (error) {
    //   console.error('Error al parsear el payload de la notificación:', error);
    // }
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