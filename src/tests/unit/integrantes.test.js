import {
  generarCodigoRegistro,
  listarIntegrantes,
  obtenerCodigoRotativo,
  registrarIntegrante,
  validarIntegrante,
} from '../../services/integrantes.service.js';
import { query } from '../../utils/db.js';

const FECHA_FIJA = new Date('2026-06-13T15:00:00.000Z');
jest.setTimeout(30000);

describe('integrantes.service', () => {
  beforeEach(async () => {
    await query('DELETE FROM integrantes_codigos_registro');
    await query(`
      DELETE FROM integrantes_equipo
      WHERE seudonimo_normalizado NOT IN ('akczul', 'alexsters', 'jdav117', 'pan')
    `);
  });

  test('lista integrantes sin exponer identificadores', async () => {
    const resultado = await listarIntegrantes();

    expect(resultado.total).toBe(4);
    expect(resultado.data[0]).toHaveProperty('id');
    expect(resultado.data[0]).toHaveProperty('seudonimo');
    expect(resultado.data[0]).toHaveProperty('grupo');
    expect(JSON.stringify(resultado)).not.toContain('Juan');
    expect(JSON.stringify(resultado)).not.toContain('David');
    expect(JSON.stringify(resultado)).not.toContain('Fabian');
    expect(JSON.stringify(resultado)).not.toContain('Yamith');
  });

  test('divide integrantes por grupo backend y frontend', async () => {
    const resultado = await listarIntegrantes();
    const backend = resultado.data.filter((item) => item.grupo === 'backend').map((item) => item.id);
    const frontend = resultado.data.filter((item) => item.grupo === 'frontend').map((item) => item.id);

    expect(backend).toEqual(['Akczul', 'Alexsters']);
    expect(frontend).toEqual(['JDav117', 'Pan']);
  });

  test('valida correctamente el codigo rotativo de JDav117', async () => {
    const codigo = await obtenerCodigoRotativo('JDav117', FECHA_FIJA);
    const resultado = await validarIntegrante({
      seudonimo: 'JDav117',
      identificador: codigo,
      fechaActual: FECHA_FIJA,
    });

    expect(resultado).toMatchObject({
      valido: true,
      codigo: 'INTEGRANTE_VALIDADO',
      integrante: {
        id: 'JDav117',
        seudonimo: 'JDav117',
        nombreCompleto: 'Jhoan David Ortega Ramos',
        grupo: 'frontend',
      },
    });
  });

  test('valida correctamente usando nombre completo real', async () => {
    const codigo = await obtenerCodigoRotativo('JDav117', FECHA_FIJA);
    const resultado = await validarIntegrante({
      nombreCompleto: 'Jhoan David Ortega Ramos',
      identificador: codigo,
      fechaActual: FECHA_FIJA,
    });

    expect(resultado).toMatchObject({
      valido: true,
      integrante: {
        id: 'JDav117',
        seudonimo: 'JDav117',
        nombreCompleto: 'Jhoan David Ortega Ramos',
        grupo: 'frontend',
      },
    });
  });

  test('registra un integrante nuevo y permite validarlo', async () => {
    const invitacion = await generarCodigoRegistro({ generadoPor: null }, FECHA_FIJA);
    const registro = await registrarIntegrante({
      seudonimo: 'NuevoDevUnit',
      nombreCompleto: 'Nuevo Integrante Unit',
      grupo: 'backend',
      codigoRegistro: invitacion.codigoRegistro,
      fechaActual: FECHA_FIJA,
    });
    const codigo = await obtenerCodigoRotativo('NuevoDevUnit', FECHA_FIJA);
    const validacion = await validarIntegrante({
      seudonimo: 'NuevoDevUnit',
      identificador: codigo,
      fechaActual: FECHA_FIJA,
    });

    expect(registro).toMatchObject({
      codigo: 'INTEGRANTE_REGISTRADO',
      codigoIngreso: expect.stringMatching(/^\d{3}$/),
      integrante: {
        id: 'NuevoDevUnit',
        seudonimo: 'NuevoDevUnit',
        nombreCompleto: 'Nuevo Integrante Unit',
        grupo: 'backend',
      },
    });
    expect(validacion.valido).toBe(true);
  });

  test('rechaza registro sin codigo generado por administrador', async () => {
    await expect(registrarIntegrante({
      seudonimo: 'NuevoSinCodigo',
      nombreCompleto: 'Nuevo Sin Codigo',
      grupo: 'frontend',
    })).rejects.toThrow('codigo de registro');
  });

  test('rechaza registro duplicado', async () => {
    const invitacion = await generarCodigoRegistro({ generadoPor: null }, FECHA_FIJA);
    await expect(registrarIntegrante({
      seudonimo: 'JDav117',
      nombreCompleto: 'Otro Integrante',
      grupo: 'frontend',
      codigoRegistro: invitacion.codigoRegistro,
      fechaActual: FECHA_FIJA,
    })).rejects.toThrow('ya esta registrado');
  });

  test('rechaza identificador incorrecto sin revelar el esperado', async () => {
    const resultado = await validarIntegrante({
      seudonimo: 'JDav117',
      identificador: '999',
      fechaActual: FECHA_FIJA,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.integrante).toBeUndefined();
    expect(JSON.stringify(resultado)).not.toContain(await obtenerCodigoRotativo('JDav117', FECHA_FIJA));
  });

  test('rechaza entradas con formato inseguro', async () => {
    await expect(validarIntegrante({
      seudonimo: 'JDav117<script>',
      identificador: await obtenerCodigoRotativo('JDav117', FECHA_FIJA),
      fechaActual: FECHA_FIJA,
    })).rejects.toThrow('caracteres no permitidos');

    await expect(validarIntegrante({
      seudonimo: 'JDav117',
      identificador: '33A',
      fechaActual: FECHA_FIJA,
    })).rejects.toThrow('exactamente 3 digitos');

    await expect(registrarIntegrante({
      seudonimo: 'Nuevo<script>',
      nombreCompleto: 'Nuevo Integrante',
      grupo: 'backend',
      codigoRegistro: 'INV12345',
    })).rejects.toThrow('caracteres no permitidos');

    await expect(registrarIntegrante({
      seudonimo: 'NuevoDevBadGroup',
      nombreCompleto: 'Nuevo Integrante',
      grupo: 'mobile',
      codigoRegistro: 'INV12346',
    })).rejects.toThrow('backend o frontend');
  });
});
