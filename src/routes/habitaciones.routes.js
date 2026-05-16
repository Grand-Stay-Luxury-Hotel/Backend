// src/routes/habitaciones.routes.js
import { Router } from 'express';
import { obtenerDisponibilidad } from '../controllers/disponibilidad.controller.js';
import { patchEstadoHabitacion } from '../controllers/habitaciones.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/disponibilidad', verifyToken, authorizeRoles('Recepcionista', 'Huesped'), obtenerDisponibilidad);
router.patch('/:id/estado', verifyToken, authorizeRoles('PersonalLimpieza', 'Personal de Limpieza', 'Limpieza', 'Recepcionista', 'Administrador'), patchEstadoHabitacion);

export default router;
