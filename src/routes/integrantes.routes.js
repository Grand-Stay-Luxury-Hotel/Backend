import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCodigosRegistro,
  getCodigoIntegranteDev,
  getIntegrantes,
  postCodigoRegistro,
  postRegistrarIntegrante,
  postValidarIntegrante,
} from '../controllers/integrantes.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

const validarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: true,
    codigo: 'DEMASIADAS_SOLICITUDES',
    mensaje: 'Demasiados intentos de validacion. Intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', getIntegrantes);
router.get('/codigos', verifyToken, authorizeRoles('Administrador'), getCodigosRegistro);
router.post('/codigos', verifyToken, authorizeRoles('Administrador'), postCodigoRegistro);
router.get('/:integrante/codigo', getCodigoIntegranteDev);
router.post('/', validarLimiter, postRegistrarIntegrante);
router.post('/validar', validarLimiter, postValidarIntegrante);

export default router;
