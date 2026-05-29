// src/routes/checkout.routes.js
import { Router } from 'express';
import { getResumenCheckout, postCheckout } from '../controllers/checkout.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:reservaId/resumen', verifyToken, authorizeRoles('Recepcionista'), getResumenCheckout);
router.post('/:reservaId', verifyToken, authorizeRoles('Recepcionista'), postCheckout);

export default router;
