// src/routes/reportes.routes.js
import { Router } from 'express';
import { getReporteIngresos, getReporteOcupacion } from '../controllers/reportes.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/ocupacion', verifyToken, authorizeRoles('Administrador'), getReporteOcupacion);
router.get('/ingresos', verifyToken, authorizeRoles('Administrador'), getReporteIngresos);

export default router;
