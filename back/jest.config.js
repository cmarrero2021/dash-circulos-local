// jest.config.js
module.exports = {
  // Entorno de prueba que simula un entorno de Node.js
  testEnvironment: 'node',

  // Un patrón para que Jest sepa dónde encontrar los archivos de test
  testMatch: ['**/tests/**/*.test.js'],

  // Limpiar mocks entre cada test, buena práctica
  clearMocks: true,

  // Tiempo máximo de espera para un test antes de considerarlo fallido
  testTimeout: 10000,

  // Forzar la salida de Jest después de que los tests terminen
  forceExit: true,
  setupFilesAfterEnv: ['./tests/setup.js'],
};