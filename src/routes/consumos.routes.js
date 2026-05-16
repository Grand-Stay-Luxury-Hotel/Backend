// src/routes/consumos.routes.js
import { Router } from 'express';
import { postConsumo } from '../controllers/consumos.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, authorizeRoles('Recepcionista'), postConsumo);

export default router;
