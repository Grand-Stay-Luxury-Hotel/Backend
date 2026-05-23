// src/routes/auth.routes.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { postLogin, postRegistro } from '../controllers/auth.controller.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: true, codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', limiter, postLogin);
router.post('/registro', limiter, postRegistro);

export default router;
