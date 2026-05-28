import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createApp } from '../../app.js';
import { cambiarEstadoHabitacion } from '../../services/habitaciones.service.js';
import { buscarHuespedes } from '../../services/huespedes.service.js';
import { registrarConsumo } from '../../services/consumos.service.js';
import { login } from '../../services/auth.service.js';
import { actualizarUmbralInventario, listarAlertasInventario, registrarConsumoInventario } from '../../services/inventario.service.js';
import { obtenerReporteIngresos, obtenerReporteOcupacion } from '../../services/reportes.service.js';
import { EntidadNoProcesableError } from '../../utils/errors.js';

jest.mock('../../services/habitaciones.service.js', () => ({
  cambiarEstadoHabitacion: jest.fn(),
  listarHabitaciones: jest.fn(),
}));

jest.mock('../../services/huespedes.service.js', () => ({
  buscarHuespedes: jest.fn(),
}));

jest.mock('../../services/consumos.service.js', () => ({
  registrarConsumo: jest.fn(),
}));

jest.mock('../../services/auth.service.js', () => ({
  login: jest.fn(),
}));

jest.mock('../../services/inventario.service.js', () => ({
  registrarConsumoInventario: jest.fn(),
  listarAlertasInventario: jest.fn(),
  actualizarUmbralInventario: jest.fn(),
}));

jest.mock('../../services/reportes.service.js', () => ({
  obtenerReporteOcupacion: jest.fn(),
  obtenerReporteIngresos: jest.fn(),
}));

const app = createApp();
const secreto = 'secreto_pruebas_12345678901234567890';

function token(rol) {
  return jwt.sign({ id_usuario: 1, rol, id_recepcionista: 1 }, secreto);
}

describe('Integracion HU-B07 a HU-B12', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secreto;
    jest.clearAllMocks();
  });

  test('PATCH /habitaciones/:id/estado actualiza estado con rol valido', () => {
    cambiarEstadoHabitacion.mockResolvedValue({ id_habitacion: 1, estado_nuevo: 'limpieza' });
    return request(app)
      .patch('/habitaciones/1/estado')
      .set('Authorization', `Bearer ${token('Personal de Limpieza')}`)
      .send({ estado: 'limpieza' })
      .expect(200)
      .expect((res) => expect(res.body.estado_nuevo).toBe('limpieza'));
  });

  test('GET /huespedes permite buscar huespedes para selectores del frontend', () => {
    buscarHuespedes.mockResolvedValue({
      data: [{ id_huesped: 1, nombre_completo: 'Sofia Torres', email: 'huesped1@grandstay.com' }],
      total: 1,
    });

    return request(app)
      .get('/huespedes?buscar=Sofia')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].nombre_completo).toBe('Sofia Torres');
      });
  });

  test('POST /consumos retorna 422 si la habitacion no esta ocupada', () => {
    registrarConsumo.mockRejectedValue(new EntidadNoProcesableError('Solo se pueden registrar consumos en habitaciones ocupadas'));
    return request(app)
      .post('/consumos')
      .set('Authorization', `Bearer ${token('Recepcionista')}`)
      .send({ habitacionId: 1 })
      .expect(422);
  });

  test('POST /auth/login retorna token', () => {
    login.mockResolvedValue({ token: 'jwt', expira_en: '8h', usuario: { rol: 'Recepcionista' } });
    return request(app)
      .post('/auth/login')
      .send({ usuario: 'recepcion', password: 'secreto' })
      .expect(200)
      .expect((res) => expect(res.body.token).toBe('jwt'));
  });

  test('POST /inventario/consumo descuenta stock', () => {
    registrarConsumoInventario.mockResolvedValue({ id_insumo: 1, stock_actual: 4, alerta: { criticidad: 'critica' } });
    return request(app)
      .post('/inventario/consumo')
      .set('Authorization', `Bearer ${token('Limpieza')}`)
      .send({ insumoId: 1, cantidad: 2, habitacionId: 101 })
      .expect(201);
  });

  test('GET /inventario/alertas solo administrador', () => {
    listarAlertasInventario.mockResolvedValue({ data: [], total: 0 });
    return request(app)
      .get('/inventario/alertas')
      .set('Authorization', `Bearer ${token('Administrador')}`)
      .expect(200);
  });

  test('PATCH /inventario/:id/umbral actualiza umbral', () => {
    actualizarUmbralInventario.mockResolvedValue({ id_insumo: 1, stock_minimo: 10 });
    return request(app)
      .patch('/inventario/1/umbral')
      .set('Authorization', `Bearer ${token('Administrador')}`)
      .send({ umbral: 10 })
      .expect(200);
  });

  test('GET /reportes/ocupacion retorna reporte mensual', () => {
    obtenerReporteOcupacion.mockResolvedValue({ periodo: { mes: 5, anio: 2026 }, data: [] });
    return request(app)
      .get('/reportes/ocupacion?mes=5&anio=2026')
      .set('Authorization', `Bearer ${token('Administrador')}`)
      .expect(200);
  });

  test('GET /reportes/ingresos retorna ingresos agregados', () => {
    obtenerReporteIngresos.mockResolvedValue({ data: { habitaciones: [], servicios_adicionales: [] } });
    return request(app)
      .get('/reportes/ingresos')
      .set('Authorization', `Bearer ${token('Administrador')}`)
      .expect(200);
  });
});
