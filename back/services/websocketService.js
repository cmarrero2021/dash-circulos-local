// services/websocketService.js

const WebSocket = require('ws');

let wss = null; // Variable para mantener la instancia del servidor WebSocket

/**
 * Inicializa el servicio, guardando una referencia al servidor WebSocket.
 * Esta función es llamada una vez desde server.js al arrancar.
 * @param {WebSocketServer} webSocketServer La instancia del servidor WebSocket.
 */
const initialize = (webSocketServer) => {
  wss = webSocketServer;
  // WebSocket service initialized
};

/**
 * Envía un mensaje a todos los clientes conectados y activos.
 * @param {Object} data El objeto de datos que se enviará (será convertido a JSON).
 */
const broadcast = (data) => {
  if (!wss) {
    console.error('Error: El servicio de WebSocket no ha sido inicializado.');
    return;
  }

  console.log('Broadcasting message to clients:', data); // Log para depuración

  const message = JSON.stringify(data);

  wss.clients.forEach((client) => {
    // Solo enviar si la conexión está abierta
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

module.exports = {
  initialize,
  broadcast,
};