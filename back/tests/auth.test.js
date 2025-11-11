// tests/auth.test.js
const request = require('supertest');
const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Importar las rutas que queremos probar
const authRoutes = require('../routes/auth');

// Crear una app de Express para los tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Endpoints', () => {
    beforeAll(async () => {
        // Limpiar la tabla de usuarios y crear un usuario de prueba antes de todos los tests
        await pool.query('DELETE FROM usuarios');
        const passwordHash = await bcrypt.hash('password123', 10);
        await pool.query(
            "INSERT INTO usuarios (id, nombre, email, cedula, password_hash, activo) VALUES (1, 'Test User', 'test@example.com', 12345, $1, true) ON CONFLICT (id) DO UPDATE SET nombre = 'Test User', email = 'test@example.com', cedula = 12345, password_hash = $1, activo = true",
            [passwordHash]
        );
    });

    afterAll(async () => {
        // Cerrar la conexión a la base de datos para que Jest pueda salir
        await pool.end();
    });

    it('should login a valid user and return a JWT', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should fail to login with a wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword',
            });
        expect(res.statusCode).toEqual(401);
    });
});