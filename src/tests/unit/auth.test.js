import bcrypt from 'bcryptjs';
import {
  generarTotp,
  validarHashBcrypt,
  validarOtpAdministrador,
  validarTotp,
  verificarPassword,
} from '../../services/auth.service.js';

describe('HU-B09 auth.service', () => {
  const envOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  test('acepta hashes bcrypt con coste mayor o igual a 12', () => {
    expect(validarHashBcrypt('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
  });

  test('rechaza hashes bcrypt con coste bajo', () => {
    expect(validarHashBcrypt('$2b$10$abcdefghijklmnopqrstuv')).toBe(false);
  });

  test('rechaza hashes legacy si no estan habilitados explicitamente', () => {
    delete process.env.ALLOW_LEGACY_PASSWORD_HASHES;
    expect(verificarPassword('secreto', 'plain:secreto')).toBe(false);
    expect(verificarPassword('secreto', 'sha256:df733656293a19c54f69093ba916f0a1a2a3c151fc95c13f3a794c2631eeb3a6')).toBe(false);
  });

  test('permite hashes legacy solo con flag de compatibilidad', () => {
    process.env.ALLOW_LEGACY_PASSWORD_HASHES = 'true';
    expect(verificarPassword('secreto', 'plain:secreto')).toBe(true);
    expect(verificarPassword('secreto', 'sha256:df733656293a19c54f69093ba916f0a1a2a3c151fc95c13f3a794c2631eeb3a6')).toBe(true);
    expect(verificarPassword('PasswordLegacy!', 'fe4718f53faa985da8f59e032024bb460b5cafb1a4f8fbb849d61d638a34b828')).toBe(true);
    expect(verificarPassword('secreto', 'legacy-no-soportado')).toBe(false);
  });

  test('verifica password con bcrypt real coste 12', () => {
    const hash = bcrypt.hashSync('secreto', 12);
    expect(verificarPassword('secreto', hash)).toBe(true);
    expect(verificarPassword('otro', hash)).toBe(false);
  });

  test('rechaza password vacio o hash ausente', () => {
    expect(verificarPassword('', bcrypt.hashSync('secreto', 12))).toBe(false);
    expect(verificarPassword('secreto', undefined)).toBe(false);
  });

  test('exige OTP para administrador', () => {
    process.env.ADMIN_OTP = '123456';
    let errorLanzado;
    try {
      validarOtpAdministrador({ rol: 'Administrador' }, undefined);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(403);
  });

  test('acepta OTP estatico configurado y omite OTP en otros roles', () => {
    process.env.ADMIN_OTP = '123456';
    expect(validarOtpAdministrador({ rol: 'Administrador' }, '123456')).toBe(true);
    expect(validarOtpAdministrador({ rol: 'Recepcionista' }, undefined)).toBe(true);
  });

  test('acepta TOTP valido para administrador', () => {
    process.env.ADMIN_OTP_SECRET = 'JBSWY3DPEHPK3PXP';
    const fecha = new Date('2026-05-23T12:00:00Z');
    const otp = generarTotp(process.env.ADMIN_OTP_SECRET, fecha);
    jest.useFakeTimers().setSystemTime(fecha);
    expect(validarOtpAdministrador({ rol: 'Administrador' }, otp)).toBe(true);
    jest.useRealTimers();
  });

  test('rechaza TOTP faltante o invalido', () => {
    expect(validarTotp('', '123456')).toBe(false);
    expect(validarTotp('JBSWY3DPEHPK3PXP', '')).toBe(false);
    expect(validarTotp('JBSWY3DPEHPK3PXP', '000000', new Date('2026-05-23T12:00:00Z'))).toBe(false);
  });

  test('genera TOTP con secreto no base32 usando bytes crudos', () => {
    expect(generarTotp('raw-secret', new Date('2026-05-23T12:00:00Z'))).toHaveLength(6);
  });
});
