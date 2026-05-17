// src/routes/auth.routes.js
import { Router } from 'express';
import { postLogin, postRegistro } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', postLogin);
router.post('/registro', postRegistro);

export default router;
