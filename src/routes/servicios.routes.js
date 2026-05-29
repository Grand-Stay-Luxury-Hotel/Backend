// src/routes/servicios.routes.js
import { Router } from 'express';
import { getServiciosAdicionales } from '../controllers/servicios.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, authorizeRoles('Recepcionista', 'Administrador', 'Huesped'), getServiciosAdicionales);

export default router;
