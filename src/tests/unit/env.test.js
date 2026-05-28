// src/tests/unit/env.test.js
import {
  getDbSslConfig,
  getJwtSecret,
  validarVariablesCriticas,
} from '../../config/env.js';

describe('configuracion de entorno', () => {
  const envOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  test('rechaza inicio sin variables criticas', () => {
    process.env = { NODE_ENV: 'production' };
    expect(() => validarVariablesCriticas()).toThrow('Variables de entorno obligatorias');
  });

  test('rechaza JWT_SECRET corto', () => {
    process.env.JWT_SECRET = 'corto';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    process.env.DB_NAME = 'grandstay_db';
    process.env.DB_USER = 'grandstay_user';
    process.env.DB_PASSWORD = 'segura';

    expect(() => validarVariablesCriticas()).toThrow('JWT_SECRET debe tener al menos 32 caracteres');
  });

  test('acepta variables completas', () => {
    process.env.JWT_SECRET = 'secreto_seguro_de_pruebas_123456789';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    process.env.DB_NAME = 'grandstay_db';
    process.env.DB_USER = 'grandstay_user';
    process.env.DB_PASSWORD = 'segura';

    expect(validarVariablesCriticas()).toBe(true);
    expect(getJwtSecret()).toBe(process.env.JWT_SECRET);
  });

  test('habilita SSL para Aiven cuando DB_SSL_MODE es REQUIRED', () => {
    process.env.DB_SSL_MODE = 'REQUIRED';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';

    expect(getDbSslConfig()).toEqual({ rejectUnauthorized: true, ca: undefined });
  });
});
