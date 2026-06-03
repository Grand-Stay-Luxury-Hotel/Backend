// src/routes/auditoria.routes.js
import { Router } from 'express';
import { getAuditoria, getFiltrosAuditoria } from '../controllers/auditoria.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/filtros', verifyToken, authorizeRoles('Administrador'), getFiltrosAuditoria);
router.get('/', verifyToken, authorizeRoles('Administrador'), getAuditoria);

export default router;
