// src/routes/checkout.routes.js
import { Router } from 'express';
import { postCheckout } from '../controllers/checkout.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/:reservaId', verifyToken, authorizeRoles('Recepcionista'), postCheckout);

export default router;
