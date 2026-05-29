// src/routes/habitaciones.routes.js
import { Router } from 'express';
import { obtenerDisponibilidad } from '../controllers/disponibilidad.controller.js';
import { getHabitaciones, patchEstadoHabitacion } from '../controllers/habitaciones.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/disponibilidad', verifyToken, authorizeRoles('Recepcionista', 'Huesped'), obtenerDisponibilidad);
router.get('/', verifyToken, authorizeRoles('Recepcionista', 'Administrador', 'PersonalLimpieza', 'ServicioTecnico'), getHabitaciones);
router.patch('/:id/estado', verifyToken, authorizeRoles('PersonalLimpieza', 'Recepcionista', 'Administrador', 'ServicioTecnico'), patchEstadoHabitacion);

export default router;
