// src/tests/integration/frontend-contract.integration.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createApp } from '../../app.js';
import { listarReservasHuesped } from '../../services/reservas.service.js';
import { listarTarifas, crearTarifa, actualizarTarifa, desactivarTarifa } from '../../services/tarifas.service.js';
import { listarServiciosAdicionales } from '../../services/servicios.service.js';
import { listarAuditoria } from '../../services/auditoria.service.js';
import { listarHistorialInventario, listarInsumosInventario } from '../../services/inventario.service.js';
import { obtenerResumenCheckout } from '../../services/checkout.service.js';
import { obtenerFacturasPorReserva } from '../../services/facturas.service.js';

jest.mock('../../services/reservas.service.js', () => ({
  cancelarReserva: jest.fn(),
  crearReserva: jest.fn(),
  listarReservas: jest.fn(),
  listarReservasHuesped: jest.fn(),
}));

jest.mock('../../services/tarifas.service.js', () => ({
  listarTarifas: jest.fn(),
  crearTarifa: jest.fn(),
  actualizarTarifa: jest.fn(),
  desactivarTarifa: jest.fn(),
}));

jest.mock('../../services/servicios.service.js', () => ({
  listarServiciosAdicionales: jest.fn(),
}));

jest.mock('../../services/auditoria.service.js', () => ({
  crearHashAuditoria: jest.fn(),
  listarAuditoria: jest.fn(),
  obtenerPoliticaAuditoria: jest.fn(),
  registrarOperacionCritica: jest.fn(),
  validarRegistroAuditoria: jest.fn(),
}));

jest.mock('../../services/inventario.service.js', () => ({
  actualizarUmbralInventario: jest.fn(),
  listarAlertasInventario: jest.fn(),
  listarHistorialInventario: jest.fn(),
  listarInsumosInventario: jest.fn(),
  registrarConsumoInventario: jest.fn(),
}));

jest.mock('../../services/checkout.service.js', () => ({
  obtenerResumenCheckout: jest.fn(),
  registrarCheckout: jest.fn(),
}));

jest.mock('../../services/facturas.service.js', () => ({
  obtenerFacturasPorReserva: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol, extras = {}) {
  return jwt.sign({ id_usuario: 1, rol, ...extras }, secreto);
}

describe('Contrato frontend-backend', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    jest.clearAllMocks();
  });

  test('GET /reservas/mis-reservas retorna reservas del huesped', () => {
    listarReservasHuesped.mockResolvedValue({ data: [{ id_reserva: 1 }], total: 1 });
    return request(app)
      .get('/reservas/mis-reservas')
      .set('Authorization', `Bearer ${token('Huesped', { id_huesped: 7 })}`)
      .expect(200)
      .expect(() => {
        expect(listarReservasHuesped).toHaveBeenCalledWith(7, expect.any(Object));
      });
  });

  test('CRUD /tarifas responde para administrador', async () => {
    listarTarifas.mockResolvedValue({ data: [{ id_tarifa: 1 }], total: 1 });
    crearTarifa.mockResolvedValue({ id_tarifa: 2 });
    actualizarTarifa.mockResolvedValue({ id_tarifa: 2 });
    desactivarTarifa.mockResolvedValue({ id_tarifa: 2 });
    const auth = `Bearer ${token('Administrador')}`;

    await request(app).get('/tarifas').set('Authorization', auth).expect(200);
    await request(app).post('/tarifas').set('Authorization', auth).send({}).expect(201);
    await request(app).put('/tarifas/2').set('Authorization', auth).send({}).expect(200);
    await request(app).delete('/tarifas/2').set('Authorization', auth).expect(200);
  });

  test('GET /servicios lista servicios adicionales', () => {
    listarServiciosAdicionales.mockResolvedValue({ data: [{ id_servicio: 1 }], total: 1 });
    return request(app)
      .get('/servicios')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200);
  });

  test('GET /auditoria solo administrador', () => {
    listarAuditoria.mockResolvedValue({ data: [], total: 0 });
    return request(app)
      .get('/auditoria')
      .set('Authorization', `Bearer ${token('Administrador')}`)
      .expect(200);
  });

  test('GET /inventario/insumos e /inventario/historial soportan pantalla de inventario', async () => {
    listarInsumosInventario.mockResolvedValue({ data: [], total: 0 });
    listarHistorialInventario.mockResolvedValue({ data: [], total: 0 });
    const auth = `Bearer ${token('Administrador')}`;

    await request(app).get('/inventario/insumos').set('Authorization', auth).expect(200);
    await request(app).get('/inventario/historial').set('Authorization', auth).expect(200);
  });

  test('GET /checkout/:reservaId/resumen retorna preliquidacion', () => {
    obtenerResumenCheckout.mockResolvedValue({ id_reserva: 42, resumen_factura: { total: 1000 } });
    return request(app)
      .get('/checkout/42/resumen')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200);
  });

  test('GET /facturas/reserva/:reservaId retorna facturas', () => {
    obtenerFacturasPorReserva.mockResolvedValue({ data: [], total: 0 });
    return request(app)
      .get('/facturas/reserva/42')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200);
  });
});
