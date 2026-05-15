// src/routes/disponibilidad.routes.js
import { Router } from 'express';
import { obtenerDisponibilidad } from '../controllers/disponibilidad.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/disponibilidad', verifyToken, authorizeRoles('Recepcionista', 'Huesped'), obtenerDisponibilidad);

export default router;
