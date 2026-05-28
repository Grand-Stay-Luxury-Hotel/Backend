// src/config/env.js
const PLACEHOLDER_VALUES = new Set([
  'your_password',
  'your_jwt_secret_min_32_chars',
  'clave_minima_32_caracteres',
  'clave_minima_32_caracteres_aqui',
]);

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isPlaceholder(value) {
  return PLACEHOLDER_VALUES.has(String(value ?? '').trim());
}

function requireEnv(name) {
  const value = process.env[name];
  if (isBlank(value) || isPlaceholder(value)) {
    throw new Error(`Variable de entorno obligatoria no configurada: ${name}`);
  }
  return value;
}

export function validarVariablesCriticas() {
  const requeridas = ['JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const faltantes = requeridas.filter((name) => {
    const value = process.env[name];
    return isBlank(value) || isPlaceholder(value);
  });

  if (faltantes.length > 0) {
    throw new Error(`Variables de entorno obligatorias no configuradas: ${faltantes.join(', ')}`);
  }

  if (String(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  return true;
}

export function getJwtSecret() {
  return requireEnv('JWT_SECRET');
}

export function getDatabaseName() {
  if (process.env.NODE_ENV === 'test' && !isBlank(process.env.DB_NAME_TEST)) {
    return process.env.DB_NAME_TEST;
  }
  return process.env.DB_NAME ?? 'grandstay_db';
}

export function getDbSslConfig() {
  const sslMode = String(process.env.DB_SSL_MODE ?? '').trim().toUpperCase();
  if (!['REQUIRED', 'VERIFY_CA', 'VERIFY_IDENTITY'].includes(sslMode)) {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: isBlank(process.env.DB_SSL_CA) ? undefined : process.env.DB_SSL_CA,
  };
}

export function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    database: getDatabaseName(),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    ssl: getDbSslConfig(),
  };
}
