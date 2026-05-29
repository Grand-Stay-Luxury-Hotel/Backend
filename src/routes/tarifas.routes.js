// src/routes/tarifas.routes.js
import { Router } from 'express';
import { deleteTarifa, getTarifas, postTarifa, putTarifa } from '../controllers/tarifas.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, authorizeRoles('Administrador', 'Recepcionista'), getTarifas);
router.post('/', verifyToken, authorizeRoles('Administrador'), postTarifa);
router.put('/:id', verifyToken, authorizeRoles('Administrador'), putTarifa);
router.delete('/:id', verifyToken, authorizeRoles('Administrador'), deleteTarifa);

export default router;
