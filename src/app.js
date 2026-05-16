// src/app.js
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import disponibilidadRoutes from './routes/disponibilidad.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import { errorResponse } from './utils/errors.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', async (_req, res, next) => {
    try {
      res.status(200).json({ estado: 'ok', mensaje: 'Backend Grand-Stay activo' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/habitaciones', disponibilidadRoutes);
  app.use('/reservas', reservasRoutes);
  app.use('/checkin', checkinRoutes);
  app.use('/checkout', checkoutRoutes);

  app.use(async (_req, res, next) => {
    try {
      res.status(404).json({
        error: true,
        codigo: 'RUTA_NO_ENCONTRADA',
        mensaje: 'La ruta solicitada no existe',
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const { statusCode, respuesta } = errorResponse(error);
    res.status(statusCode).json(respuesta);
  });

  return app;
}
