// src/routes/inventario.routes.js
import { Router } from 'express';
import { getAlertasInventario, patchUmbralInventario, postConsumoInventario } from '../controllers/inventario.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/consumo', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza', 'Personal de Limpieza', 'Limpieza'), postConsumoInventario);
router.get('/alertas', verifyToken, authorizeRoles('Administrador'), getAlertasInventario);
router.patch('/:id/umbral', verifyToken, authorizeRoles('Administrador'), patchUmbralInventario);

export default router;
