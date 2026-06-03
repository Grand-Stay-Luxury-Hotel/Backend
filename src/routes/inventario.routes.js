// src/routes/inventario.routes.js
import { Router } from 'express';
import {
  getAlertasInventario,
  getHistorialInventario,
  getInsumosInventario,
  patchStockInventario,
  patchUmbralInventario,
  postInsumoInventario,
  postConsumoInventario,
} from '../controllers/inventario.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/consumo', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), postConsumoInventario);
router.get('/insumos', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), getInsumosInventario);
router.post('/insumos', verifyToken, authorizeRoles('Administrador'), postInsumoInventario);
router.get('/historial', verifyToken, authorizeRoles('Administrador', 'PersonalLimpieza'), getHistorialInventario);
router.get('/alertas', verifyToken, authorizeRoles('Administrador'), getAlertasInventario);
router.patch('/:id/umbral', verifyToken, authorizeRoles('Administrador'), patchUmbralInventario);
router.patch('/:id/stock', verifyToken, authorizeRoles('Administrador'), patchStockInventario);

export default router;
