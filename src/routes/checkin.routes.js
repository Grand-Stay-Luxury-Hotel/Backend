// src/routes/checkin.routes.js
import { Router } from 'express';
import { postCheckin } from '../controllers/checkin.controller.js';
import { authorizeRoles, verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/:reservaId', verifyToken, authorizeRoles('Recepcionista'), postCheckin);

export default router;
