const request = require('supertest');
const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ... (imports de rutas no cambian)
const authRoutes = require('../routes/auth');
const dashboardRoutes =require('../routes/dashboard');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- MOCK MEJORADO Y CORRECTO ---
const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
};
jest.mock('../config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(() => mockClient), // connect siempre devuelve el mismo objeto mockeado
    end: jest.fn(),
}));
// ------------------------------

describe('Dashboard Endpoints - /api/dashboard', () => {
    let adminToken;
    let stateUserToken;

    const STATE_ID_PERMITIDO = 1;

    beforeAll(async () => {
        const passwordHash = await bcrypt.hash('password123', 10);
        const adminUser = { id: 1, password_hash: passwordHash, activo: true };
        const stateUser = { id: 2, password_hash: passwordHash, activo: true };

        // Simulación Login Admin
        pool.query.mockResolvedValueOnce({ rows: [adminUser] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 101 }] });
        const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
        adminToken = adminRes.body.token;

        // Simulación Login Usuario de Estado
        pool.query.mockResolvedValueOnce({ rows: [stateUser] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 102 }] });
        const stateUserRes = await request(app).post('/api/auth/login').send({ email: 'state@test.com', password: 'password123' });
        stateUserToken = stateUserRes.body.token;
    });

    beforeEach(() => {
        // Limpiamos AMBOS mocks antes de cada test
        pool.query.mockClear();
        mockClient.query.mockClear(); // Limpiamos el mock del cliente
    });

    afterAll(() => {
        pool.end();
    });

    describe('GET /api/dashboard/by-state', () => {
        it('should return data for a national admin', async () => {
            // 1. Simular la comprobación de permisos (hecha con client.query)
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
            
            // 2. Simular los datos del dashboard (hecha con pool.query)
            const fakeData = [{ estado_id: 1, estado: 'ESTADO 1' }];
            pool.query.mockResolvedValueOnce({ rows: fakeData });

            const res = await request(app)
                .get('/api/dashboard/by-state')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(fakeData);
        });

        it('should return data for ONLY the permitted state for a state user', async () => {
            // Cadena de mocks para la comprobación de permisos (TODAS hechas con client.query)
            mockClient.query
                .mockResolvedValueOnce({ rowCount: 0 }) // No tiene permiso nacional
                .mockResolvedValueOnce({ rows: [{ estado_id: STATE_ID_PERMITIDO }], rowCount: 1 }) // Sí tiene permiso de estado
                .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // No tiene permisos de municipio

            const fakeData = [{ estado_id: STATE_ID_PERMITIDO, estado: 'ESTADO PERMITIDO' }];
            pool.query.mockResolvedValueOnce({ rows: fakeData }); // Simula datos del dashboard (hecha con pool.query)

            const res = await request(app)
                .get('/api/dashboard/by-state')
                .set('Authorization', `Bearer ${stateUserToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(fakeData);
        });
    });
});