// src/app.js
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes.js';
import habitacionesRoutes from './routes/habitaciones.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import consumosRoutes from './routes/consumos.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorResponse } from './utils/errors.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.get('/api-docs.json', (_req, res) => {
    res.status(200).json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  }));
  app.use(cors());
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', async (_req, res, next) => {
    try {
      res.status(200).json({ estado: 'ok', mensaje: 'Backend Grand-Stay activo' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/auth', authRoutes);
  app.use('/habitaciones', habitacionesRoutes);
  app.use('/reservas', reservasRoutes);
  app.use('/checkin', checkinRoutes);
  app.use('/checkout', checkoutRoutes);
  app.use('/consumos', consumosRoutes);
  app.use('/inventario', inventarioRoutes);
  app.use('/reportes', reportesRoutes);

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
