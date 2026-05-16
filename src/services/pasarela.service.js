// src/services/pasarela.service.js
import { PagoRechazadoError, ParametrosInvalidosError } from '../utils/errors.js';

export async function autorizarPago({ tokenPago, monto }) {
  try {
    if (!tokenPago) {
      throw new ParametrosInvalidosError('El token de pago es obligatorio');
    }

    if (tokenPago.includes('rechazado') || tokenPago.includes('fail')) {
      throw new PagoRechazadoError('La pasarela rechazó el pago de la reserva');
    }

    return {
      aprobado: true,
      referencia: `PAY-${Date.now()}`,
      monto,
      proveedor: 'pasarela_mock',
    };
  } catch (error) {
    throw error;
  }
}

export async function reembolsarPago({ tokenPago, monto }) {
  try {
    if (!tokenPago) {
      throw new ParametrosInvalidosError('No existe token de pago para procesar el reembolso');
    }

    return {
      aprobado: true,
      referencia: `REF-${Date.now()}`,
      monto,
      proveedor: 'pasarela_mock',
    };
  } catch (error) {
    throw error;
  }
}

export async function cobrarSaldo({ tokenPago, monto }) {
  try {
    if (monto <= 0) {
      return { aprobado: true, referencia: null, monto: 0, proveedor: 'pasarela_mock' };
    }

    if (!tokenPago || tokenPago.includes('rechazado') || tokenPago.includes('fail')) {
      throw new PagoRechazadoError('La pasarela rechazó el cobro del saldo pendiente');
    }

    return {
      aprobado: true,
      referencia: `CHG-${Date.now()}`,
      monto,
      proveedor: 'pasarela_mock',
    };
  } catch (error) {
    throw error;
  }
}
