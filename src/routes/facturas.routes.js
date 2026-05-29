// src/routes/facturas.routes.js
import { Router } from 'express';
import { getFacturasReserva } from '../controllers/facturas.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/reserva/:reservaId', verifyToken, authorizeRoles('Recepcionista', 'Administrador', 'Huesped'), getFacturasReserva);

export default router;
