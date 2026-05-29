// src/routes/consumos.routes.js
import { Router } from 'express';
import { getConsumosPorReserva, getMisConsumos, postConsumo } from '../controllers/consumos.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/mis-consumos', verifyToken, authorizeRoles('Huesped'), getMisConsumos);
router.get('/:reservaId', verifyToken, authorizeRoles('Recepcionista', 'Administrador'), getConsumosPorReserva);
router.post('/', verifyToken, authorizeRoles('Recepcionista'), postConsumo);

export default router;
