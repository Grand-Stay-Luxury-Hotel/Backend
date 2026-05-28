// src/routes/huespedes.routes.js
import { Router } from 'express';
import { getHuespedes } from '../controllers/huespedes.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, authorizeRoles('Recepcionista', 'Administrador'), getHuespedes);

export default router;
