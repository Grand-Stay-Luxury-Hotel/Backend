import bcrypt from 'bcryptjs';
import { validarHashBcrypt, validarOtpAdministrador, verificarPassword } from '../../services/auth.service.js';

describe('HU-B09 auth.service', () => {
  test('acepta hashes bcrypt con coste mayor o igual a 12', () => {
    expect(validarHashBcrypt('$2b$12$abcdefghijklmnopqrstuv')).toBe(true);
  });

  test('rechaza hashes bcrypt con coste bajo', () => {
    expect(validarHashBcrypt('$2b$10$abcdefghijklmnopqrstuv')).toBe(false);
  });

  test('verifica password con comparacion segura para hash de pruebas', () => {
    expect(verificarPassword('secreto', 'plain:secreto')).toBe(true);
  });

  test('verifica password con hash sha256', () => {
    expect(verificarPassword('secreto', 'sha256:df733656293a19c54f69093ba916f0a1a2a3c151fc95c13f3a794c2631eeb3a6')).toBe(true);
  });

  test('verifica password con hash sha256 sin prefijo usado por los datos semilla', () => {
    expect(verificarPassword('Admin2024!', '5a55c7873ed7338f35d782adb513d336a36086ddec0fa4b6444fda6d440387c2')).toBe(true);
  });

  test('verifica password con bcrypt real', () => {
    const hash = bcrypt.hashSync('secreto', 12);
    expect(verificarPassword('secreto', hash)).toBe(true);
    expect(verificarPassword('otro', hash)).toBe(false);
  });

  test('rechaza password vacio o hash ausente', () => {
    expect(verificarPassword('', 'plain:secreto')).toBe(false);
    expect(verificarPassword('secreto', undefined)).toBe(false);
  });

  test('exige OTP para administrador', () => {
    let errorLanzado;
    try {
      validarOtpAdministrador({ rol: 'Administrador', otp_actual: '123456' }, undefined);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado.statusCode).toBe(403);
  });

  test('acepta OTP correcto para administrador y omite OTP en otros roles', () => {
    expect(validarOtpAdministrador({ rol: 'Administrador', otp_actual: '123456' }, '123456')).toBe(true);
    expect(validarOtpAdministrador({ rol: 'Recepcionista' }, undefined)).toBe(true);
  });
});
