const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const { startListening } = require('./services/notificationListener');
const websocketService = require('./services/websocketService');

// --- Importar rutas ---
const authRoutes = require('./routes/auth');
const permissionRoutes = require('./routes/permissions');
const roleRoutes = require('./routes/roles');
const utilityRoutes = require('./routes/utility');
const userRoutes = require('./routes/users');
// --- Configuración de Express ---
const app = express();

app.use(cors()); // Habilita CORS para todas las rutas
app.use(helmet()); // Añade cabeceras de seguridad
app.use(express.json()); // Permite al servidor entender JSON en las peticiones

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('API del Dashboard de Registros está en funcionamiento.');
});

// --- Usar las rutas ---
// Todas las rutas definidas en auth.js estarán prefijadas con /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);

// Solo habilitar esta ruta en entorno de desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/utility', utilityRoutes); // <-- Añadir
}
// --- Configuración del Servidor HTTP y WebSocket ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Inicializar el servicio de WebSocket
websocketService.initialize(wss);


wss.on('connection', (ws) => {
  console.log('🔗 Cliente conectado al WebSocket');
  
  ws.on('close', () => {
    console.log('✖️ Cliente desconectado del WebSocket');
  });

  ws.on('error', console.error);
});

// --- Inicialización del Servidor ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  // Iniciar el listener de notificaciones de la base de datos 'registro'
  startListening();
});