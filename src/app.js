// src/app.js
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes.js';
import huespedesRoutes from './routes/huespedes.routes.js';
import habitacionesRoutes from './routes/habitaciones.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import consumosRoutes from './routes/consumos.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import tarifasRoutes from './routes/tarifas.routes.js';
import serviciosRoutes from './routes/servicios.routes.js';
import facturasRoutes from './routes/facturas.routes.js';
import auditoriaRoutes from './routes/auditoria.routes.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorResponse } from './utils/errors.js';
import { query } from './utils/db.js';

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

  app.get('/health/db', async (_req, res, next) => {
    try {
      const [resultado] = await query('SELECT DATABASE() AS base_datos, @@version AS version_mysql');
      const host = String(process.env.DB_HOST ?? '').trim().toLowerCase();
      const origen = ['localhost', '127.0.0.1', 'mysql'].includes(host) ? 'local' : 'externa';

      res.status(200).json({
        estado: 'ok',
        base_datos: resultado?.base_datos ?? null,
        motor: 'mysql',
        version_mysql: resultado?.version_mysql ?? null,
        conexion: origen === 'local' ? 'local' : 'aiven_o_remota',
        ssl: process.env.DB_SSL_MODE ?? 'DISABLED',
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/auth', authRoutes);
  app.use('/huespedes', huespedesRoutes);
  app.use('/habitaciones', habitacionesRoutes);
  app.use('/reservas', reservasRoutes);
  app.use('/checkin', checkinRoutes);
  app.use('/checkout', checkoutRoutes);
  app.use('/consumos', consumosRoutes);
  app.use('/inventario', inventarioRoutes);
  app.use('/reportes', reportesRoutes);
  app.use('/tarifas', tarifasRoutes);
  app.use('/servicios', serviciosRoutes);
  app.use('/facturas', facturasRoutes);
  app.use('/auditoria', auditoriaRoutes);

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
