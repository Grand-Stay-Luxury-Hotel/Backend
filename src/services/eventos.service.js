// src/services/eventos.service.js
import { EventEmitter } from 'events';

export const eventosGrandStay = new EventEmitter();

export async function emitirCodigoAcceso(payload) {
  try {
    eventosGrandStay.emit('codigo_acceso.generado', payload);
    return true;
  } catch (error) {
    throw error;
  }
}

export async function emitirFacturaGenerada(payload) {
  try {
    eventosGrandStay.emit('factura.generada', payload);
    return true;
  } catch (error) {
    throw error;
  }
}
