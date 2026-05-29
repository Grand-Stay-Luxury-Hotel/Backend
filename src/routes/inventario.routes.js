// src/routes/inventario.routes.js
import { Router } from 'express';
import {
  getAlertasInventario,
  getHistorialInventario,
  getInsumosInventario,
  patchUmbralInventario,
  postConsumoInventario,
} from '../controllers/inventario.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/consumo', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), postConsumoInventario);
router.get('/insumos', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), getInsumosInventario);
router.get('/historial', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), getHistorialInventario);
router.get('/alertas', verifyToken, authorizeRoles('Administrador'), getAlertasInventario);
router.patch('/:id/umbral', verifyToken, authorizeRoles('Administrador'), patchUmbralInventario);

export default router;
