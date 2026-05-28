// src/routes/reservas.routes.js
import { Router } from 'express';
import { deleteReserva, getReservas, postReserva } from '../controllers/reservas.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, authorizeRoles('Recepcionista', 'Administrador'), getReservas);
router.post('/', verifyToken, authorizeRoles('Recepcionista', 'Huesped'), postReserva);
router.delete('/:id', verifyToken, authorizeRoles('Recepcionista', 'Administrador'), deleteReserva);

export default router;
