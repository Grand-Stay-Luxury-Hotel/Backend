import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { obtenerCodigoRotativo } from '../../services/integrantes.service.js';
import { pool, query } from '../../utils/db.js';

const secreto = 'secreto_seguro_de_pruebas_123456789';
const app = createApp();
jest.setTimeout(30000);

describe('Integracion integrantes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = secreto;
  });

  beforeEach(async () => {
    await query('DELETE FROM integrantes_codigos_registro');
    await query(`
      DELETE FROM integrantes_equipo
      WHERE seudonimo_normalizado NOT IN ('akczul', 'alexsters', 'jdav117', 'pan')
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  function tokenAdmin() {
    return jwt.sign({
      id_usuario: 1,
      email: 'admin@test.local',
      rol: 'Administrador',
      id_admin: 1,
    }, secreto);
  }

  test('GET /api/integrantes lista integrantes sin identificadores', () => request(app)
    .get('/api/integrantes')
    .expect(200)
    .expect((res) => {
      expect(res.body.total).toBe(4);
      expect(res.body.data[0]).toHaveProperty('seudonimo');
      expect(res.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'Akczul', grupo: 'backend' }),
        expect.objectContaining({ id: 'Alexsters', grupo: 'backend' }),
        expect.objectContaining({ id: 'JDav117', grupo: 'frontend' }),
        expect.objectContaining({ id: 'Pan', grupo: 'frontend' }),
      ]));
      expect(JSON.stringify(res.body)).not.toContain('Juan');
      expect(JSON.stringify(res.body)).not.toContain('David');
    }));

  test('POST /api/integrantes/validar valida codigo rotativo correcto', async () => {
    const codigo = await obtenerCodigoRotativo('JDav117');
    return request(app)
      .post('/api/integrantes/validar')
      .send({ seudonimo: 'JDav117', identificador: codigo })
      .expect(200)
      .expect((res) => {
        expect(res.body.valido).toBe(true);
        expect(res.body.integrante.id).toBe('JDav117');
        expect(res.body.integrante.seudonimo).toBe('JDav117');
        expect(res.body.integrante.nombreCompleto).toBe('Jhoan David Ortega Ramos');
        expect(res.body.integrante.grupo).toBe('frontend');
      });
  });

  test('POST /api/integrantes/validar acepta nombre completo real', async () => {
    const codigo = await obtenerCodigoRotativo('JDav117');
    return request(app)
      .post('/api/integrantes/validar')
      .send({ nombreCompleto: 'Jhoan David Ortega Ramos', identificador: codigo })
      .expect(200)
      .expect((res) => {
        expect(res.body.valido).toBe(true);
        expect(res.body.integrante).toMatchObject({
          id: 'JDav117',
          seudonimo: 'JDav117',
          nombreCompleto: 'Jhoan David Ortega Ramos',
          grupo: 'frontend',
        });
      });
  });

  test('POST /api/integrantes/codigos genera codigo solo para administrador', () => request(app)
    .post('/api/integrantes/codigos')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .expect(201)
    .expect((res) => {
      expect(res.body.codigo).toBe('CODIGO_REGISTRO_GENERADO');
      expect(res.body.codigoRegistro).toMatch(/^[A-Z0-9]{8,16}$/);
    }));

  test('POST /api/integrantes registra integrante nuevo con codigo generado', async () => {
    const invitacion = await request(app)
      .post('/api/integrantes/codigos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .expect(201);

    return request(app)
      .post('/api/integrantes')
      .send({
        seudonimo: 'NuevoDevApi',
        nombreCompleto: 'Nuevo Integrante Api',
        grupo: 'frontend',
        codigoRegistro: invitacion.body.codigoRegistro,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          codigo: 'INTEGRANTE_REGISTRADO',
          codigoIngreso: expect.stringMatching(/^\d{3}$/),
          integrante: {
            id: 'NuevoDevApi',
            seudonimo: 'NuevoDevApi',
            nombreCompleto: 'Nuevo Integrante Api',
            grupo: 'frontend',
          },
        });
      });
  });

  test('POST /api/integrantes rechaza duplicados', async () => {
    const invitacion = await request(app)
      .post('/api/integrantes/codigos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .expect(201);

    return request(app)
      .post('/api/integrantes')
      .send({
        seudonimo: 'JDav117',
        nombreCompleto: 'Otro Integrante',
        grupo: 'frontend',
        codigoRegistro: invitacion.body.codigoRegistro,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.codigo).toBe('PARAMETROS_INVALIDOS');
      });
  });

  test('GET /api/integrantes/:integrante/codigo expone codigo solo en desarrollo', () => request(app)
    .get('/api/integrantes/JDav117/codigo')
    .expect(200)
    .expect((res) => {
      expect(res.body).toMatchObject({
        id: 'JDav117',
        seudonimo: 'JDav117',
        nombreCompleto: 'Jhoan David Ortega Ramos',
        grupo: 'frontend',
      });
      expect(res.body.identificador).toMatch(/^\d{3}$/);
      expect(res.body.expira_en_segundos).toBeGreaterThanOrEqual(0);
    }));

  test('GET /api/integrantes/:integrante/codigo no existe en produccion', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await request(app)
      .get('/api/integrantes/JDav117/codigo')
      .expect(404)
      .expect((res) => {
        expect(res.body.codigo).toBe('RUTA_NO_ENCONTRADA');
      });

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/integrantes/validar rechaza identificador incorrecto', () => request(app)
    .post('/api/integrantes/validar')
    .send({ seudonimo: 'JDav117', identificador: '999' })
    .expect(200)
    .expect((res) => {
      expect(res.body.valido).toBe(false);
      expect(res.body.integrante).toBeUndefined();
    }));

  test('POST /api/integrantes/validar rechaza payload inseguro', () => request(app)
    .post('/api/integrantes/validar')
    .send({ seudonimo: 'JDav117<script>', identificador: '123' })
    .expect(400)
    .expect((res) => {
      expect(res.body.codigo).toBe('PARAMETROS_INVALIDOS');
    }));
});
