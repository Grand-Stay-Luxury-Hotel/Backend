import { crearHashAuditoria, validarRegistroAuditoria } from '../../services/auditoria.service.js';

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
});
