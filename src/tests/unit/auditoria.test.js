import { crearHashAuditoria, obtenerPoliticaAuditoria, validarRegistroAuditoria } from '../../services/auditoria.service.js';
import { logAudit } from '../../middleware/audit.middleware.js';

describe('HU-B10 auditoria.service', () => {
  test('crea hash sha256 estable para el registro', () => {
    const hash = crearHashAuditoria({ accion: 'UPDATE', tablaAfectada: 'reservas' });
    expect(hash).toHaveLength(64);
  });

  test('valida campos obligatorios de auditoria', () => {
    expect(validarRegistroAuditoria({ accion: 'INSERT', tablaAfectada: 'reservas' })).toBe(true);
  });

  test('rechaza registros incompletos', () => {
    let errorLanzado;
    try {
      validarRegistroAuditoria({ accion: 'INSERT' });
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(400);
  });

  test('rechaza acciones y tablas de auditoria no permitidas', () => {
    expect(() => validarRegistroAuditoria({ accion: 'EXPORT', tablaAfectada: 'reservas' }))
      .toThrow('accion de auditoria no valida');
    expect(() => validarRegistroAuditoria({ accion: 'INSERT', tablaAfectada: 'tarjetas_credito' }))
      .toThrow('tablaAfectada de auditoria no valida');
  });

  test('declara politica de auditoria solo insercion con repositorio de integridad', () => {
    expect(obtenerPoliticaAuditoria()).toMatchObject({
      modo: 'solo_insercion',
      operaciones_bloqueadas: ['UPDATE', 'DELETE'],
      repositorio_integridad: 'log_auditoria_hash_chain',
      algoritmo_hash: 'SHA-256',
    });
  });

  test('logAudit incluye timestamp, hash e integridad en datos_nuevos', async () => {
    const conn = { execute: jest.fn().mockResolvedValue([{ insertId: 1 }]) };
    const resultado = await logAudit({
      conn,
      userId: 1,
      accion: 'INSERT',
      tablaAfectada: 'reservas',
      idRegistro: 10,
      valorNuevo: { accion_negocio: 'RESERVA_CREADA', token: 'secreto' },
    });

    const params = conn.execute.mock.calls[0][1];
    const datosNuevos = JSON.parse(params.valorNuevo);
    expect(resultado.hash_integridad).toHaveLength(64);
    expect(datosNuevos.hash_integridad).toHaveLength(64);
    expect(datosNuevos.timestamp_auditoria).toBeTruthy();
    expect(datosNuevos.repositorio_integridad.modo).toBe('solo_insercion');
    expect(datosNuevos.token).toBe('[REDACTADO]');
  });
});
